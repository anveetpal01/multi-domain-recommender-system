# Curio — Java Authentication Guide (Spring Boot + JWT)

Ye guide tumhare React "Curio" app ke liye ek **industry-standard Java auth backend** banane ka poora roadmap hai. Tum khud type karke banaoge — har file, har line ka matlab Hinglish me samjhaya hai. Code English me hai (standard practice).

**Stack (sab professional defaults):**
Java 21 (LTS) · Spring Boot 3 · Spring Security 6 · JWT (jjwt 0.12) · BCrypt · Spring Data JPA · H2 (dev) → PostgreSQL (prod).

---

## Table of contents

1. Pehle ye samjho — auth kaam kaise karta hai (flow)
2. Tools jo chahiye (prerequisites)
3. Project banao (Spring Initializr) + dependencies
4. Folder/package structure
5. Config — `application.yml`
6. `User` entity + `Role`
7. `UserRepository`
8. DTOs + validation
9. `JwtService`
10. `JwtAuthenticationFilter`
11. `CustomUserDetailsService`
12. `SecurityConfig` (+ CORS, PasswordEncoder, AuthManager)
13. `AuthService` (register/login logic)
14. `AuthController` (endpoints)
15. Error handling (professional touch)
16. Chalakar test karo (curl/Postman)
17. React (Curio) ko backend se jodo
18. Security best practices (zaroor padho)
19. Production checklist
20. Common errors + fixes

---

## 1. Pehle ye samjho — auth flow

Tumhara React app aur Java backend **alag-alag** chalte hain aur HTTP se baat karte hain. Auth ka standard tareeka **JWT (JSON Web Token)** hai:

```
┌─────────────┐   1. POST /api/auth/login  {email, password}    ┌──────────────┐
│   React     │ ───────────────────────────────────────────────▶│  Spring Boot │
│  (Curio UI) │                                                  │   backend    │
│             │ ◀─────────────────────────────────────────────── │              │
└─────────────┘   2. { token: "eyJ...", name, email, role }      └──────────────┘
       │
       │ 3. token ko localStorage me save
       │
       │ 4. har aage ki request me header bhejo:
       │        Authorization: Bearer eyJ...
       ▼
   backend token verify karta hai → user pehchaan ke response deta hai
```

**Key ideas:**

- Password kabhi plain text me store nahi hota — **BCrypt se hash** hota hai.
- Login successful hone par backend ek **signed token (JWT)** deta hai. Ye token "proof" hai ki tum logged in ho.
- Backend **stateless** hai — server pe koi session nahi rakhta. Har request ke saath token aata hai, backend usse verify karta hai. (Yahi modern, scalable tareeka hai.)
- Token ke andar user ka email + role hota hai, aur ek **signature** jise sirf server verify kar sakta hai (secret key se). Isliye koi token ko nakli nahi bana sakta.

---

## 2. Tools jo chahiye

