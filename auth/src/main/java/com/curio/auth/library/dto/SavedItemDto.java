package com.curio.auth.library.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record SavedItemDto(
        @NotBlank String id,
        @NotBlank String type,
        @NotBlank String title,
        String creator,
        String cover,
        Integer year,
        String meta,
        List<String> tags
) {}
