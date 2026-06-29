package com.curio.auth.auth.dto;

public record MeResponse(String email, String name, String role, boolean onboarded) {}
