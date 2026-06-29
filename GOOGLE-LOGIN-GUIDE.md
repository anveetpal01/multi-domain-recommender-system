# Google Login — Curio (Spring Boot + React)

Goal: koi bhi apni **Gmail se register/login** kar paaye.

**Approach (industry standard for SPA + JWT):** frontend Google se ek **ID-token** leta hai → backend us token ko **verify** karke apna **JWT** issue karta hai. Yaani Google login bas tumhare existing JWT ka ek naya rasta ban jaata hai — baaki app bilkul same chalta hai. "Register" aur "login" ka farq mit jaata hai: pehli baar aaye to user ban jaata hai, baad me wahi login.

```
[React] --(Google se ID-token lo)--> Google
[React] --POST /api/auth/google { idToken }--> [Spring Boot]
                                                 |  Google ke saath token verify
                                                 |  user find-or-create
[React] <-- { token(JWT), name, email, role } --  apna JWT issue
[React]  token localStorage me → baaki app same
```

---

## Step 1 — Google Cloud Console se Client ID lo

1. [console.cloud.google.com](https://console.cloud.google.com) → upar **New Project** → naam "Curio" → Create.
2. Left menu → **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name: Curio, support email + developer email daalo → Save
   - **Scopes**: `openid`, `email`, `profile` add karo
   - **Test users**: apni Gmail add karo (testing mode me sirf added users login kar sakte hain; publish karne par sabke liye khul jayega)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:5173` (dev ke liye; prod me apna domain bhi)
   - Create → ek **Client ID** milega (jaisa `xxxx.apps.googleusercontent.com`)
4. Ye **Client ID copy** kar lo — ye public hai, backend aur frontend dono me lagega. (Client *secret* ki is approach me zaroorat nahi.)

---

## Step 2 — Backend (Spring Boot)

### 2.1 — `pom.xml` me Google verifier dependency

```xml
<dependency>
    <groupId>com.google.api-client</groupId>
    <artifactId>google-api-client</artifactId>
    <version>2.7.0</version>
</dependency>
```

Maven reload karo.

### 2.2 — `application.yml` me client id

```yaml
app:
  jwt:
    secret: ${JWT_SECRET:my-super-secret-key-change-me-now-1234567890}
    expiration-ms: 86400000
  cors:
    allowed-origin: http://localhost:5173
  google:
    client-id: ${GOOGLE_CLIENT_ID:yahan-apna-client-id.apps.googleusercontent.com}
```

### 2.3 — `User` entity update (Google users ka password nahi hota)

`passwordHash` ko **nullable** karo aur ek `provider` field add karo:

```java
@Column(nullable = true)
private String passwordHash;

@Enumerated(EnumType.STRING)
@Column(nullable = false)
private Provider provider = Provider.LOCAL;
```

### 2.4 — Naya enum `user/Provider.java`

```java
package com.curio.auth.user;

public enum Provider {
    LOCAL,
    GOOGLE
}
```

### 2.5 — DTO `auth/dto/GoogleLoginRequest.java`

```java
package com.curio.auth.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(@NotBlank String idToken) {}
```

### 2.6 — `AuthService` me Google verify + find-or-create

Ye field + constructor me verifier banao, aur ek method add karo:

```java
// imports (upar):
import com.curio.auth.auth.dto.GoogleLoginRequest;
import com.curio.auth.user.Provider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import java.util.Collections;

// field:
private final GoogleIdTokenVerifier googleVerifier;

// constructor me ye param add karo aur verifier banao:
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

// method:
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

    String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
    return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole().name());
}
```

`setAudience(...)` sabse important security check hai — token sirf **tumhare** client-id ke liye bana ho, tabhi accept hoga.

### 2.7 — `AuthController` me endpoint

```java
import com.curio.auth.auth.dto.GoogleLoginRequest;

@PostMapping("/google")
public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest req) throws Exception {
    return ResponseEntity.ok(authService.loginWithGoogle(req));
}
```

### 2.8 — `SecurityConfig` me `/api/auth/google` ko public karo

```java
.requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/google").permitAll()
```

Backend restart karo.

---

## Step 3 — Frontend (React / Curio)

### 3.1 — `index.html` me Google ki script

`<head>` me add karo:

```html
<script src="https://accounts.google.com/gsi/client" async></script>
```

### 3.2 — `.env` me client id

```
VITE_API_BASE=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=yahan-apna-client-id.apps.googleusercontent.com
```

(`.env` badalne ke baad `npm run dev` restart karna.)

### 3.3 — `AuthContext.jsx` me `loginWithGoogle`

`login`/`register` ke paas ye method add karo aur value me expose karo:

```js
async function loginWithGoogle(idToken) {
  const data = await apiPost('/auth/google', { idToken })
  persist(data)
  return data
}
// ...
<AuthContext.Provider value={{ token, user, isAuthed: !!token, login, register, loginWithGoogle, logout }}>
```

### 3.4 — `Login.jsx` me asli Google button

`socialSoon` wala custom Google button hata ke **Google ka official button** render karo. Component me ye add karo:

```jsx
import { useEffect, useRef } from 'react'
// ...
const { login, register, loginWithGoogle, isAuthed } = useAuth()
const googleBtn = useRef(null)

useEffect(() => {
  const id = setInterval(() => {
    if (window.google && googleBtn.current) {
      clearInterval(id)
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (res) => {
          try {
            const data = await loginWithGoogle(res.credential)
            setName(data.name)
            nav(onboarded ? '/' : '/onboarding')
          } catch (err) {
            setError(err.message)
          }
        },
      })
      window.google.accounts.id.renderButton(googleBtn.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      })
    }
  }, 100)
  return () => clearInterval(id)
}, [])
```

…aur JSX me purane Google `<button>` ki jagah:

```jsx
<div className={s.oauth}>
  <div ref={googleBtn} style={{ display: 'flex', justifyContent: 'center' }} />
</div>
```

`res.credential` hi Google ka ID-token hai jo backend verify karta hai.

---

## Step 4 — Test karo

1. Backend restart (8080), frontend restart (`npm run dev`, 5173)
2. `/login` pe Google ka button dikhega → click → Google account chuno
3. Pehli baar = account ban jayega; agli baar = login. Dono me app ka JWT milega, seedha onboarding/home.
4. Network tab me `POST /api/auth/google` → 200 + token dikhega.

---

## Notes / best practices

- **Audience check** (`setAudience`) zaroori — warna kisi aur app ka token bhi chal jayega.
- **emailVerified** check karo (upar kiya hai) — unverified Gmail accept mat karo.
- Client ID public hai (frontend me ok); **client secret kahin mat daalo** (is flow me chahiye hi nahi).
- Prod me: Authorized JavaScript origins me apna real domain, consent screen **publish**, HTTPS.
- LOCAL (email/password) aur GOOGLE — dono ek hi `users` table me, `provider` se pata chalta hai kaun-sa. Agar same email pehle email/password se bana ho to woh user mil jayega (find-by-email) — chaaho to accounts "link" karne ka logic baad me add kar sakte ho.

Atak jao kahin to exact error bhejo — wahin se aage dekhte hain.