| Tool | Kyun | Kaise |
| --- | --- | --- |
| **JDK 21** | Java code compile/run karne ke liye | [adoptium.net](https://adoptium.net) se Temurin 21 install karo |
| **IntelliJ IDEA** (Community free) | Best Java IDE | jetbrains.com/idea |
| **Maven** | Build tool (IntelliJ ke saath aata hai) | alag se install ki zaroorat nahi |
| **Postman** ya curl | API test karne ke liye | optional |

Check karo: terminal me `java -version` → 21 dikhna chahiye.

> Maven vs Gradle: dono industry-standard hain. Beginner ke liye Maven ka XML padhna aasaan hai, isliye yahan Maven use kiya hai. Gradle prefer karo to dependencies waise hi hain.

---

## 3. Project banao (Spring Initializr)

Browser me **[start.spring.io](https://start.spring.io)** kholo aur ye choose karo:

- Project: **Maven**
- Language: **Java**
- Spring Boot: **3.x** (jo default latest stable ho, le lo)
- Group: `com.curio` · Artifact: `auth` · Packaging: **Jar** · Java: **21**

**Dependencies** (ADD DEPENDENCIES button):

- **Spring Web** — REST API banane ke liye
- **Spring Security** — authentication/authorization
- **Spring Data JPA** — database ke saath kaam
- **Validation** — input validate karne ke liye
- **H2 Database** — dev/testing ke liye in-memory DB
- **PostgreSQL Driver** — prod ke liye (abhi sirf add kar lo)
- **Lombok** — getters/setters boilerplate hatata hai

**GENERATE** dabao → zip download → extract → IntelliJ me "Open" karo.

### Ek dependency manually add karni hai: JWT (jjwt)

Spring Initializr me JWT nahi hota, isliye `pom.xml` me `<dependencies>` ke andar ye 3 add karo:

```xml
<!-- JWT (jjwt) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

Add karne ke baad IntelliJ me Maven refresh karo (right side Maven panel → reload icon).

> **Lombok note:** IntelliJ me Settings → Build → Compiler → Annotation Processors → **Enable annotation processing** ON karo, warna Lombok ke getters/setters generate nahi honge.

---

## 4. Folder/package structure

`src/main/java/com/curio/auth/` ke andar ye packages banao (professional layered structure):

```
com.curio.auth
├── AuthApplication.java          (already bana hua — main class)
├── config
│   └── SecurityConfig.java
├── user
│   ├── User.java                 (entity)
│   ├── Role.java                 (enum)
│   └── UserRepository.java
├── auth
│   ├── AuthController.java
│   ├── AuthService.java
│   └── dto
│       ├── RegisterRequest.java
│       ├── LoginRequest.java
│       └── AuthResponse.java
├── security
│   ├── JwtService.java
│   ├── JwtAuthenticationFilter.java
│   └── CustomUserDetailsService.java
└── error
    ├── GlobalExceptionHandler.java
    └── EmailTakenException.java
```

> Layered structure (controller → service → repository) industry standard hai: controller sirf HTTP handle kare, service me business logic ho, repository DB se baat kare. Isse code clean aur testable rehta hai.

---

## 5. Config — `application.yml`

`src/main/resources/` me jo `application.properties` hai use **delete** karke `application.yml` banao (YAML padhna aasaan hai):

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:mem:curiodb
    driver-class-name: org.h2.Driver
    username: sa
    password: ""
  jpa:
    hibernate:
      ddl-auto: update      # entity se table khud ban jayegi (sirf dev)
    show-sql: true
  h2:
    console:
      enabled: true          # http://localhost:8080/h2-console se DB dekho

app:
  jwt:
    # IMPORTANT: kam se kam 32 characters. Prod me env var se aana chahiye.
    secret: ${JWT_SECRET:my-super-secret-key-change-me-now-1234567890}
    expiration-ms: 86400000  # 24 ghante
  cors:
    allowed-origin: http://localhost:5173   # React dev server ka address
```

`${JWT_SECRET:default}` ka matlab: pehle `JWT_SECRET` environment variable dhoondho, na mile to default use karo. Prod me hamesha env var set karna.

---

## 6. `User` entity + `Role`

Entity = ek Java class jo DB table se map hoti hai. JPA isse `users` table bana dega.

`user/Role.java`:

```java
package com.curio.auth.user;

public enum Role {
    USER,
    ADMIN
}
```

`user/User.java`:

```java
package com.curio.auth.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;   // BCrypt hash — kabhi plain password nahi

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
```

- `@Entity` + `@Table` → ye class `users` table banegi.
- `@Id @GeneratedValue` → primary key, auto-increment.
- `unique = true` email pe → do users ek hi email se register nahi kar sakte.
- `@Getter @Setter` (Lombok) → saare getters/setters auto ban jaate hain.

---

## 7. `UserRepository`

Repository = DB queries. Spring Data JPA tumhare liye implementation khud bana deta hai — tum sirf method ke naam likhte ho.

`user/UserRepository.java`:

```java
package com.curio.auth.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

`JpaRepository` se save/find/delete jaise methods free me mil jaate hain. `findByEmail` ka SQL Spring khud likh dega (method naam dekh ke).

---

## 8. DTOs + validation

DTO (Data Transfer Object) = request/response ka shape. Hum **records** use karenge (Java 17+ ka chhota, immutable class). Entity ko kabhi seedha API me expose nahi karte — DTO use karna professional practice hai.

`auth/dto/RegisterRequest.java`:

```java
package com.curio.auth.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password kam se kam 8 characters") String password,
        @NotBlank String name
) {}
```

`auth/dto/LoginRequest.java`:

```java
package com.curio.auth.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {}
```

`auth/dto/AuthResponse.java`:

```java
package com.curio.auth.auth.dto;

public record AuthResponse(String token, String name, String email, String role) {}
```

`@NotBlank`, `@Email`, `@Size` annotations input ko automatically validate karte hain (controller me `@Valid` lagane par). Galat input aaye to 400 error apne aap.

---

## 9. `JwtService` — token banana + verify karna

Ye class JWT generate aur validate karti hai (jjwt library se).

`security/JwtService.java`:

```java
package com.curio.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        // secret kam se kam 32 chars (256-bit) hona chahiye HS256 ke liye
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)                 // token kiska hai
                .claim("role", role)            // extra info
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)                  // server ke secret se sign
                .compact();
    }

    public String extractEmail(String token) {
        return parse(token).getSubject();
    }

    public boolean isValid(String token) {
        try {
            parse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;   // galat ya expired token
        }
    }

    private Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

