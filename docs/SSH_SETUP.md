# SSH Setup for GitHub Actions & Deployment

## Generere SSH nøkler

### 1. På din lokale maskin

```bash
# Generer et nytt SSH key-par for deployment
ssh-keygen -t ed25519 -C "github-actions-reginor-deploy" -f ~/.ssh/reginor_deploy

# Dette genererer:
# - ~/.ssh/reginor_deploy (private key) - HEMMELIG
# - ~/.ssh/reginor_deploy.pub (public key) - kan deles
```

### 2. Kopier public key til serveren

#### Alternativ A: Via cPanel (Enklest anbefalt)

1. **Hent public key:**
   ```bash
   cat ~/.ssh/reginor_deploy.pub
   ```
   Kopier hele outputen (starter med `ssh-ed25519 AAAA...`)

2. **Logg inn på cPanel**

3. **Gå til: Security → SSH Access → Manage SSH Keys**

4. **Klikk "Import Key"**
   - **Name:** `github-reginor-deploy` (eller valgfritt navn)
   - **Public Key:** [lim inn public key fra steg 1]
   - **Private Key:** [la stå tom - vi beholder private key lokalt]
   - Klikk **"Import"**

5. **Autorisér nøkkelen:**
   - I listen over keys, finn nøkkelen du nettopp la til
   - Klikk **"Manage"** → **"Authorize"**
   - Dette legger nøkkelen til i `~/.ssh/authorized_keys`

#### Alternativ B: Via kommandolinje

```bash
# Kopier public key til server (krever passord første gang)
ssh-copy-id -i ~/.ssh/reginor_deploy.pub dilequac@reginor.events

# Eller helt manuelt:
cat ~/.ssh/reginor_deploy.pub
# SSH til server, og legg til i ~/.ssh/authorized_keys
```

### 3. Test SSH connection

```bash
# Test med private key
ssh -i ~/.ssh/reginor_deploy dilequac@reginor.events

# Hvis det fungerer, er du klar!
```

---

## GitHub Repository Secrets

Gå til GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Stage Secrets

```
STAGE_SSH_HOST = cpanel34.proisp.no
STAGE_SSH_USERNAME = dilequac
STAGE_SSH_PORT = 22
STAGE_SSH_PRIVATE_KEY = [Innholdet av ~/.ssh/reginor_deploy]

# Supabase Stage
STAGE_SUPABASE_URL = https://zmfvwmmchiehnqhwsgkt.supabase.co
STAGE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGE_SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Stage
STAGE_DATABASE_URL = postgresql://postgres.zmfvwmmchiehnqhwsgkt:jbU3K*5tmyh!F+a@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
STAGE_DIRECT_URL = postgresql://postgres.zmfvwmmchiehnqhwsgkt:jbU3K*5tmyh!F+a@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

# Stripe Test Mode
STAGE_STRIPE_SECRET_KEY = sk_test_51ShWPoRLmY3ybdGt...
STAGE_STRIPE_PUBLISHABLE_KEY = pk_test_51ShWPoRLmY3ybdGt...

# Brevo
STAGE_BREVO_API_KEY = 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
BREVO_SENDER_EMAIL = noreply@reginor.events

# Auth
STAGE_AUTH_SECRET = T0RUniI7mz3YB0LVeyDnOxlBZFOoU/8SZxViR8r6eU0=
```

### Production Secrets

```
PROD_SSH_HOST = cpanel34.proisp.no
PROD_SSH_USERNAME = dilequac
PROD_SSH_PORT = 22
PROD_SSH_PRIVATE_KEY = [Samme som stage, eller generer et nytt]

# Supabase Production
PROD_SUPABASE_URL = https://wdepcyyzjuavsbkrdeax.supabase.co
PROD_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Production (URL-encoded password!)
PROD_DATABASE_URL = postgresql://postgres.wdepcyyzjuavsbkrdeax:JRpa%23%2BY9%3Fy9CgUD@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
PROD_DIRECT_URL = postgresql://postgres.wdepcyyzjuavsbkrdeax:JRpa%23%2BY9%3Fy9CgUD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

# Stripe Live Mode
PROD_STRIPE_SECRET_KEY = sk_live_51ShWPgRKHhiQiWUj...
PROD_STRIPE_PUBLISHABLE_KEY = pk_live_51ShWPgRKHhiQiWUj...

# Brevo
PROD_BREVO_API_KEY = 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

# Auth
PROD_AUTH_SECRET = jzHCiMYgdGrYGbiOaBXZ9uGiiw57JLg3WyS7ktF4egc=
```

