# RegiNor Deployment Guide - cPanel med NVM

## Status: Node.js 18.20.8 installert via NVM ✅

---

## Oversikt

- **Prod:** reginor.events
- **Stage:** stage.reginor.events  
- **Server:** cPanel med LiteSpeed, Node.js via NVM
- **Database:** Supabase (separate prosjekter for stage/prod)

---

## 1. Forberedelser

### A. Supabase: Opprett separate prosjekter

1. Gå til [supabase.com](https://supabase.com)
2. Opprett to prosjekter:
   - `reginor-stage`
   - `reginor-prod`
3. Noter ned for hvert prosjekt:
   - `DIRECT_URL` (database connection string)
   - `DATABASE_URL` (Supabase connection pooler)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### B. Stripe: Test og Prod keys

**Stage (bruk test mode):**
- `STRIPE_SECRET_KEY` (test key: `sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key: `pk_test_...`)

**Prod (bruk live mode):**
- `STRIPE_SECRET_KEY` (live key: `sk_live_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live key: `pk_live_...`)

### C. Email (Brevo)

Samme API key kan brukes for både stage og prod, MEN:
- Sett `NODE_ENV=development` for stage
- Sett `NODE_ENV=production` for prod

---

## 2. Server struktur

```
~/
├── reginor-prod/          # Produksjon
│   ├── apps/
│   │   └── web/
│   └── packages/
├── reginor-stage/         # Stage
│   ├── apps/
│   │   └── web/
│   └── packages/
└── public_html/
    └── index.html         # Landing page (allerede oppe)
```

---

## 3. Deploy Stage (steg-for-steg)

### SSH inn
```bash
ssh dilequac@reginor.events
```

### Sjekk at NVM er aktivt
```bash
node --version  # Skal vise v18.20.8
```

Hvis ikke:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18
```

### Opprett stage-mappe
```bash
cd ~
mkdir -p reginor-stage
cd reginor-stage
```

### Klon repo (ELLER last opp via FTP)

**Alternativ 1: Git (anbefalt)**
```bash
git clone https://github.com/limekex/salsanor-tickets.git .
git checkout vscode-dev  # eller main
```

**Alternativ 2: FTP**
- Last opp alle filer unntatt `node_modules/`, `.next/`
- Via FTP klient (FileZilla, Cyberduck) til `~/reginor-stage/`

### Installer dependencies
```bash
cd ~/reginor-stage

# Installer Turborepo globalt hvis nødvendig
npm install -g turbo

# Installer alle dependencies (monorepo)
npm install

# Eller spesifikt for web-appen
cd apps/web
npm install
```

### Opprett .env.local for stage
```bash
cd ~/reginor-stage/apps/web
nano .env.local
```

Lim inn:
```env
# Environment
NODE_ENV=development

# Database (Supabase STAGE)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase (STAGE project)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Stripe (TEST MODE)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Brevo)
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="noreply@reginor.events"

# App URL
NEXT_PUBLIC_APP_URL="https://stage.reginor.events"

# Auth (generer nye secrets)
AUTH_SECRET="generer-med-openssl-rand-base64-32"
```

Lagre: `Ctrl+O`, `Enter`, `Ctrl+X`

### Generer Prisma Client
```bash
cd ~/reginor-stage/packages/database
npx prisma generate
```

### Kjør migrasjoner (første gang)
```bash
npx prisma migrate deploy
```

### Bygg Next.js
```bash
cd ~/reginor-stage/apps/web
npm run build
```

### Test at det fungerer
```bash
npm run start
```

Hvis serveren starter uten errors, stopp med `Ctrl+C`.

---

## 4. Sett opp PM2 (holder appen kjørende)

### Installer PM2
```bash
npm install -g pm2
```

### Opprett PM2 ecosystem fil
```bash
cd ~/reginor-stage/apps/web
nano ecosystem.config.js
```

Lim inn:
```javascript
module.exports = {
  apps: [
    {
      name: 'reginor-stage',
      cwd: '/home/dilequac/reginor-stage/apps/web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'development',
        PORT: 3001  // Stage port
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    }
  ]
};
```

### Start med PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Følg instruksjonene hvis du får en kommando
```

### Sjekk status
```bash
pm2 status
pm2 logs reginor-stage
```

---

## 5. Konfigurer subdomain (stage.reginor.events)

### I cPanel

1. **Logg inn på cPanel**
2. **Gå til "Domains" → "Subdomains"**
3. **Opprett subdomain:**
   - Subdomain: `stage`
   - Document root: `/home/dilequac/public_html/stage`
4. **Klikk "Create"**

### Sett opp Reverse Proxy

1. **cPanel → "Setup Node.js App"**
2. **Create Application:**
   - Node.js version: **16.20.2** (viktig: velg en, men vi bruker NVM uansett)
   - Application mode: Development
   - Application root: `/home/dilequac/reginor-stage/apps/web`
   - Application URL: `stage.reginor.events`
   - Application startup file: (la stå tom, vi bruker PM2)

3. **ELLER sett opp .htaccess reverse proxy manuelt:**

```bash
cd ~/public_html/stage
nano .htaccess
```

Lim inn:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*)           ws://localhost:3001/$1 [P,L]
RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule /(.*)           http://localhost:3001/$1 [P,L]

