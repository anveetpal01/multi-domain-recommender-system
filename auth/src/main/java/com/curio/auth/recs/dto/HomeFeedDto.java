package com.curio.auth.recs.dto;

import java.util.List;
import java.util.Map;

/** Everything the home screen needs in one round trip. */
public record HomeFeedDto(
        RecommendedItemDto pick,
        List<ThreadDto> threads,
        Map<String, List<RecommendedItemDto>> rows
) {}
