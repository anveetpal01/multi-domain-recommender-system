package com.curio.auth.catalog;

import com.curio.auth.catalog.dto.CatalogItemDto;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CatalogService {

    private final CatalogRepository repository;

    public CatalogService(CatalogRepository repository) {
        this.repository = repository;
    }

    public List<CatalogItemDto> list() {
        return repository.findAll().stream().map(CatalogService::toDto).collect(Collectors.toList());
    }

    public static CatalogItemDto toDto(CatalogItem i) {
        return new CatalogItemDto(
                i.getId(), i.getType(), i.getTitle(), i.getCreator(), i.getCover(),
                i.getYear(), i.getMeta(), i.getDescription(), splitTags(i.getTags()));
    }

    public static List<String> splitTags(String joined) {
        if (joined == null || joined.isBlank()) return List.of();
        return Arrays.stream(joined.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public static String joinTags(List<String> tags) {
        return tags == null ? "" : String.join(",", tags);
    }
}
