package com.curio.auth.catalog;

import com.curio.auth.catalog.dto.CatalogItemDto;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Seeds the catalog from the JSON files bundled in resources/catalog on first
 * boot. Each domain seeds only when it has no rows yet, so TMDB-refreshed
 * films and any future edits are never clobbered.
 */
@Component
public class CatalogSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogSeeder.class);

    private static final Map<String, String> SEED_FILES = Map.of(
            "book", "catalog/books.json",
            "song", "catalog/songs.json",
            "essay", "catalog/essays.json",
            "film", "catalog/films.json");

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final CatalogRepository repository;

    public CatalogSeeder(CatalogRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        SEED_FILES.forEach(this::seedDomain);
    }

    private void seedDomain(String type, String resourcePath) {
        try {
            if (repository.countByType(type) > 0) return;
            try (InputStream in = new ClassPathResource(resourcePath).getInputStream()) {
                List<CatalogItemDto> items =
                        MAPPER.readValue(in, new TypeReference<List<CatalogItemDto>>() {});
                List<CatalogItem> entities = items.stream().map(CatalogSeeder::toEntity).toList();
                repository.saveAll(entities);
                log.info("Seeded {} catalog items for domain '{}'", entities.size(), type);
            }
        } catch (Exception e) {
            log.warn("Failed to seed catalog domain '{}': {}", type, e.getMessage());
        }
    }

    static CatalogItem toEntity(CatalogItemDto dto) {
        CatalogItem item = new CatalogItem();
        item.setId(dto.id());
        item.setType(dto.type());
        item.setTitle(truncate(dto.title(), 500));
        item.setCreator(truncate(dto.creator(), 255));
        item.setCover(truncate(dto.cover(), 1000));
        item.setYear(dto.year());
        item.setMeta(truncate(dto.meta(), 255));
        item.setDescription(truncate(dto.description(), 2000));
        item.setTags(CatalogService.joinTags(dto.tags()));
        item.setUpdatedAt(Instant.now());
        return item;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
