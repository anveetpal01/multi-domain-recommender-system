package com.curio.auth.auth;

import com.curio.auth.auth.dto.AuthResponse;
import com.curio.auth.auth.dto.GoogleLoginRequest;
import com.curio.auth.auth.dto.LoginRequest;
import com.curio.auth.auth.dto.MeResponse;
import com.curio.auth.auth.dto.RegisterRequest;
import com.curio.auth.error.EmailTakenException;
import com.curio.auth.security.JwtService;
import com.curio.auth.user.Provider;
import com.curio.auth.user.Role;
import com.curio.auth.user.User;
import com.curio.auth.user.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final GoogleIdTokenVerifier googleVerifier;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       @Value("${app.google.client-id}") String googleClientId) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.googleVerifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new EmailTakenException();
        }
        User user = new User();
        user.setEmail(req.email());
        user.setName(req.name());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(Role.USER);
        userRepository.save(user);
        return buildResponse(user);
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        User user = userRepository.findByEmail(req.email()).orElseThrow();
        return buildResponse(user);
    }

    public AuthResponse loginWithGoogle(GoogleLoginRequest req) throws Exception {
        GoogleIdToken idToken = googleVerifier.verify(req.idToken());
        if (idToken == null) {
            throw new BadCredentialsException("Invalid Google token");
        }
        GoogleIdToken.Payload payload = idToken.getPayload();
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BadCredentialsException("Google email not verified");
        }
        String email = payload.getEmail();
        String name = (String) payload.getOrDefault("name", email.split("@")[0]);

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setName(name);
            u.setProvider(Provider.GOOGLE);
            u.setRole(Role.USER);
            return userRepository.save(u);
        });

        return buildResponse(user);
    }

    public MeResponse me(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return new MeResponse(user.getEmail(), user.getName(), user.getRole().name(), user.isOnboarded());
    }

    @Transactional
    public void markOnboarded(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setOnboarded(true);
        userRepository.save(user);
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getName(), user.getEmail(),
                user.getRole().name(), user.isOnboarded());
    }
}