---

## 10. `JwtAuthenticationFilter` — har request pe token check

Ye filter har incoming request ko intercept karke `Authorization: Bearer ...` header padhta hai, token verify karta hai, aur valid hone par user ko "logged in" mark kar deta hai.

`security/JwtAuthenticationFilter.java`:

```java
package com.curio.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, CustomUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);   // token nahi → aage badho
            return;
        }

        String token = header.substring(7);   // "Bearer " ke baad ka hissa

        if (jwtService.isValid(token)
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            String email = jwtService.extractEmail(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            var authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
```

---

## 11. `CustomUserDetailsService`

Spring Security ko batata hai ki email se user kaise nikalein. Login ke waqt Spring isi se password compare karta hai.

`security/CustomUserDetailsService.java`:

```java
package com.curio.auth.security;

import com.curio.auth.user.User;
import com.curio.auth.user.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                .build();
    }
}
```

---

## 12. `SecurityConfig` — sab kuch jodne wali class

Yahan decide hota hai: kaunse endpoints public hain, kaunse protected, CORS, password encoder, aur hamara JWT filter.

`config/SecurityConfig.java`:

```java
package com.curio.auth.config;

import com.curio.auth.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())   // stateless JWT API me CSRF ki zaroorat nahi
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/h2-console/**").permitAll()   // sirf dev
                .anyRequest().authenticated())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // H2 console iframe me khulta hai — sirf dev ke liye
        http.headers(h -> h.frameOptions(f -> f.disable()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();   // industry standard hashing
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origin}") String origin) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(origin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

**Samajhne wali baatein:**

- `permitAll()` → register/login bina token ke khulte hain (logically zaroori).
- `anyRequest().authenticated()` → baaki sab endpoints ke liye valid token chahiye.
- `STATELESS` → server session nahi banata; har request token se authenticate hoti hai.
- `addFilterBefore(...)` → hamara JWT filter Spring ke default filter se pehle chalega.
- **CORS** → browser by default cross-origin requests block karta hai; yahan React ka origin (`localhost:5173`) explicitly allow kiya.

---

## 13. `AuthService` — register/login logic

`auth/AuthService.java`:

```java
package com.curio.auth.auth;

import com.curio.auth.auth.dto.AuthResponse;
import com.curio.auth.auth.dto.LoginRequest;
import com.curio.auth.auth.dto.RegisterRequest;
import com.curio.auth.error.EmailTakenException;
import com.curio.auth.security.JwtService;
import com.curio.auth.user.Role;
import com.curio.auth.user.User;
import com.curio.auth.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new EmailTakenException();
        }
        User user = new User();
        user.setEmail(req.email());
        user.setName(req.name());
        user.setPasswordHash(passwordEncoder.encode(req.password())); // hash!
        user.setRole(Role.USER);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole().name());
    }

    public AuthResponse login(LoginRequest req) {
        // ye line password verify karti hai; galat hua to BadCredentialsException
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));

        User user = userRepository.findByEmail(req.email()).orElseThrow();
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole().name());
    }
}
```

`authenticationManager.authenticate(...)` internally `CustomUserDetailsService` + `BCryptPasswordEncoder` use karke password match karta hai. Tumhe khud compare nahi karna — Spring karta hai.

---

## 14. `AuthController` — REST endpoints

`auth/AuthController.java`:

```java
package com.curio.auth.auth;

import com.curio.auth.auth.dto.AuthResponse;
import com.curio.auth.auth.dto.LoginRequest;
import com.curio.auth.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    @GetMapping("/me")   // protected — sirf valid token ke saath chalega
    public ResponseEntity<?> me(Authentication authentication) {
        return ResponseEntity.ok(Map.of(
                "email", authentication.getName(),
                "authorities", authentication.getAuthorities()
        ));
    }
}
```

`@Valid` → DTO ke validation rules apply honge. `/me` protected hai (SecurityConfig me `anyRequest().authenticated()`), to bina token ke 401 milega.

---

## 15. Error handling (professional touch)

`error/EmailTakenException.java`:

```java
package com.curio.auth.error;

