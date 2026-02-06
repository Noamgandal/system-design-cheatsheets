# SD Prep — System Design Cheatsheets

Quick-reference cheat sheets for system design interviews. Mobile-friendly, dark theme, built with React + Vite.

**Live site:** https://noamgandal.github.io/system-design-cheatsheets/

## Cheat Sheets

- **GCP Databases** — Spanner, Bigtable, BigQuery, Cloud SQL, Firestore, Memorystore
  - Quick decision tree for picking the right database
  - Data model, consistency, scaling, latency for each
  - Best for / Not for use cases
  - Key design tips and gotchas
  - Side-by-side comparison table

## Stack

- React 18
- Vite
- GitHub Pages (via Actions)

## Local Development

```bash
npm install
npm run dev
```

## Adding a New Cheat Sheet

1. Create a new component in `src/cheatsheets/` (e.g., `AWSStorage.jsx`)
2. Export it from `src/cheatsheets/index.js`:

```js
import AWSStorage from "./AWSStorage";

export const cheatsheets = [
  { id: "gcp-databases", label: "GCP Databases", component: GCPDatabaseCheatSheet },
  { id: "aws-storage", label: "AWS Storage", component: AWSStorage },
];
```

3. Push to `main` — GitHub Actions will auto-deploy

## Deployment

Automatic via GitHub Actions on push to `main`. See `.github/workflows/deploy.yml`.

## License

MIT
