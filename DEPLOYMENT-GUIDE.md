# Curio — Deployment Guide (truly free)

Stack (sab free, no trial):
- **Frontend** (React) → **Cloudflare Pages** (free, HTTPS, Git se auto-deploy)
- **Backend** (Spring Boot) → **Oracle Cloud Always Free VM** (always-on, free)
- **Database** → **PostgreSQL** usi Oracle VM pe (free, no extra account)
- **HTTPS for backend** → **Caddy + DuckDNS** (free domain + auto SSL)

```
[Cloudflare Pages]  https://yourapp.pages.dev   (React)
        │  fetch https://yourapi.duckdns.org/api/...
        ▼
[Oracle VM]  Caddy (443, auto-HTTPS)  →  Spring Boot (localhost:8080)  →  Postgres (localhost:5432)
```

> **HTTPS kyun zaroori:** Cloudflare Pages HTTPS pe hai. HTTPS site sirf HTTPS backend ko call kar sakti hai (HTTP backend = browser block "mixed content"). Isliye backend pe Caddy se HTTPS lagana zaroori hai.

---

## Maine code me kya ready kiya
- `application.yml` — port, CORS origin, JWT secret, Google id sab **env vars** se (dev defaults ke saath).
- `application-prod.yml` (naya) — **Postgres** profile (`SPRING_PROFILES_ACTIVE=prod` se on hota hai), env vars se DB.
- Tumhe code me kuch change nahi karna — bas env vars set karne hain server pe.

---

## Part A — GitHub par code

Do alag folder hain: `curio-app` (frontend) aur `auth` (backend). Inhe ek hi repo me (ya do repos me) GitHub pe push kar do. Ek repo me dono theek hai.

`.gitignore` me ye zaroor ho (warna secrets/build-junk commit ho jayega):
```
# frontend
curio-app/node_modules
curio-app/dist
# backend
auth/target
auth/data         # H2 dev db
# secrets (optional)
*.local
```

---

## Part B — Oracle Cloud Always Free VM banao

