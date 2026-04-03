# Sourced

Turn this week's Hemköp deals into dinner ideas.

## What it does

1. Fetches live campaign prices from a Hemköp store.
2. Matches deals against a local Swedish recipe database.
3. Suggests recipes ranked by how many key ingredients are on sale.
4. Optionally generates extra inspiration via OpenAI when local matches are few.
5. Links out to ICA, Köket.se and others for the full recipe.

## Quick start

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | AI-generated recipe fallback |
| `SPOONACULAR_API_KEY` | No | Optional external recipe search |

## Project structure

```
app/
  page.tsx              Main UI (deals grid → recipe carousel)
  api/
    deals/route.ts      GET  — live Hemköp campaign scraper
    match/route.ts      POST — local recipe matcher
    generate/route.ts   POST — OpenAI recipe generator
components/
  DealsGrid.tsx         Product card grid with categories
hooks/
  useDeals.ts           Fetch & cache deals
  useRecipeSuggestions  Match → generate pipeline
lib/
  recipe-matcher.ts     Scoring, fuzzy matching, pantry logic
data/
  recipes.json          Curated Swedish recipe database
  pantry.json           Common pantry staples (assumed at home)
types/
  deal.ts, recipe.ts    Shared TypeScript interfaces
```

## Tech stack

Next.js 14 · TypeScript · Tailwind CSS · OpenAI API
