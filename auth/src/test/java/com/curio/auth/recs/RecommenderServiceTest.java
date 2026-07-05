package com.curio.auth.recs;

import com.curio.auth.catalog.dto.CatalogItemDto;
import com.curio.auth.library.SavedItem;
import com.curio.auth.recs.RecommenderService.Model;
import com.curio.auth.recs.RecommenderService.Scored;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecommenderServiceTest {

    // ------------------------------------------------------------ helpers

    private static SavedItem save(String user, String itemId, String tags, Instant at) {
        SavedItem s = new SavedItem();
        s.setUserEmail(user);
        s.setItemId(itemId);
        s.setType("book");
        s.setTitle("Title of " + itemId);
        s.setTags(tags);
        s.setCreatedAt(at);
        return s;
    }

    private static CatalogItemDto item(String id, String type, List<String> tags) {
        return new CatalogItemDto(id, type, "Title of " + id, "", null, 2020, type, "", tags);
    }

    // ------------------------------------------------------------- model

    @Test
    void coOccurrenceIsSymmetricAndPopularityCounts() {
        Instant now = Instant.now();
        Model m = RecommenderService.buildModel(List.of(
                save("u1", "a", "", now), save("u1", "b", "", now),
                save("u2", "a", "", now), save("u2", "b", "", now), save("u2", "c", "", now)));

        assertEquals(2, m.cooc.get("a").get("b"));
        assertEquals(2, m.cooc.get("b").get("a"));
        assertEquals(1, m.cooc.get("a").get("c"));
        assertEquals(2, m.popularity.get("a"));
        assertEquals(1, m.popularity.get("c"));
        assertEquals(2, m.maxPopularity);
    }

    // ------------------------------------------------------------- taste

    @Test
    void tasteWeighsRecentSavesHigherAndFallsBackToDefault() {
        Instant now = Instant.now();
        Map<String, Double> taste = RecommenderService.buildTaste(List.of(
                save("u", "old", "memory", now.minus(400, ChronoUnit.DAYS)),
                save("u", "new", "light", now)));
        assertTrue(taste.get("light") > taste.get("memory"),
                "a fresh save must outweigh a year-old one");

        Map<String, Double> cold = RecommenderService.buildTaste(List.of());
        assertEquals(RecommenderService.DEFAULT_TASTE, cold, "cold start uses the editorial prior");
    }

    @Test
    void contentScoreOrdersByTagAffinity() {
        Map<String, Double> taste = Map.of("memory", 3.0, "light", 1.0);
        double full = RecommenderService.contentScore(List.of("memory", "light"), taste);
        double partial = RecommenderService.contentScore(List.of("memory", "maps"), taste);
        double none = RecommenderService.contentScore(List.of("maps", "craft"), taste);
        assertTrue(full > partial && partial > none);
        assertEquals(0, RecommenderService.contentScore(List.of(), taste));
    }

    // ----------------------------------------------------------- scoring

    @Test
    void savedItemsAreExcludedAndTypeFilterApplies() {
        List<CatalogItemDto> catalog = List.of(
                item("a", "book", List.of("memory")),
                item("b", "film", List.of("memory")),
                item("c", "book", List.of("light")));
        Model m = RecommenderService.buildModel(List.of());
        List<Scored> scored = RecommenderService.scoreCandidates(
                catalog, Set.of("a"), Map.of(), Map.of("memory", 2.0), m, "book");

        assertEquals(1, scored.size());
        assertEquals("c", scored.get(0).item.id());
    }

    @Test
    void collaborativeSignalAttributesTheSourceItem() {
        Instant now = Instant.now();
        // Both users kept "seed"; u2 also kept "gem" -> "gem" should co-occur with u1's "seed".
        Model m = RecommenderService.buildModel(List.of(
                save("u1", "seed", "", now),
                save("u2", "seed", "", now), save("u2", "gem", "", now)));
        List<CatalogItemDto> catalog = List.of(item("gem", "book", List.of("maps")));

        List<Scored> scored = RecommenderService.scoreCandidates(
                catalog, Set.of("seed"), Map.of("seed", "The Seed"), Map.of("memory", 1.0), m, null);

        assertEquals(1, scored.size());
        assertTrue(scored.get(0).collab > 0, "co-saved item must get a collaborative score");
        assertEquals("The Seed", scored.get(0).because);
    }

    @Test
    void diversityRankAvoidsNearDuplicates() {
        Model m = RecommenderService.buildModel(List.of());
        Map<String, Double> taste = Map.of("memory", 2.0, "light", 2.0);
        List<CatalogItemDto> catalog = List.of(
                item("m1", "book", List.of("memory")),
                item("m2", "book", List.of("memory")),
                item("l1", "book", List.of("light")));
        List<Scored> ranked = RecommenderService.diversityRank(
                RecommenderService.scoreCandidates(catalog, Set.of(), Map.of(), taste, m, null), 2);

        Set<String> tags = ranked.stream()
                .flatMap(s -> s.item.tags().stream())
                .collect(Collectors.toSet());
        assertEquals(2, ranked.size());
        assertEquals(Set.of("memory", "light"), tags,
                "second pick should cover a new theme, not repeat the first");
    }

    @Test
    void displayScoreStaysWithinUiBounds() {
        assertEquals(55, RecommenderService.displayScore(-1));
        assertEquals(99, RecommenderService.displayScore(2));
        assertTrue(RecommenderService.displayScore(0.5) > 55
                && RecommenderService.displayScore(0.5) < 99);
    }

    // ------------------------------------------- offline evaluation (LOO)

    /**
     * Leave-one-out evaluation on a synthetic world of three taste clusters:
     * hold out each user's last save and check it comes back in the top 10.
     * Guards against regressions that silently break ranking quality.
     */
    @Test
    void leaveOneOutHitRateAtTenIsHigh() {
        List<List<String>> clusters = List.of(
                List.of("memory", "stillness", "place"),
                List.of("light", "craft", "wonder"),
                List.of("the sea", "maps", "time"));
        String[] types = {"film", "song", "book", "essay"};

        List<CatalogItemDto> catalog = new ArrayList<>();
        for (int c = 0; c < clusters.size(); c++) {
            for (int i = 0; i < 12; i++) {
                catalog.add(item("c" + c + "-i" + i, types[i % types.length], clusters.get(c)));
            }
        }

        Instant now = Instant.now();
        List<SavedItem> allSaves = new ArrayList<>();
        Map<String, List<String>> userItems = new HashMap<>();
        for (int c = 0; c < clusters.size(); c++) {
            String tagString = String.join(",", clusters.get(c));
            for (int u = 0; u < 3; u++) {
                String user = "user-c" + c + "-" + u;
                List<String> ids = new ArrayList<>();
                for (int k = 0; k < 6; k++) {
                    String id = "c" + c + "-i" + ((u + k) % 12);
                    ids.add(id);
                    allSaves.add(save(user, id, tagString, now));
                }
                userItems.put(user, ids);
            }
        }

        int hits = 0;
        for (Map.Entry<String, List<String>> e : userItems.entrySet()) {
            String heldOut = e.getValue().get(e.getValue().size() - 1);
            List<SavedItem> trainSaves = allSaves.stream()
                    .filter(s -> !(s.getUserEmail().equals(e.getKey()) && s.getItemId().equals(heldOut)))
                    .toList();
            List<SavedItem> userTrain = trainSaves.stream()
                    .filter(s -> s.getUserEmail().equals(e.getKey()))
                    .toList();

            Model m = RecommenderService.buildModel(trainSaves);
            Set<String> savedIds = userTrain.stream().map(SavedItem::getItemId).collect(Collectors.toSet());
            List<Scored> ranked = RecommenderService.diversityRank(
                    RecommenderService.scoreCandidates(catalog, savedIds, Map.of(),
                            RecommenderService.buildTaste(userTrain), m, null),
                    10);
            boolean hit = ranked.stream().anyMatch(s -> s.item.id().equals(heldOut));
            if (hit) hits++;
        }

        double hitRate = hits / (double) userItems.size();
        assertTrue(hitRate >= 0.66, "hit-rate@10 was " + hitRate);
    }

    // ----------------------------------------------------------- sanity

    @Test
    void coldStartStillProducesAFullFeed() {
        Model m = RecommenderService.buildModel(List.of());
        List<CatalogItemDto> catalog = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            catalog.add(item("x" + i, i % 2 == 0 ? "book" : "film",
                    List.of(i % 3 == 0 ? "memory" : "place")));
        }
        List<Scored> ranked = RecommenderService.diversityRank(
                RecommenderService.scoreCandidates(catalog, Set.of(), Map.of(),
                        RecommenderService.buildTaste(List.of()), m, null),
                8);
        assertEquals(8, ranked.size());
        ranked.forEach(s -> assertNotNull(s.item));
        assertFalse(ranked.stream().anyMatch(s -> s.raw < 0));
    }
}
