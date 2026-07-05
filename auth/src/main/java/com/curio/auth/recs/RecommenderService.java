package com.curio.auth.recs;

import com.curio.auth.catalog.CatalogService;
import com.curio.auth.catalog.dto.CatalogItemDto;
import com.curio.auth.library.SavedItem;
import com.curio.auth.library.SavedItemRepository;
import com.curio.auth.recs.dto.HomeFeedDto;
import com.curio.auth.recs.dto.RecommendedItemDto;
import com.curio.auth.recs.dto.ThreadDto;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Hybrid recommender, structured the way production systems are:
 *
 * 1. CANDIDATE GENERATION — the whole catalog minus items the user already
 *    saved (at this scale no ANN index is needed; the pool is small).
 * 2. SCORING — a weighted blend of three signals:
 *      • content-based:  overlap between an item's theme tags and the user's
 *        taste vector (tag weights built from their saved items, with a
 *        recency half-life so new interests outrank old ones);
 *      • collaborative:  item–item co-occurrence across all users' libraries
 *        ("people who kept X also kept Y"), cosine-normalised so popular
 *        items don't dominate;
 *      • popularity prior: log-scaled save count, which doubles as the
 *        cold-start fallback when the other two signals are silent.
 * 3. RANKING — greedy diversity re-rank (MMR-style): each next pick is
 *    penalised by its tag overlap with items already picked, so a single
 *    theme can't monopolise a row.
 *
 * The interaction model (co-occurrence + popularity) is precomputed and
 * cached in memory with a TTL, mirroring the offline-model / online-serving
 * split of real systems. Every recommendation carries human-readable
 * reasons — recommendations users can't interrogate erode trust.
 */
@Service
public class RecommenderService {

    private static final double W_CONTENT = 0.55;
    private static final double W_COLLAB = 0.30;
    private static final double W_POP = 0.15;
    private static final double DIVERSITY_PENALTY = 0.12;
    private static final Duration MODEL_TTL = Duration.ofMinutes(10);
    private static final double RECENCY_HALF_LIFE_DAYS = 90.0;
    private static final int MAX_ITEMS_PER_USER_IN_MODEL = 300;

    /** Editorial prior for brand-new users, mirrored from the original client-side recommender. */
    static final Map<String, Double> DEFAULT_TASTE = Map.of(
            "memory", 3.0, "place", 3.0, "longing", 2.0,
            "stillness", 2.0, "light", 2.0, "wonder", 1.0);

    private final CatalogService catalogService;
    private final SavedItemRepository savedItemRepository;

    private volatile Model cachedModel;

    public RecommenderService(CatalogService catalogService, SavedItemRepository savedItemRepository) {
        this.catalogService = catalogService;
        this.savedItemRepository = savedItemRepository;
    }

    // ---------------------------------------------------------------- API

    public HomeFeedDto homeFeed(String email) {
        Context ctx = contextFor(email);

        List<Scored> pool = scoreCandidates(ctx.catalog, ctx.savedIds, ctx.savedTitles, ctx.taste, ctx.model, null);
        List<Scored> heroRank = diversityRank(pool, 1);
        RecommendedItemDto pick = heroRank.isEmpty() ? null : toDto(heroRank.get(0), ctx);

        List<ThreadDto> threads = buildThreads(pool, ctx, 2, 4);

        Map<String, List<RecommendedItemDto>> rows = new LinkedHashMap<>();
        for (String type : List.of("film", "song", "book", "essay")) {
            List<Scored> typed = pool.stream().filter(s -> type.equals(s.item.type())).toList();
            rows.put(type, diversityRank(typed, 8).stream().map(s -> toDto(s, ctx)).toList());
        }
        return new HomeFeedDto(pick, threads, rows);
    }

    public List<RecommendedItemDto> recommend(String email, String type, int limit) {
        Context ctx = contextFor(email);
        List<Scored> pool = scoreCandidates(ctx.catalog, ctx.savedIds, ctx.savedTitles, ctx.taste, ctx.model, type);
        return diversityRank(pool, limit).stream().map(s -> toDto(s, ctx)).toList();
    }

