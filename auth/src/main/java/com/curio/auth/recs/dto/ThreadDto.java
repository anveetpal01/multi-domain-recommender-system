package com.curio.auth.recs.dto;

import java.util.List;

/** A cross-domain "thread": one strong taste tag and the items that share it. */
public record ThreadDto(String tag, List<RecommendedItemDto> items) {}
