package com.curio.auth.recs.dto;

import java.util.List;

/** A catalog item plus its personalised match score (55–99) and human-readable reasons. */
public record RecommendedItemDto(
        String id,
        String type,
        String title,
        String creator,
        String cover,
        Integer year,
        String meta,
        String description,
        List<String> tags,
        int score,
        List<String> reasons
) {}