    public List<RecommendedItemDto> similar(String email, String itemId, int limit) {
        Context ctx = contextFor(email);
        CatalogItemDto anchor = ctx.catalog.stream()
                .filter(i -> i.id().equals(itemId))
                .findFirst()
                .orElse(null);
        List<String> anchorTags = anchor != null ? anchor.tags()
                : ctx.savedTags.getOrDefault(itemId, List.of());

        List<Scored> pool = new ArrayList<>();
        for (CatalogItemDto item : ctx.catalog) {
            if (item.id().equals(itemId) || ctx.savedIds.contains(item.id())) continue;
            double content = jaccard(anchorTags, item.tags());
            double collab = coocCosine(itemId, item.id(), ctx.model);
            double pop = popScore(item.id(), ctx.model);
            double raw = 0.60 * content + 0.35 * collab + 0.05 * pop;
            if (raw <= 0) continue;
            pool.add(new Scored(item, raw, content, collab, null));
        }
        return diversityRank(pool, limit).stream().map(s -> toDto(s, ctx)).toList();
    }

    // ------------------------------------------------------------ scoring

    private Context contextFor(String email) {
        List<CatalogItemDto> catalog = catalogService.list();
        List<SavedItem> saved = savedItemRepository.findByUserEmailOrderByCreatedAtAsc(email);
        Model model = model();

        Set<String> savedIds = new HashSet<>();
        Map<String, String> savedTitles = new HashMap<>();
        Map<String, List<String>> savedTags = new HashMap<>();
        for (SavedItem s : saved) {
            savedIds.add(s.getItemId());
            savedTitles.put(s.getItemId(), s.getTitle());
            savedTags.put(s.getItemId(), CatalogService.splitTags(s.getTags()));
        }
        return new Context(catalog, saved, savedIds, savedTitles, savedTags, buildTaste(saved), model);
    }

    static List<Scored> scoreCandidates(List<CatalogItemDto> catalog,
                                        Set<String> savedIds,
                                        Map<String, String> savedTitles,
                                        Map<String, Double> taste,
                                        Model model,
                                        String typeFilter) {
        List<Scored> out = new ArrayList<>();
        for (CatalogItemDto item : catalog) {
            if (savedIds.contains(item.id())) continue;
            if (typeFilter != null && !typeFilter.equals(item.type())) continue;

            double content = contentScore(item.tags(), taste);
            double collab = 0;
            String because = null;
            Map<String, Integer> row = model.cooc.get(item.id());
            if (row != null) {
                for (String savedId : savedIds) {
                    Integer c = row.get(savedId);
                    if (c == null) continue;
                    double sim = c / Math.sqrt((double) pop(item.id(), model) * pop(savedId, model));
                    if (sim > collab) {
                        collab = Math.min(1.0, sim);
                        because = savedTitles.get(savedId);
                    }
                }
            }
            double pop = popScore(item.id(), model);
            double raw = W_CONTENT * content + W_COLLAB * collab + W_POP * pop;
            out.add(new Scored(item, raw, content, collab, because));
        }
        return out;
    }

