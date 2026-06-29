# Curio — Deployment Guide (truly free, NO credit card)

Stack (sab free, no card, no trial):
- **Frontend** (React) → **Render — Static Site** (free, HTTPS, no sleep)
- **Backend** (Spring Boot) → **Render — Web Service (Docker)** (free, HTTPS auto; 15-min inactivity pe sleep)
- **Database** → **Neon** (free serverless PostgreSQL, no card)

```
[Render Static Site]  https://curio.onrender.com        (React, HTTPS)
        │  fetch https://curio-api.onrender.com/api/...
        ▼
[Render Web Service]  Spring Boot (HTTPS auto)  ──►  [Neon]  PostgreSQL (free)
```

> **Sabse bada plus:** Render khud HTTPS deta hai — to koi VM, SSH, Caddy, DuckDNS, domain kuch nahi chahiye. Sab GitHub se auto-deploy.
>
> **Ek catch:** free backend (Web Service) **15 min inactivity ke baad so jata hai** → uske baad pehli request ~50 sec slow (cold start), phir normal. (Frontend Static Site kabhi nahi sota.)

---

## Maine code me kya ready kiya
- `auth/Dockerfile` — Render iske through backend build+run karega.
- `application.yml` / `application-prod.yml` — port, DB, JWT, Google, CORS sab **env vars** se. Code touch nahi karna; bas Render pe env vars set karne hain.

---

## Part A — GitHub (ho gaya ✅)
Code yahan hai: `https://github.com/anveetpal01/multi-domain-recommender-system`
(`curio-app/` = frontend, `auth/` = backend)

---

## Part B — Database: Neon (free Postgres, no card)

1. [neon.tech](https://neon.tech) → **GitHub se sign up** (card nahi maangega).
2. **Create project** (region apne paas ka, e.g. Singapore/Mumbai). Database name `curio` rakho (ya default).
3. Project banते hi **Connection string** milega. Use **"parameters/JDBC"** view me dekho — tumhe ye 3 chahiye:
   - **Host** (e.g. `ep-xxxx.ap-southeast-1.aws.neon.tech`)
   - **User** + **Password**
   - **Database** name
4. In se **JDBC URL** banao (SSL zaroori hai Neon me):
   ```
   jdbc:postgresql://<HOST>/<DATABASE>?sslmode=require
   ```
   Ye URL + user + password Part C me lagenge.

---

## Part C — Backend: Render Web Service (Docker)

1. [render.com](https://render.com) → **GitHub se sign up** (no card).
2. **New + → Web Service** → repo `anveetpal01/multi-domain-recommender-system` connect karo.
3. **Settings:**
   - **Branch:** `master`
   - **Root Directory:** `auth`  ⬅️ (monorepo me backend yahan hai)
   - **Runtime/Environment:** **Docker** (Render `auth/Dockerfile` khud detect karega)
   - **Instance Type:** **Free**
4. **Environment Variables** (Add karo):
   | Key | Value |
   | --- | --- |
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<HOST>/<DB>?sslmode=require` (Neon) |
   | `SPRING_DATASOURCE_USERNAME` | Neon user |
   | `SPRING_DATASOURCE_PASSWORD` | Neon password |
   | `JWT_SECRET` | koi lamba random string (kam se kam 32 chars) |
   | `GOOGLE_CLIENT_ID` | `679235122244-sijko890pkmrj9s1udg36ag26mgr1q1n.apps.googleusercontent.com` |
   | `APP_CORS_ALLOWED_ORIGIN` | `https://PLACEHOLDER.onrender.com` (frontend URL milne ke baad update karenge) |
5. **Create Web Service** → Render Docker image build karega (pehli baar 3-5 min). Done par URL milega, e.g. **`https://curio-api-xxxx.onrender.com`** — note kar lo.
6. Test: browser me `https://curio-api-xxxx.onrender.com/api/auth/me` → **401** aana chahiye (matlab live hai).

> `PORT` set karne ki zaroorat nahi — Render khud deta hai, aur app `${PORT}` padh leta hai.

---

## Part D — Frontend: Render Static Site

1. Render → **New + → Static Site** → wahi repo connect karo.
2. **Settings:**
   - **Branch:** `master`
   - **Root Directory:** `curio-app`  ⬅️
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. **Environment Variables:**
   - `VITE_API_BASE` = `https://curio-api-xxxx.onrender.com/api`  *(Part C wala backend URL + `/api`)*
   - `VITE_GOOGLE_CLIENT_ID` = `679235122244-sijko890pkmrj9s1udg36ag26mgr1q1n.apps.googleusercontent.com`
4. **Create Static Site** → URL milega, e.g. **`https://curio-xxxx.onrender.com`** — note kar lo.

> HashRouter use kiya hai, isliye koi SPA rewrite rule nahi chahiye — refresh pe 404 nahi aayega.

---

## Part E — Aakhri wiring (zaroori, warna login fail)

1. **Backend ko frontend ka URL batao (CORS):** Render → backend service → **Environment** → `APP_CORS_ALLOWED_ORIGIN` ko apne **frontend** URL pe set karo:
   ```
   APP_CORS_ALLOWED_ORIGIN=https://curio-xxxx.onrender.com
   ```
   Save → Render auto redeploy karega.
2. **Google OAuth:** [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth client → **Authorized JavaScript origins** me add karo:
   - `https://curio-xxxx.onrender.com`
   - (consent screen "Testing" me ho to sirf added test-users; sabke liye **Publish** karo.)

---

## Part F — Test

1. **Frontend URL** kholo → login page.
2. **Create account** ya **Continue with Google** → onboarding → Home.
   - (Pehli request slow ho sakti hai agar backend so gaya tha — ~50 sec wait, phir chalega.)
3. Kuch save karo → logout → wapas login → saved items wahi (Neon Postgres me per-user) ✅
4. Phone pe bhi kholo — responsive.

### Common errors
| Dikkat | Fix |
| --- | --- |
| Login pe **CORS error** | `APP_CORS_ALLOWED_ORIGIN` = exact frontend URL (https, no trailing slash) → redeploy |
| Backend pehli request bahut slow / 502 | Free service so gaya tha — thodi der baad retry (cold start) |
| **DB connection** error | `SPRING_DATASOURCE_URL` me `?sslmode=require` hai? Neon user/pass sahi? |
| Backend **OOM / crash** | Free 512MB — Dockerfile me `MaxRAMPercentage` already set hai; logs dekho (Render → Logs) |
| Google button kaam nahi | Google Console me frontend URL "Authorized JavaScript origins" me + consent publish |
| Build fail (Docker) | Render → Logs; agar `eclipse-temurin:25` image issue ho to Dockerfile me `25` ko `21` kar do |

### Update kaise karein (baad me)
- GitHub pe push karo → Render (frontend + backend dono) **auto re-deploy** kar dega.

---

Bas! Ye **truly-free, no-credit-card, HTTPS** setup hai — sab Render + Neon, GitHub se auto-deploy. Kisi step pe error/log aaye to bhej dena, main wahin se solve kar dunga. 🚀
