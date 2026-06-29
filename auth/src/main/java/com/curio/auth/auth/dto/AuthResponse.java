package com.curio.auth.auth.dto;

public record AuthResponse(String token, String name, String email, String role, boolean onboarded) {}
