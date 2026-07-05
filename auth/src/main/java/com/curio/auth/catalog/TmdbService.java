package com.curio.auth.catalog;

import com.curio.auth.catalog.dto.CatalogItemDto;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Server-side TMDB integration. Fetching here (instead of in the browser)
 * keeps the API key out of the public JS bundle and gives every user the
 * same film candidate pool for recommendations.
 */
@Service
public class TmdbService {

    private static final Logger log = LoggerFactory.getLogger(TmdbService.class);

    // TMDB genre id -> Curio theme tag (mirrors the original client mapping).
    private static final Map<Integer, String> GENRE_TAGS = Map.ofEntries(
            Map.entry(18, "memory"), Map.entry(10749, "longing"), Map.entry(36, "time"),
            Map.entry(99, "place"), Map.entry(12, "maps"), Map.entry(14, "wonder"),
            Map.entry(878, "wonder"), Map.entry(16, "wonder"), Map.entry(9648, "stillness"),
            Map.entry(35, "light"), Map.entry(80, "place"), Map.entry(27, "solitude"),
            Map.entry(10752, "time"), Map.entry(37, "place"), Map.entry(10402, "longing"),
            Map.entry(53, "patience"), Map.entry(28, "light"), Map.entry(10751, "memory"));

    private static final String[] PAD_TAGS =
            {"memory", "place", "longing", "light", "time", "wonder", "stillness", "craft"};

    private static final String IMG = "https://image.tmdb.org/t/p/w500";

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final CatalogRepository repository;
    private final RestClient restClient;
    private final String apiKey;

    public TmdbService(CatalogRepository repository,
                       @Value("${app.tmdb.api-key:}") String apiKey) {
        this.repository = repository;
        this.apiKey = apiKey;
        this.restClient = RestClient.builder().baseUrl("https://api.themoviedb.org/3").build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void refreshOnStartup() {
        refreshFilms();
    }

    // Every 12 hours while the instance is awake.
    @Scheduled(initialDelayString = "PT12H", fixedDelayString = "PT12H")
    public void refreshFilms() {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("TMDB api key not configured; keeping bundled fallback films");
            return;
        }
        try {
            List<CatalogItem> films = new ArrayList<>();
            for (int page = 1; page <= 3; page++) {
                String body = restClient.get()
                        .uri("/discover/movie?api_key={key}&sort_by=popularity.desc&vote_count.gte=300&page={page}&language=en-US",
                                apiKey, page)
                        .retrieve()
                        .body(String.class);
                JsonNode results = MAPPER.readTree(body).path("results");
                for (JsonNode m : results) {
                    if (m.path("poster_path").isTextual()) films.add(normalize(m));
                }
            }
            if (!films.isEmpty()) {
                repository.saveAll(films);
                log.info("Refreshed {} TMDB films into the catalog", films.size());
            }
        } catch (Exception e) {
            log.warn("TMDB refresh failed (bundled films remain available): {}", e.getMessage());
        }
    }

    private CatalogItem normalize(JsonNode m) {
        List<String> tags = new ArrayList<>();
        for (JsonNode g : m.path("genre_ids")) {
            String tag = GENRE_TAGS.get(g.asInt());
            if (tag != null && !tags.contains(tag)) tags.add(tag);
        }
        // Guarantee three stable tags so every film can join the taste graph.
        String title = m.path("title").asText(m.path("original_title").asText("Untitled"));
        int i = hashInt(title.isEmpty() ? m.path("id").asText() : title);
        while (tags.size() < 3) {
            String t = PAD_TAGS[Math.floorMod(i, PAD_TAGS.length)];
            if (!tags.contains(t)) tags.add(t);
            i++;
        }
        String year = m.path("release_date").asText("");
        year = year.length() >= 4 ? year.substring(0, 4) : "";

        String overview = m.path("overview").asText("");
        CatalogItemDto dto = new CatalogItemDto(
                "film-tmdb-" + m.path("id").asText(),
                "film",
                title,
                "",
                IMG + m.path("poster_path").asText(),
                year.isEmpty() ? null : Integer.parseInt(year),
                "Film" + (year.isEmpty() ? "" : " · " + year),
                overview.length() > 180 ? overview.substring(0, 180) : overview,
                tags.subList(0, 3));
        CatalogItem entity = CatalogSeeder.toEntity(dto);
        entity.setUpdatedAt(Instant.now());
        return entity;
    }

    static int hashInt(String s) {
        int h = 0;
        for (int i = 0; i < s.length(); i++) h = h * 31 + s.charAt(i);
        return h == Integer.MIN_VALUE ? 0 : Math.abs(h);
    }
}
