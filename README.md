# CTI RFQ Extractor
**CAN Trading Incorporated — B2B Order Validation Tool**

A sales coordinator pastes any unstructured purchase order (email, Viber, SMS)
and the app extracts structured line items, matches each to CTI's product catalog,
assigns warehouse routing, and flags every gap — so the coordinator reviews
instead of researches.

**Live URL:** [Add Vercel URL here after deploy]

---

## What it does

1. Paste a raw order message in any format
2. AI extracts line items and matches each to CTI's ~1,000-item catalog
3. Each line gets a SKU, price in PHP, and warehouse assignment (A or B)
4. Flags are raised for: unmatched SKU, ambiguous match, missing quantity,
   price mismatch, wrong warehouse
5. Coordinator acknowledges all flags before exporting a clean CSV

**AI capability:** extraction + structuring + gap-flagging using Claude  
**Decision support only** — a human coordinator confirms all output before export

---

## Tech Stack

- **Frontend:** Next.js 16 + Tailwind CSS
- **AI:** Anthropic Claude API (server-side only)
- **Catalog:** CTI XLSX masterlist (~1,000 SKUs, 30 categories)
- **Deploy:** Vercel + GitHub Actions CI/CD

---

## Run locally

**Prerequisites:** Node.js 20+, an Anthropic API key

```bash
# 1. Clone the repo
git clone https://github.com/cleogo/cti-rfq-extractor.git
cd cti-rfq-extractor

# 2. Install dependencies
npm install

# 3. Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env.local

# 4. Start the dev server
npm run dev
```

Open `http://localhost:3000`

---

## Environment variables

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

**Never commit this key.** It lives in `.env.local` locally and in Vercel's
environment variable settings for production.

---

## Run tests

```bash
npm test
```

Or run only the catalog tests:

```bash
npm run test:catalog
```

11 unit tests covering warehouse routing and catalog search.

---

## Project structure

```
cti-rfq-extractor/
├── app/
│   ├── api/extract/route.ts   # Server-side Claude API route
│   ├── page.tsx               # Main coordinator UI
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── catalog.ts             # Loads CTI XLSX catalog (server-only)
│   ├── warehouse.ts           # Deterministic warehouse routing rules
│   ├── types.ts               # Shared TypeScript types
│   └── catalog.test.ts        # Unit tests (11 tests)
├── data/
│   └── CTI_catalog.xlsx       # CTI product masterlist (~1,000 SKUs)
├── .github/workflows/ci.yml   # GitHub Actions — tests on every push
├── .env.local                 # Local API key (never commit)
└── package.json
```

---

## CI/CD

Every push to `main` triggers GitHub Actions:

1. `npm ci` — install dependencies
2. `npm test` — run 11 unit tests
3. `npx tsc --noEmit` — TypeScript type check

Tests use pure logic only — no live Anthropic API calls in CI.