ProxyPreserveHost On
ProxyPass / http://localhost:3001/
ProxyPassReverse / http://localhost:3001/
```

---

## 6. Deploy Production (samme prosess)

### Opprett prod-mappe
```bash
cd ~
mkdir -p reginor-prod
cd reginor-prod
```

### Klon repo
```bash
git clone https://github.com/limekex/salsanor-tickets.git .
git checkout main  # Prod kjører main branch
```

### Installer dependencies
```bash
npm install
cd apps/web
npm install
```

### Opprett .env.local for prod
```bash
cd ~/reginor-prod/apps/web
nano .env.local
```

```env
# Environment
NODE_ENV=production

# Database (Supabase PROD)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase (PROD project)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Stripe (LIVE MODE)
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Brevo)
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="noreply@reginor.events"

# App URL
NEXT_PUBLIC_APP_URL="https://reginor.events"

# Auth
AUTH_SECRET="generer-en-ny-for-prod"
```

### Bygg og start
```bash
cd ~/reginor-prod/packages/database
npx prisma generate
npx prisma migrate deploy

cd ~/reginor-prod/apps/web
npm run build
```

### PM2 config for prod
```bash
cd ~/reginor-prod/apps/web
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'reginor-prod',
      cwd: '/home/dilequac/reginor-prod/apps/web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000  // Prod port
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    }
  ]
};
```

### Start prod
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Sett opp reverse proxy for main domain

```bash
cd ~/public_html
nano .htaccess
```

```apache
# Hvis NOT stage subdomain, proxy til prod app
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteCond %{HTTP_HOST} !^stage\. [NC]
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*)           ws://localhost:3000/$1 [P,L]

RewriteCond %{HTTP_HOST} !^stage\. [NC]
RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule /(.*)           http://localhost:3000/$1 [P,L]

ProxyPreserveHost On
```

---

## 7. Vedlikehold og oppdateringer

### Oppdatere stage
```bash
cd ~/reginor-stage
git pull origin vscode-dev
npm install
cd apps/web
npm run build
pm2 restart reginor-stage
```

### Oppdatere prod
```bash
cd ~/reginor-prod
git pull origin main
npm install
cd apps/web
npm run build
pm2 restart reginor-prod
```

### Sjekk logger
```bash
pm2 logs reginor-stage --lines 100
pm2 logs reginor-prod --lines 100
```

### Restart alt
```bash
pm2 restart all
```

---

## 8. Robots.txt for stage

```bash
cd ~/public_html/stage
nano robots.txt
```

```
User-agent: *
Disallow: /
```

---

## Feilsøking

### PM2 prosess stopper
```bash
pm2 logs <app-name>
pm2 restart <app-name>
```

### Port allerede i bruk
```bash
lsof -i :3000
kill -9 <PID>
pm2 restart reginor-prod
```

### Database connection issues
```bash
cd ~/reginor-<env>/packages/database
npx prisma studio  # Test DB connection
```

### NVM ikke aktivt etter reboot
Legg til i `~/.bashrc`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18
```

---

## Alternativ: Vercel (enklere)

Hvis cPanel deployment blir for kompleks:
- Deploy til Vercel i stedet
- Behold cPanel kun for landing page
- Automatisk stage/prod via git branches
- Gratis for hobby-prosjekter

Se `VERCEL_DEPLOYMENT.md` for guide.
