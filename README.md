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
git clone https://github.com/YOUR-USERNAME/cti-rfq-extractor.git
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
npx jest --no-coverage
```

11 unit tests covering warehouse routing and catalog search.

---

## Project structure