    /** Taste vector: tag weights from saved items, decayed by a 90-day half-life. */
    static Map<String, Double> buildTaste(List<SavedItem> saved) {
        Map<String, Double> taste = new HashMap<>();
        Instant now = Instant.now();
        for (SavedItem s : saved) {
            double weight = 1.0;
            if (s.getCreatedAt() != null) {
                double ageDays = Math.max(0, Duration.between(s.getCreatedAt(), now).toHours() / 24.0);
                weight = Math.max(0.35, Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS));
            }
            for (String tag : CatalogService.splitTags(s.getTags())) {
                taste.merge(tag, weight, Double::sum);
            }
        }
        return taste.isEmpty() ? new HashMap<>(DEFAULT_TASTE) : taste;
    }

    /** 0..1 — how much of the item's tag set the taste covers, and how strongly. */
    static double contentScore(List<String> tags, Map<String, Double> taste) {
        if (tags == null || tags.isEmpty()) return 0;
        double maxW = taste.values().stream().mapToDouble(Double::doubleValue).max().orElse(1.0);
        if (maxW <= 0) maxW = 1.0;
        int overlap = 0;
        double weighted = 0;
        for (String t : tags) {
            Double w = taste.get(t);
            if (w != null) {
                overlap++;
                weighted += w / maxW;
            }
        }
        double coverage = (double) overlap / tags.size();
        double intensity = weighted / tags.size();
        return 0.65 * coverage + 0.35 * intensity;
    }

    static double jaccard(List<String> a, List<String> b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty()) return 0;
        Set<String> inter = new HashSet<>(a);
        inter.retainAll(new HashSet<>(b));
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return (double) inter.size() / union.size();
    }

    private static double coocCosine(String a, String b, Model m) {
        Map<String, Integer> row = m.cooc.get(a);
        if (row == null) return 0;
        Integer c = row.get(b);
        if (c == null) return 0;
        return Math.min(1.0, c / Math.sqrt((double) pop(a, m) * pop(b, m)));
    }

    private static int pop(String id, Model m) {
        return Math.max(1, m.popularity.getOrDefault(id, 0));
    }

    private static double popScore(String id, Model m) {
        if (m.maxPopularity <= 0) return 0;
        return Math.log1p(m.popularity.getOrDefault(id, 0)) / Math.log1p(m.maxPopularity);
    }

    // ------------------------------------------------------------ ranking

    /** Greedy MMR-style re-rank: relevance minus a penalty for tag overlap with already-picked items. */
    static List<Scored> diversityRank(List<Scored> pool, int k) {
        List<Scored> candidates = new ArrayList<>(pool);
        candidates.sort(Comparator.comparingDouble((Scored s) -> s.raw).reversed());
        if (candidates.size() > k * 4) candidates = new ArrayList<>(candidates.subList(0, k * 4));

        List<Scored> picked = new ArrayList<>();
        while (picked.size() < k && !candidates.isEmpty()) {
            Scored best = null;
            double bestScore = Double.NEGATIVE_INFINITY;
            for (Scored c : candidates) {
                double penalty = 0;
                for (Scored p : picked) {
                    penalty = Math.max(penalty, jaccard(c.item.tags(), p.item.tags()));
                }
                double adjusted = c.raw - DIVERSITY_PENALTY * penalty;
                if (adjusted > bestScore) {
                    bestScore = adjusted;
                    best = c;
                }
            }
            picked.add(best);
            candidates.remove(best);
        }
        return picked;
    }

    private List<ThreadDto> buildThreads(List<Scored> pool, Context ctx, int threadCount, int perThread) {
        List<String> topTags = ctx.taste.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(threadCount + 3L)
                .map(Map.Entry::getKey)
                .toList();

        List<ThreadDto> threads = new ArrayList<>();
        Set<String> used = new HashSet<>();
        for (String tag : topTags) {
            if (threads.size() >= threadCount) break;
            List<Scored> tagged = pool.stream()
                    .filter(s -> s.item.tags() != null && s.item.tags().contains(tag))
                    .filter(s -> !used.contains(s.item.id()))
                    .toList();
            List<Scored> ranked = diversityRank(tagged, perThread);
            Set<String> domains = new HashSet<>();
            ranked.forEach(s -> domains.add(s.item.type()));
            if (ranked.size() >= perThread && domains.size() >= 2) {
                ranked.forEach(s -> used.add(s.item.id()));
                threads.add(new ThreadDto(tag, ranked.stream().map(s -> toDto(s, ctx)).toList()));
            }
        }
        return threads;
    }

    // ---------------------------------------------------------- responses

    private RecommendedItemDto toDto(Scored s, Context ctx) {
        CatalogItemDto i = s.item;
        return new RecommendedItemDto(
                i.id(), i.type(), i.title(), i.creator(), i.cover(), i.year(), i.meta(),
                i.description(), i.tags(), displayScore(s.raw), reasons(s, ctx));
    }

    /** Map 0..1 relevance onto the 55–99 "match %" scale the UI already speaks. */
    static int displayScore(double raw) {
        int score = (int) Math.round(55 + 44 * Math.max(0, Math.min(1, raw)));
        return Math.max(55, Math.min(99, score));
    }

    private static List<String> reasons(Scored s, Context ctx) {
        List<String> out = new ArrayList<>(2);
        List<String> matched = new ArrayList<>();
        if (s.item.tags() != null) {
            s.item.tags().stream()
                    .filter(ctx.taste::containsKey)
                    .sorted(Comparator.comparingDouble(t -> -ctx.taste.get(t)))
                    .limit(2)
                    .forEach(matched::add);
        }
        if (!matched.isEmpty()) {
            out.add("Threads of " + String.join(" and ", matched) + " run through your library.");
        }
        if (s.because != null) {
            out.add("Readers who kept ‘" + s.because + "’ also kept this.");
        } else if (out.isEmpty()) {
            out.add("A wider current in the library right now.");
        }
        return out;
    }

    // ------------------------------------------------- interaction model

    private Model model() {
        Model m = cachedModel;
        if (m == null || m.builtAt.isBefore(Instant.now().minus(MODEL_TTL))) {
            synchronized (this) {
                m = cachedModel;
                if (m == null || m.builtAt.isBefore(Instant.now().minus(MODEL_TTL))) {
                    m = buildModel(savedItemRepository.findAll());
                    cachedModel = m;
                }
            }
        }
        return m;
    }

    /** Item–item co-occurrence and popularity from every user's library. */
    static Model buildModel(List<SavedItem> allSaves) {
        Map<String, Set<String>> byUser = new HashMap<>();
        for (SavedItem s : allSaves) {
            byUser.computeIfAbsent(s.getUserEmail(), k -> new LinkedHashSet<>()).add(s.getItemId());
        }
        Map<String, Integer> popularity = new HashMap<>();
        Map<String, Map<String, Integer>> cooc = new HashMap<>();
        for (Set<String> items : byUser.values()) {
            List<String> list = new ArrayList<>(items);
            if (list.size() > MAX_ITEMS_PER_USER_IN_MODEL) {
                list = list.subList(list.size() - MAX_ITEMS_PER_USER_IN_MODEL, list.size());
            }
            for (String id : list) popularity.merge(id, 1, Integer::sum);
            for (int i = 0; i < list.size(); i++) {
                for (int j = i + 1; j < list.size(); j++) {
                    String a = list.get(i), b = list.get(j);
                    cooc.computeIfAbsent(a, k -> new HashMap<>()).merge(b, 1, Integer::sum);
                    cooc.computeIfAbsent(b, k -> new HashMap<>()).merge(a, 1, Integer::sum);
                }
            }
        }
        int maxPop = popularity.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        return new Model(cooc, popularity, maxPop, Instant.now());
    }

    // ------------------------------------------------------------- types

    static final class Scored {
        final CatalogItemDto item;
        final double raw;
        final double content;
        final double collab;
        final String because;

        Scored(CatalogItemDto item, double raw, double content, double collab, String because) {
            this.item = item;
            this.raw = raw;
            this.content = content;
            this.collab = collab;
            this.because = because;
        }
    }

    static final class Model {
        final Map<String, Map<String, Integer>> cooc;
        final Map<String, Integer> popularity;
        final int maxPopularity;
        final Instant builtAt;

        Model(Map<String, Map<String, Integer>> cooc, Map<String, Integer> popularity,
              int maxPopularity, Instant builtAt) {
            this.cooc = cooc;
            this.popularity = popularity;
            this.maxPopularity = maxPopularity;
            this.builtAt = builtAt;
        }
    }

    private record Context(
            List<CatalogItemDto> catalog,
            List<SavedItem> saved,
            Set<String> savedIds,
            Map<String, String> savedTitles,
            Map<String, List<String>> savedTags,
            Map<String, Double> taste,
            Model model) {}
}
