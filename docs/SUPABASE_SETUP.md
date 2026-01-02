# Supabase Setup: Dev → Stage → Prod

## Din nåværende situasjon

Du har allerede:
- ✅ Lokal dev med Supabase
- ✅ Prisma schema definert
- ✅ Migrasjoner i `packages/database/prisma/migrations/`

## Mål

Opprette:
- **Stage:** Testmiljø med test-data
- **Prod:** Live miljø med ekte medlemmer

---

## Steg 1: Opprett nye Supabase prosjekter

### Gå til Supabase Dashboard

1. Logg inn på [app.supabase.com](https://app.supabase.com)
2. Klikk **"New Project"**

### Opprett Stage-prosjekt

**Project name:** `reginor-stage`  
**Database password:** [generer et sterkt passord] jbU3K*5tmyh!F+a 
**Region:** North Europe (Germany) - nærmest Norge  
**Pricing plan:** Free tier

Vent til prosjektet er opprettet (~2 min).

### Opprett Prod-prosjekt

**Project name:** `reginor-prod`  
**Database password:** [generer et ANNET sterkt passord]  JRpa#+Y9?y9CgUD
**Region:** North Europe (Germany)  
**Pricing plan:** Free tier (oppgrader senere ved behov)

---

## Steg 2: Hent connection strings

For **HVERT prosjekt** (stage og prod):

### Gå til Project Settings → Database

**Du trenger 2 URLs:**

#### 1. DATABASE_URL (Connection Pooler - anbefalt for serverless)
```
Settings → Database → Connection string → URI → Transaction mode
```
Ser slik ut:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
Stage:
postgresql://postgres.zmfvwmmchiehnqhwsgkt:[YOUR-PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres

Prod:
postgresql://postgres.wdepcyyzjuavsbkrdeax:[YOUR-PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres

#### 2. DIRECT_URL (Direct connection - for migrasjoner)
```
Settings → Database → Connection string → URI → Session mode
```
Ser slik ut:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

Stage: postgresql://postgres.zmfvwmmchiehnqhwsgkt:[YOUR-PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

Prod: postgresql://postgres.wdepcyyzjuavsbkrdeax:[YOUR-PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

### Hent Supabase API keys

```
Settings → API → Project URL
prod: https://wdepcyyzjuavsbkrdeax.supabase.co
stage: https://zmfvwmmchiehnqhwsgkt.supabase.co

Settings → API → anon public key
prod: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZXBjeXl6anVhdnNia3JkZWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjcwNDIsImV4cCI6MjA4MjAwMzA0Mn0.Prlqm46Pa4LEF7j5pJyCH4VcNuXxiTR38J9SR8JY15Y

stage: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZnZ3bW1jaGllaG5xaHdzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzcxNTgsImV4cCI6MjA4MjAxMzE1OH0.hjAM71a7s7_tGC2uETb4SMTP9Efa4waRmv3JJCLcrVU

Settings → API → service_role key (secret)
prod: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZXBjeXl6anVhdnNia3JkZWF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQyNzA0MiwiZXhwIjoyMDgyMDAzMDQyfQ.za6p59hnKOO-Hjrn-rtDWAySoUa5fQg_Y-rP6D3PXT4

stage: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZnZ3bW1jaGllaG5xaHdzZ2t0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQzNzE1OCwiZXhwIjoyMDgyMDEzMTU4fQ.kJBb76z6xCzBhbicYtrMGZakCGvWXwYoTrfqEdOvYcA
```

---

## Steg 3: Kjør migrasjoner til Stage

### På din lokale maskin

```bash
cd "/Users/bjorn-torealmas/Documents/GIT/SalsaNor Tickets/packages/database"

# Opprett midlertidig .env for stage
nano .env.stage
```

Lim inn (med stage credentials):
```env
DATABASE_URL="postgresql://postgres.[STAGE_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[STAGE_REF]:[PASSWORD]@db.[STAGE_REF].supabase.co:5432/postgres"
```

### Deploy migrasjoner til stage
```bash
# Deploy alle eksisterende migrasjoner
npx dotenv -e .env.stage -- npx prisma migrate deploy

# Eller hvis du ikke har dotenv-cli:
DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
```

### Seed initial data (valgfritt)
```bash
# Hvis du har en seed-fil
npx dotenv -e .env.stage -- npx prisma db seed
```

---

## Steg 4: Kjør migrasjoner til Prod

```bash
cd "/Users/bjorn-torealmas/Documents/GIT/SalsaNor Tickets/packages/database"

# Opprett .env for prod
nano .env.prod
```

Lim inn (med prod credentials):
```env
DATABASE_URL="postgresql://postgres.[PROD_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROD_REF]:[PASSWORD]@db.[PROD_REF].supabase.co:5432/postgres"
```

### Deploy migrasjoner til prod
```bash
npx dotenv -e .env.prod -- npx prisma migrate deploy
```

**IKKE seed prod med test-data!**

---

## Steg 5: Sett opp Row Level Security (RLS) i Supabase

Supabase krever RLS policies for sikkerhet.

### For hvert prosjekt (stage og prod):

1. Gå til **Table Editor** i Supabase dashboard
2. For hver tabell:
   - Klikk **RLS** toggle
   - Klikk **"Add Policy"**

### Eksempel policies (tilpass etter behov):

#### Users table
```sql
-- Enable RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data" ON "User"
  FOR SELECT
  USING (auth.uid()::text = "supabaseUid");

-- Policy: Service role can do anything (for backend)
CREATE POLICY "Service role full access" ON "User"
  USING (auth.jwt()->>'role' = 'service_role');
```

#### Organizations (public read for discovery)
```sql
ALTER TABLE "Organizer" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active organizers" ON "Organizer"
  FOR SELECT
  USING (true);

CREATE POLICY "Service role full access" ON "Organizer"
  USING (auth.jwt()->>'role' = 'service_role');
```

#### Registrations (restricted)
```sql
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations" ON "Registration"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = "Registration"."userId"
      AND "User"."supabaseUid" = auth.uid()::text
    )
  );

CREATE POLICY "Service role full access" ON "Registration"
  USING (auth.jwt()->>'role' = 'service_role');
```

**Merk:** Du bruker `SUPABASE_SERVICE_ROLE_KEY` i backend for å omgå RLS.

---

## Steg 6: Oppdater environment variables

### Stage (.env.local på serveren)

```env
# Database (STAGE)
DATABASE_URL="postgresql://postgres.[STAGE_REF]:..."
DIRECT_URL="postgresql://postgres.[STAGE_REF]:..."

# Supabase (STAGE)
NEXT_PUBLIC_SUPABASE_URL="https://[STAGE_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."
SUPABASE_SERVICE_ROLE_KEY="eyJhb..."

# Stripe TEST MODE
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App URL
NEXT_PUBLIC_APP_URL="https://stage.reginor.events"
NODE_ENV=development
```

### Prod (.env.local på serveren)

```env
# Database (PROD)
DATABASE_URL="postgresql://postgres.[PROD_REF]:..."
DIRECT_URL="postgresql://postgres.[PROD_REF]:..."

# Supabase (PROD)
NEXT_PUBLIC_SUPABASE_URL="https://[PROD_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."
SUPABASE_SERVICE_ROLE_KEY="eyJhb..."

# Stripe LIVE MODE
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# App URL
NEXT_PUBLIC_APP_URL="https://reginor.events"
NODE_ENV=production
```

---

## Steg 7: Test forbindelsen

### Fra lokal maskin (test stage)

```bash
cd packages/database

# Kjør Prisma Studio mot stage
npx dotenv -e .env.stage -- npx prisma studio
```

Sjekk at du ser alle tabellene i browseren (http://localhost:5555).

### Fra serveren (når deployet)

```bash
ssh dilequac@reginor.events

cd ~/reginor-stage/packages/database

# Test database connection
npx prisma db execute --stdin <<< "SELECT current_database(), current_user;"
```

---

## Steg 8: Opprett admin-bruker

### Stage

```bash
# På serveren, i stage-mappen
cd ~/reginor-stage/packages/database

# Kjør admin-grant script
node scripts/grant-admin.ts "din-epost@example.com"
```

### Prod (senere)

Samme prosess når prod er live.

---

## Vedlikehold

### Nye migrasjoner

Når du lager nye migrasjoner lokalt:

```bash
# Lokal dev
cd packages/database
npx prisma migrate dev --name add_new_feature

# Deploy til stage
npx dotenv -e .env.stage -- npx prisma migrate deploy

# Test på stage...

# Deploy til prod (når klar)
npx dotenv -e .env.prod -- npx prisma migrate deploy
```

### Database backup

Supabase har automatisk backup, men du kan også:

```bash
# Eksporter data fra stage
pg_dump "postgresql://..." > stage-backup.sql

# Importer til lokal dev
psql "postgresql://localhost:5432/reginor" < stage-backup.sql
```

---

## Sikkerhet

### RLS Policies
- ✅ Alle tabeller bør ha RLS enabled
- ✅ Backend bruker `service_role` key (omgår RLS)
- ✅ Frontend bruker `anon` key (følger RLS)

### Secrets
- ❌ Aldri commit `.env.stage` eller `.env.prod`
- ✅ Legg til i `.gitignore`
- ✅ Bruk environment variables på server

### Database passwords
- ✅ Bruk sterke, unike passwords for stage og prod
- ✅ Lagre i passordhåndterer

---

## Sjekkliste

- [ ] Stage Supabase prosjekt opprettet
- [ ] Prod Supabase prosjekt opprettet
- [ ] Connection strings hentet for begge
- [ ] Migrasjoner deployet til stage
- [ ] Migrasjoner deployet til prod
- [ ] RLS policies satt opp
- [ ] `.env.stage` opprettet lokalt
- [ ] `.env.prod` opprettet lokalt
- [ ] Test connection til begge databaser
- [ ] Admin-bruker opprettet i stage

---

## Neste steg

Når Supabase er klar:
1. Deploy stage-appen til `stage.reginor.events` (se DEPLOYMENT_GUIDE.md)
2. Test grundig på stage
3. Deploy prod-appen til `reginor.events`
