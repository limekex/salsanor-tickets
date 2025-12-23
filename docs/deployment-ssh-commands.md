# SSH Commands for Node.js på webhotell

## 1. Sjekke Node.js versjon

```bash
# Logg inn via SSH først
ssh brukernavn@reginor.events

# Sjekk hvilken Node.js versjon som kjører
node --version

# Sjekk hvor Node.js er installert
which node

# Sjekk tilgjengelige versjoner (hvis cPanel Node.js selector)
ls -la /opt/alt/
```

## 2. For cPanel med Node.js Selector

cPanel's Node.js selector håndteres vanligvis via web-interface (ikke SSH).
Du har sannsynligvis allerede sett dette i ditt screenshot.

Versjonene du så:
- 12.22.9
- 14.21.2  
- 16.20.2

**Problem:** Next.js 16 krever Node.js 18.18+

## 3. Sjekke om nyere versjoner finnes

```bash
# Sjekk om flere versjoner er tilgjengelig
ls -la /opt/alt/ | grep nodejs

# Eller
cloudlinux-selector --list nodejs
```

## 4. Serveren har kun Node.js 6, 8, 9, 10, 11, 12, 14, 16

**Problem:** Next.js 16 krever minimum Node.js 18.18.0

## 5. Løsninger

### Alternativ A: Installer Node.js 18+ via NVM (TEST DETTE FØRST)
```bash
# Installer nvm i din bruker-mappe (krever ikke root)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Last inn nvm (eller logout/login på nytt)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verifiser nvm fungerer
nvm --version

# Installer Node.js 18 LTS
nvm install 18

# Sett som default
nvm alias default 18

# Verifiser
node --version  # Skal vise v18.x.x

# Test npm
npm --version
```

**Hvis dette fungerer:**
```bash
# Gå til app-mappen og test
cd ~/public_html/reginor.events  # eller der du skal ha appen
npm install
npm run build
```

### Alternativ B: Kontakt webhotell support
```
Hei,

Jeg trenger Node.js versjon 18.18.0 eller nyere for å kjøre Next.js 16.
Jeg ser at serveren kun har Node.js opp til versjon 16.

Kan dere:
1. Legge til Node.js 18.x eller 20.x i Node.js Selector?
2. Eller bekrefte at jeg kan bruke NVM for min bruker?

Mvh
```

### Alternativ C: Deploy til Vercel (ANBEFALT)

**Fordeler:**
- ✅ Node.js 18+ automatisk
- ✅ Gratis for hobby-prosjekter  
- ✅ Automatisk stage/prod via git branches
- ✅ Deploy på 10 minutter
- ✅ Ingen server-administrasjon

**Ulemper med cPanel shared hosting for Next.js:**
- ❌ Node.js versjon for gammel
- ❌ Long-running prosesser ofte begrenset
- ❌ PM2/process manager kan være ustabilt
- ❌ Manuell deployment hver gang

**Anbefaling:** Bruk Vercel for Next.js appen, behold cPanel for landing page.

## 5. Test Node.js versjon for din app

```bash
# Gå til app-mappen
cd ~/reginor.events/

# Sjekk om npm fungerer
npm --version

# Test om Next.js kan kjøre (krever Node.js 18+)
npx next --version
```

## 6. PM2 for persistent prosess (kreves for Next.js)

```bash
# Installer PM2 globalt
npm install -g pm2

# Start Next.js med PM2
pm2 start npm --name "reginor-prod" -- start

# Auto-start ved server reboot
pm2 startup
pm2 save

# Sjekk status
pm2 status

# Se logger
pm2 logs reginor-prod
```

## Viktig for cPanel/Shared Hosting

De fleste shared hosting har begrensninger:
- ❌ Kan ikke installere global system-pakker
- ❌ Begrenset tilgang til å kjøre long-running prosesser
- ❌ Ofte bare de pre-installerte Node.js versjonene

**Anbefaling:** Kontakt support først, eller vurder Vercel for enklere deployment.
