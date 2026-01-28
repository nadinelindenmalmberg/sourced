# Hemköp Recipe Generator

A responsive web app that scrapes Hemköp deals, allows manual selection OR random generation, and creates recipes via OpenAI.

## Features

- **Deal Scraping**: Automatically fetches deals from Hemköp.se
- **Smart Random Selection**: Uses a price heuristic algorithm to select compatible ingredients
  - 1 Main ingredient (price > 40 SEK)
  - 3 Side ingredients (price ≤ 40 SEK)
- **Recipe Generation**: Creates creative recipes using OpenAI GPT-4
- **Manual Selection**: Users can manually select ingredients
- **Visual Feedback**: Highlights randomly selected items with animations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file:
```
OPENAI_API_KEY=your_openai_api_key_here
USE_MOCK_DATA=false  # Set to 'true' to use mock data instead of scraping
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing APIs

### Test the Deals API:
```bash
curl http://localhost:3000/api/deals
```

Or use the test script:
```bash
node test-api.js
```

**Note:** The deals API will automatically fall back to mock data if scraping fails. This ensures the app works even if Hemköp's website structure changes or blocks scraping.

### Test the Generate API:
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"Lövbiff","price":89},{"name":"Paprika","price":15}]}'
```

## API Status

- **Deals API (`/api/deals`)**: 
  - ✅ Returns mock data if scraping fails (50+ items)
  - ⚠️ Real scraping may fail due to Hemköp's dynamic content
  - Check console logs to see which source is used
  
- **Generate API (`/api/generate`)**:
  - ✅ Works with OpenAI API key
  - Requires valid `OPENAI_API_KEY` in `.env.local`

## How It Works

### Phase 1: Deal Scraping
The `/api/deals` endpoint scrapes Hemköp.se for current deals, filters out non-food items, and returns a clean list.

### Phase 2: Smart Randomizer
The `generateRandomSelection()` function:
- Filters out non-food keywords
- Segments items by price (Mains > 40 SEK, Sides ≤ 40 SEK)
- Selects 1 main + 3 sides
- Falls back to 4 random items if no mains available

### Phase 3: Recipe Generation
The `/api/generate` endpoint uses OpenAI to create recipes:
- Uses the most expensive ingredient as the main
- Incorporates other ingredients when possible
- Can omit ingredients that don't fit
- Assumes standard pantry staples

## User Flow

1. User opens the app
2. User clicks "🎲 Chansa!" (Surprise Me)
3. App selects compatible ingredients using the smart algorithm
4. Recipe is automatically generated
5. User can click "Chansa!" again for a new selection

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API