public class EmailTakenException extends RuntimeException {
    public EmailTakenException() {
        super("Email already registered");
    }
}
```

`error/GlobalExceptionHandler.java` — saari errors ka ek jagah clean JSON response:

```java
package com.curio.auth.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailTakenException.class)
    public ResponseEntity<?> handleEmailTaken(EmailTakenException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)        // 409
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<?> handleBadCredentials(BadCredentialsException ex) {
        // generic message — kabhi mat batao ki email galat tha ya password
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)    // 401
                .body(Map.of("message", "Invalid email or password"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .orElse("Validation failed");
        return ResponseEntity.badRequest().body(Map.of("message", msg)); // 400
    }
}
```

---

## 16. Chalakar test karo

IntelliJ me `AuthApplication` run karo (green ▶). Console me "Started AuthApplication" dikhe → backend `http://localhost:8080` pe chal raha hai.

**Register (curl):**

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ayush@test.com","password":"secret123","name":"Ayush"}'
```

Response:

```json
{ "token": "eyJhbGciOiJIUzI1NiJ9...", "name": "Ayush", "email": "ayush@test.com", "role": "USER" }
```

**Login:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ayush@test.com","password":"secret123"}'
```

**Protected endpoint (token ke saath):**

```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <yahan-token-paste-karo>"
```

Bina token ke `/me` call karoge to **401** milega — matlab security kaam kar rahi hai. ✅

DB dekhna ho to browser me `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:curiodb`, user `sa`, password blank).

---

## 17. React (Curio) ko backend se jodo

Abhi tumhare app ka `src/screens/Login.jsx` **dummy** hai (sirf naam localStorage me daalta hai). Ab use real backend se jodenge. Niche ka code tumhare existing Curio app me add karna hai.

### 17.1 — API helper — `src/shared/api.js` (naya file)

```js
const API_BASE = 'http://localhost:8080/api'

export async function apiPost(path, body, token) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Something went wrong')
  return data
}

export async function apiGet(path, token) {
  const res = await fetch(API_BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Something went wrong')
  return data
}
```

### 17.2 — Auth context — `src/shared/AuthContext.jsx` (naya file)

```jsx
import { createContext, useContext, useState } from 'react'
import { apiPost } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('curio-token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('curio-user')) } catch { return null }
  })

  function persist(data) {
    const u = { name: data.name, email: data.email, role: data.role }
    setToken(data.token)
    setUser(u)
    localStorage.setItem('curio-token', data.token)
    localStorage.setItem('curio-user', JSON.stringify(u))
  }

  async function login(email, password) {
    persist(await apiPost('/auth/login', { email, password }))
  }
  async function register(email, password, name) {
    persist(await apiPost('/auth/register', { email, password, name }))
  }
  function logout() {
    setToken(null); setUser(null)
    localStorage.removeItem('curio-token')
    localStorage.removeItem('curio-user')
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### 17.3 — `main.jsx` me `AuthProvider` wrap karo

`ThemeProvider` ke andar (sabse bahar bhi chalega) ek aur provider add kar do:

```jsx
import { AuthProvider } from './shared/AuthContext.jsx'
// ...
<HashRouter>
  <AuthProvider>
    <ThemeProvider>
      <CatalogProvider>
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </CatalogProvider>
    </ThemeProvider>
  </AuthProvider>
</HashRouter>
```

### 17.4 — `Login.jsx` ka `proceed()` badlo

Dummy logic ki jagah real call. (Toggle ke saath login/register dono handle kar sakte ho; simple version:)

```jsx
import { useAuth } from '../shared/AuthContext'
// component ke andar:
const { login, register } = useAuth()
const [error, setError] = useState('')

const submit = async (e) => {
  e.preventDefault()
  setError('')
  try {
    // naye user ke liye register, warna login:
    await register(email, password, email.split('@')[0])
    nav(onboarded ? '/' : '/onboarding')
  } catch (err) {
    setError(err.message)   // e.g. "Email already registered"
  }
}
```

(Tumhe ek `password` input bhi add karna hoga — abhi sirf email hai. Aur `{error && <p className={s.error}>{error}</p>}` dikha dena.)

### 17.5 — Protected routes — `App.jsx` me `RequireAuth`

```jsx
import { useAuth } from './shared/AuthContext'

