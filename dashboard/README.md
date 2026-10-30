# Operations Control Tower — dashboard

A static React dashboard for monitoring field deployments. It flags delays, photo deficits, timestamp drift,
out-of-sequence checkpoints and PoC issues.

It holds **no data**. Sites come from a companion browser extension, which sends them into the page from the
user's own browser, or from a CSV / JSON file imported in **Import / Sync**. Everything stays in that browser's
local storage.

## Develop

```bash
cd dashboard
npm install
npm run dev      # http://localhost:5173
npm run build    # dashboard/dist
```

Business rules (photo target, delay thresholds, regions) are in `src/lib/config.js`. Theme colours are in
`src/index.css`.

## Deploy

`.github/workflows/deploy-dashboard.yml` builds and publishes to GitHub Pages on every push to `main` that
touches `dashboard/`. In the repo's Settings → Pages, set **Source** to **GitHub Actions** once.
