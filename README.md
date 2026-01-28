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
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

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