function RequireAuth({ children }) {
  const { isAuthed } = useAuth()
  if (!isAuthed) return <Navigate to="/login" replace />
  return children
}
```

Phir app routes ko `RequireOnboard` ki jagah (ya saath me) `RequireAuth` se wrap kar do:

```jsx
<Route element={<RequireAuth><AppLayout /></RequireAuth>}>
   {/* home, browse, ... */}
</Route>
```

Ab koi bina login kiye andar nahi ghus payega, aur saved library backend-token se per-user ho sakti hai (next step).

---

## 18. Security best practices (ZAROOR padho)

| Practice | Kyun |
| --- | --- |
| **BCrypt se hash** | Plain password kabhi store mat karo. BCrypt slow + salted hai. (Already kiya.) |
| **JWT secret env var me** | Code/git me secret mat daalo. `JWT_SECRET` env var se aaye, kam se kam 32 random chars. |
| **HTTPS in prod** | Token network pe jaata hai — HTTP pe koi chura sakta hai. Prod me hamesha HTTPS. |
| **Short token expiry + refresh token** | Access token chhoti life (15–60 min), saath me refresh token. Chori hua to kam damage. |
| **Generic login errors** | "Invalid email or password" hi bolo — kabhi mat batao ki email exist karta hai (enumeration attack). |
| **Input validation** | `@Valid` + DTO constraints (already). Server pe hamesha validate karo, sirf frontend pe bharosa mat karo. |
| **CORS lock** | Sirf apne frontend ka origin allow karo, `*` nahi (jab credentials ho). |
| **JWT me sensitive data nahi** | Token ka payload base64 hai, koi bhi padh sakta hai. Password/secret kabhi mat daalo. |
| **Rate limiting / lockout** | Login pe brute-force rokne ke liye attempts limit karo (e.g. Bucket4j). |

> **localStorage vs httpOnly cookie:** localStorage simple hai par XSS se token chori ho sakta hai. Zyada secure setup me token ko **httpOnly + Secure + SameSite cookie** me rakhte hain (JS use nahi kar sakta). Beginner ke liye localStorage theek hai; production-grade ke liye cookie approach seekhna.

---

## 19. Production checklist

- [ ] H2 → **PostgreSQL** (`application.yml` me datasource badlo, driver already added)
- [ ] `ddl-auto: update` hatao → **Flyway/Liquibase** migrations use karo
- [ ] `JWT_SECRET`, DB password — sab **environment variables** se
- [ ] **HTTPS** enable
- [ ] **Refresh token** flow add karo
- [ ] Logging + monitoring
- [ ] CORS origin = asli frontend domain
- [ ] `show-sql: false`, H2 console disable

**Postgres ke liye `application.yml` (dev ke baad):**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/curio
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
```

---

## 20. Common errors + fixes

| Error | Kya hua | Fix |
| --- | --- | --- |
| **`WeakKeyException` / key too short** | JWT secret 32 chars se chhota | secret kam se kam 32 characters rakho |
| **Har request pe 401** | Filter register nahi, ya header galat | `Authorization: Bearer <token>` format check; SecurityConfig me `addFilterBefore` hai? |
| **CORS error (browser console)** | Backend ne origin allow nahi kiya | `corsConfigurationSource` me React ka exact origin (`http://localhost:5173`) |
| **403 Forbidden** | CSRF on hai ya authority missing | `csrf.disable()` hai? role `ROLE_` prefix ke saath? |
| **Lombok getters "cannot find symbol"** | Annotation processing off | IntelliJ → enable annotation processing; Lombok plugin installed |
| **H2 console blank/refused** | frameOptions ya path | `frameOptions.disable()` + `/h2-console/**` permitAll (sirf dev) |
| **`401` register pe bhi** | endpoint permitAll nahi | SecurityConfig me `/api/auth/register` `.permitAll()` |

---

## Aage kya seekhna

- **Refresh tokens** (access + refresh pattern)
- **OAuth2 / Google login** (Spring Security OAuth2 client)
- **httpOnly cookie** based auth (XSS-safe)
- **Method-level security** (`@PreAuthorize("hasRole('ADMIN')")`)
- **Testing** (`@WebMvcTest`, `@SpringBootTest`, MockMvc)

Order jisme files banao: `User`/`Role` → `UserRepository` → DTOs → `JwtService` → `CustomUserDetailsService` → `JwtAuthenticationFilter` → `SecurityConfig` → `AuthService` → `AuthController` → error classes. Phir run karke curl se test, phir React wiring.

Koi step pe atko ya error aaye — exact error bhejo, main usi waqt samjha dunga. Happy building! 🚀