---

## Hvordan legge til SSH Private Key i GitHub

1. **Les private key:**
   ```bash
   cat ~/.ssh/reginor_deploy
   ```

2. **Kopier HELE outputen** (inkludert `-----BEGIN OPENSSH PRIVATE KEY-----` og `-----END OPENSSH PRIVATE KEY-----`)

3. **I GitHub:**
   - Gå til repo → Settings → Secrets → New repository secret
   - Name: `STAGE_SSH_PRIVATE_KEY`
   - Value: [lim inn hele private key]
   - Klikk "Add secret"

4. **Gjør det samme for prod** (kan bruke samme key)

---

## Lokal deployment (uten GitHub Actions)

### Gjør scripts kjørbare

```bash
chmod +x scripts/deploy-stage.sh
chmod +x scripts/deploy-prod.sh
```

### Deploy stage lokalt

```bash
./scripts/deploy-stage.sh
```

### Deploy prod lokalt

```bash
./scripts/deploy-prod.sh
```

**Merk:** Lokale scripts forutsetter at du har SSH-tilgang allerede satt opp.

---

## Første gangs server-setup

Før GitHub Actions eller scripts fungerer, må appene være satt opp på serveren:

### SSH til server
```bash
ssh dilequac@cpanel34.proisp.no
```

### Setup Stage

```bash
# Naviger til home
cd ~

# Klon repo
git clone https://github.com/limekex/salsanor-tickets.git stage.reginor.events
cd stage.reginor.events
git checkout vscode-dev

# Opprett .env filer
cd apps/web
nano .env.local  # Lim inn fra apps/web/.env.stage

cd ~/stage.reginor.events/packages/database
nano .env  # Lim inn fra packages/database/.env.stage

# Installer dependencies
cd ~/stage.reginor.events
npm install
cd apps/web && npm install

# Generer Prisma
cd ~/stage.reginor.events/packages/database
npx prisma generate

# Bygg app
cd ~/stage.reginor.events/apps/web
npm run build

# Start med PM2
pm2 start npm --name "reginor-stage" -- start
pm2 save
```

### Setup Prod

Samme prosess, men:
- Mappe: `~/reginor-events.dileque.no`
- Branch: `main`
- .env filer: bruk prod-verdier
- PM2 navn: `reginor-prod`

---

## Workflow

### Med GitHub Actions (automatisk)

1. **Stage:** Push til `vscode-dev` → automatisk deploy til stage
2. **Prod:** Push til `main` → automatisk deploy til prod

### Manuelt (med scripts)

1. **Stage:**
   ```bash
   git push origin vscode-dev
   ./scripts/deploy-stage.sh
   ```

2. **Prod:**
   ```bash
   git push origin main
   ./scripts/deploy-prod.sh
   ```

---

## Sikkerhet

✅ **Private key:** ALDRI commit til Git  
✅ **GitHub Secrets:** Kryptert, kun GitHub Actions ser dem  
✅ **Server:** Public key i `~/.ssh/authorized_keys`  
✅ **Brannmur:** Sørg for at SSH port 22 er åpen  
✅ **Passordløs SSH:** Kun key-based authentication  

---

## Troubleshooting

### SSH connection refused
```bash
# Sjekk at SSH service kjører på server
ssh dilequac@reginor.events
sudo systemctl status sshd
```

### Permission denied (publickey)
```bash
# Sjekk at public key er på serveren
ssh dilequac@reginor.events
cat ~/.ssh/authorized_keys  # Skal inneholde din public key
```

### GitHub Actions fails
- Gå til repo → Actions → klikk på failed run
- Se logs for error message
- Sjekk at alle secrets er satt riktig

---

## Neste steg

1. ✅ Generer SSH keys
2. ✅ Legg til public key på server
3. ✅ Legg til secrets i GitHub
4. ✅ Utfør første manuelle setup på server
5. ✅ Test deploy med scripts
6. ✅ Enable GitHub Actions
7. ✅ Deploy stage ved push til vscode-dev
8. ✅ Test på stage
9. ✅ Merge til main → automatisk prod deploy