1. [cloud.oracle.com](https://cloud.oracle.com) → sign up (card verification ke liye lagega, **charge nahi hoga** — Always Free quota).
2. **Compute → Instances → Create Instance**:
   - Image: **Ubuntu 22.04** (ya 24.04)
   - Shape: **Ampere (ARM) — VM.Standard.A1.Flex** → "Always Free eligible" (1 OCPU / 6 GB se start, ya zyada free quota me)
   - **SSH keys**: apni public key add karo (ya generate karke private key download karo)
   - Create → thodi der me VM ready → **Public IP** note kar lo.
3. **Ports open karo (zaroori):**
   - Instance → **VCN → Security List → Add Ingress Rules**: Source `0.0.0.0/0`, TCP ports **80** aur **443**.
   - (8080 open karne ki zaroorat nahi — backend localhost pe rahega, Caddy 443 pe.)

---

## Part C — VM setup (SSH karke)

SSH:
```bash
ssh -i path/to/private_key ubuntu@<VM_PUBLIC_IP>
```

### 1. Ubuntu firewall me 80/443 allow karo
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 2. Java 25 install (SDKMAN se aasaan)
```bash
sudo apt update && sudo apt install -y zip unzip curl git
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 25-tem
java -version   # 25 dikhna chahiye
```

### 3. PostgreSQL install + DB banao
```bash
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE DATABASE curio;"
sudo -u postgres psql -c "CREATE USER curio WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE curio TO curio;"
sudo -u postgres psql -d curio -c "GRANT ALL ON SCHEMA public TO curio;"
```

### 4. Backend code lao + build
```bash
git clone <YOUR_GITHUB_REPO_URL> app
cd app/auth
chmod +x mvnw
./mvnw clean package -DskipTests
# JAR ban jayegi: target/auth-0.0.1-SNAPSHOT.jar
```

### 5. Backend ko service banao (always-on)
`/etc/systemd/system/curio.service` banao:
```bash
sudo nano /etc/systemd/system/curio.service
```
Ye paste karo (apne values bharo):
```ini
[Unit]
Description=Curio Backend
After=network.target postgresql.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/app/auth
ExecStart=/home/ubuntu/.sdkman/candidates/java/current/bin/java -jar target/auth-0.0.1-SNAPSHOT.jar
Restart=always
Environment=SPRING_PROFILES_ACTIVE=prod
Environment=SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/curio
Environment=SPRING_DATASOURCE_USERNAME=curio
Environment=SPRING_DATASOURCE_PASSWORD=CHOOSE_A_STRONG_PASSWORD
Environment=JWT_SECRET=ek-bahut-lamba-random-secret-kam-se-kam-32-chars-1234567890
Environment=GOOGLE_CLIENT_ID=679235122244-sijko890pkmrj9s1udg36ag26mgr1q1n.apps.googleusercontent.com
Environment=APP_CORS_ALLOWED_ORIGIN=https://REPLACE-WITH-YOUR.pages.dev

[Install]
WantedBy=multi-user.target
```
Phir:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now curio
sudo systemctl status curio        # "active (running)" dikhna chahiye
curl http://localhost:8080/api/auth/me   # 401 aana chahiye = chal raha hai
```

> `APP_CORS_ALLOWED_ORIGIN` abhi placeholder hai — Cloudflare URL milne ke baad (Part E) yahan daal ke `sudo systemctl restart curio` karna.

---

## Part D — Backend ko HTTPS do (Caddy + DuckDNS)

### 1. Free domain (DuckDNS)
1. [duckdns.org](https://www.duckdns.org) → Google/GitHub se login.
2. Ek subdomain banao, e.g. **`curioapi`** → `curioapi.duckdns.org`.
3. "current ip" me apne **VM ka Public IP** daal ke update karo.

### 2. Caddy install (auto-HTTPS)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 3. Caddyfile
```bash
sudo nano /etc/caddy/Caddyfile
```
Sab hata ke ye daalo (apna duckdns domain):
```
curioapi.duckdns.org {
    reverse_proxy localhost:8080
}
```
```bash
sudo systemctl restart caddy
```
Caddy khud Let's Encrypt se **HTTPS certificate** le lega (1-2 min). Test:
```bash
curl https://curioapi.duckdns.org/api/auth/me   # 401 = HTTPS backend live ✅
```

Ab tumhara backend HTTPS pe hai: **`https://curioapi.duckdns.org`**

---

## Part E — Frontend deploy (Cloudflare Pages)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git** → apna GitHub repo chuno.
2. **Build settings:**
   - **Root directory (Advanced):** `curio-app`
   - **Framework preset:** Vite (ya None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. **Environment variables** (Settings → Environment variables → Production) add karo:
   - `VITE_API_BASE` = `https://curioapi.duckdns.org/api`
   - `VITE_GOOGLE_CLIENT_ID` = `679235122244-sijko890pkmrj9s1udg36ag26mgr1q1n.apps.googleusercontent.com`
4. **Save and Deploy** → 1-2 min me URL milega, e.g. **`https://curio-xxxx.pages.dev`** — note kar lo.

> HashRouter use kiya hai, isliye Cloudflare pe koi SPA-redirect config ki zaroorat nahi — refresh pe 404 nahi aayega.

---

## Part F — Aakhri wiring (zaroori, warna login fail hoga)

### 1. Backend ko frontend ka URL batao (CORS)
VM pe `curio.service` me `APP_CORS_ALLOWED_ORIGIN` ko apne Cloudflare URL pe set karo:
```bash
sudo nano /etc/systemd/system/curio.service
# Environment=APP_CORS_ALLOWED_ORIGIN=https://curio-xxxx.pages.dev
sudo systemctl daemon-reload && sudo systemctl restart curio
```

### 2. Google OAuth me prod URL allow karo
[Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → tumhara OAuth client → **Authorized JavaScript origins** me add karo:
- `https://curio-xxxx.pages.dev`

(consent screen agar "Testing" me hai to sirf test-users login kar payenge; sabke liye **Publish** karo.)

---

## Part G — Test karo

1. Browser me apna **Cloudflare URL** kholo → login page aana chahiye.
2. **Create account** (email/password) ya **Continue with Google** → onboarding → Home.
3. Kuch save karo → logout → wapas login → saved items wahi milein (ab Postgres me per-user save ho rahe hain) ✅
4. Phone pe bhi kholo — responsive UI.

### Common errors
| Dikkat | Fix |
| --- | --- |
| Login pe **CORS error** | `APP_CORS_ALLOWED_ORIGIN` me exact Cloudflare URL (https, no trailing slash) + service restart |
| **Mixed content** blocked | Frontend `VITE_API_BASE` HTTPS hona chahiye (duckdns), HTTP nahi |
| Google button kaam nahi | Google Console me Cloudflare URL "Authorized JavaScript origins" me + consent publish |
| `/api/...` **502/timeout** | Backend service down — `sudo systemctl status curio`, `journalctl -u curio -e` |
| DB error on start | `SPRING_DATASOURCE_*` env sahi? Postgres chalu? `sudo systemctl status postgresql` |
| Caddy HTTPS nahi mila | DuckDNS IP sahi? Ports 80/443 VCN + iptables me open? `sudo journalctl -u caddy -e` |

### Update kaise karein (baad me)
- **Frontend**: GitHub pe push → Cloudflare auto re-deploy.
- **Backend**: VM pe `cd app && git pull && cd auth && ./mvnw clean package -DskipTests && sudo systemctl restart curio`

---

Bas! Ye truly-free, always-on, HTTPS setup hai. Kahin atko (koi command error, ya koi status) — exact output bhej dena, main wahin se solve kar dunga. 🚀

