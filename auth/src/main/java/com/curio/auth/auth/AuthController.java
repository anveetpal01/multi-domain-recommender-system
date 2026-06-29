package com.curio.auth.auth;

import com.curio.auth.auth.dto.AuthResponse;
import com.curio.auth.auth.dto.GoogleLoginRequest;
import com.curio.auth.auth.dto.LoginRequest;
import com.curio.auth.auth.dto.MeResponse;
import com.curio.auth.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest req) throws Exception {
        return ResponseEntity.ok(authService.loginWithGoogle(req));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication.getName()));
    }

    @PostMapping("/onboarded")
    public ResponseEntity<Void> onboarded(Authentication authentication) {
        authService.markOnboarded(authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
