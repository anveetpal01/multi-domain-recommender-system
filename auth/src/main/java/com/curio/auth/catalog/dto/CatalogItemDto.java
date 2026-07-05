package com.curio.auth.catalog.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Shared item shape for the catalog API and the bundled seed JSON files. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogItemDto(
        String id,
        String type,
        String title,
        String creator,
        String cover,
        Integer year,
        String meta,
        String description,
        List<String> tags
) {}
