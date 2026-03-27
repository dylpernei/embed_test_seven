# Brilliant Earth — Sigma Embed Portal
## Deployment Guide

---

## What You Have

```
brilliantearth/          ← GitHub Pages portal (the branded website)
  index.html             ← Full Brilliant Earth-branded portal
  app.js                 ← Embed loader (update WORKER_URL after Step 2)
  styles/                ← (empty — fonts served via Google Fonts CDN)
  images/                ← (empty — no local images needed)

brilliantearth-worker/   ← Cloudflare Worker (JWT signer)
  index.js               ← Worker source
  wrangler.toml          ← Worker config (non-secret vars already filled)
  package.json
```

---

## Step 1 — Deploy the Cloudflare Worker

```bash
cd brilliantearth-worker

# Install wrangler
npm install

# Log in to Cloudflare (opens browser)
npx wrangler login

# Set secrets (never committed to source)
echo "<your-client-id>" | npx wrangler secret put CLIENT_ID
echo "<your-embed-secret>" | npx wrangler secret put EMBED_SECRET

# Deploy
npx wrangler deploy
```

**Copy the Worker URL** from the deploy output — it looks like:
```
https://brilliantearth-embed-jwt.<your-account>.workers.dev
```

---

## Step 2 — Update app.js with Worker URL

Open `brilliantearth/app.js` and replace:
```
const API_URL = 'WORKER_URL_PLACEHOLDER';
```
with:
```
const API_URL = 'https://brilliantearth-embed-jwt.<your-account>.workers.dev';
```

---

## Step 3 — Push to GitHub Pages

```bash
# One-time: create the repo (if it doesn't exist)
gh repo create <your-github-user>/sigma-embed-portals \
  --public \
  --description "Sigma Computing embed portals for prospect demos"

# Clone (or pull if it already exists)
cd /tmp
git clone https://github.com/<your-github-user>/sigma-embed-portals.git
cd sigma-embed-portals

# Enable GitHub Pages (one-time)
gh api repos/<your-github-user>/sigma-embed-portals/pages \
  -X POST \
  -f "source[branch]=main" \
  -f "source[path]=/"

# Copy portal files
cp -r /path/to/brilliantearth/ ./brilliantearth/

# Push
git add brilliantearth/
git commit -m "Add Brilliant Earth embed portal"
git push
```

Wait ~60 seconds, then your portal is live at:
```
https://<your-github-user>.github.io/sigma-embed-portals/brilliantearth/
```

---

## Step 4 — Verify & Share

Test it:
```bash
curl -sL -o /dev/null -w "%{http_code}" \
  "https://<your-github-user>.github.io/sigma-embed-portals/brilliantearth/"
```
Should return `200`. Open in browser and confirm the Sigma embed loads.

Share with the prospect:
```
https://<your-github-user>.github.io/sigma-embed-portals/brilliantearth/
```

---

## Pre-flight Checklist

Before sharing, confirm in Sigma:
- [ ] Embed credentials created (Client ID + Secret used above)
- [ ] Team `all_clients_team` exists in Sigma
- [ ] Team `all_clients_team` has access to the workbook
- [ ] Workbook is published

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "You don't have permission" | Team doesn't have workbook access in Sigma |
| Loading spinner never stops | Check browser console for CORS errors; verify Worker URL in app.js |
| Page is unstyled | Google Fonts CDN blocked? Try on a different network |
| 404 on GitHub Pages | Pages not enabled, or push didn't trigger build yet — wait 2 min |

---

## Architecture

```
Browser → GitHub Pages (index.html + app.js)
              ↓ fetch()
         Cloudflare Worker (signs JWT with EMBED_SECRET + CLIENT_ID)
              ↓ {url: signed_sigma_url}
         Sigma Computing embed (loaded in iframe)
```

Credentials **never** touch the browser. The Worker signs each JWT server-side.
