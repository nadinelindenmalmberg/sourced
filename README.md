# Matfynd 🍳

**Smart recipe recommendations based on real grocery deals**

Matfynd fetches actual promotions from Swedish grocery stores (starting with Hemköp Linnégatan) via the [Tjek API](https://api.tjek.com) and suggests delicious recipes based on what's on sale.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC)

## Features

- 🔄 **Real-time Prices**: Fetches actual deals from Hemköp via the Tjek API
- 📷 **OCR Upload**: Alternative: upload store flyers for automatic text extraction
- 📝 **Manual Entry**: Type or paste deals manually if needed
- 🍽️ **Smart Recipes**: Get recipe recommendations that maximize your savings
- 💰 **Savings Calculator**: See estimated savings for each recipe
- 🇸🇪 **Swedish Support**: Optimized for Swedish grocery stores and language

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Fetching Real Deals

The app uses the **Tjek API** to fetch actual grocery deals:

```typescript
// API endpoints used:
// 1. Get active catalogs for a store
GET https://api.tjek.com/v2/catalogs?dealer_id=d9b6XA&store_external_ids=4547

// 2. Get offers from a catalog  
GET https://api.tjek.com/v2/offers?publication_ids={catalog_id}
```

**Store IDs:**
- Hemköp Linnégatan: `4547`
- Hemköp dealer ID: `d9b6XA`

### Python Script (Alternative)

If you want to fetch deals via Python:

```python
import requests

def get_hemkop_offers(store_id="4547"):
    # Get catalogs
    catalog_url = "https://api.tjek.com/v2/catalogs"
    params = {
        "dealer_id": "d9b6XA",
        "store_external_ids": store_id,
        "order_by": "-valid_from",
        "limit": 1
    }
    
    catalogs = requests.get(catalog_url, params=params).json()
    
    if not catalogs:
        return []
    
    catalog_id = catalogs[0]['id']
    
    # Get offers
    offers_url = "https://api.tjek.com/v2/offers"
    offers_params = {
        "publication_ids": catalog_id,
        "limit": 100
    }
    
    return requests.get(offers_url, params=offers_params).json()
```

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/deals/          # Server-side API route
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page
├── components/             # React components
│   ├── Header.tsx          # App header with store info
│   ├── DealCard.tsx        # Individual deal display
│   ├── DealsList.tsx       # Deals grid with filtering
│   ├── RecipeCard.tsx      # Recipe with expandable details
│   ├── RecipesList.tsx     # Recipe recommendations
│   └── FlyerUpload.tsx     # OCR-based flyer upload
├── lib/                    # Utilities and logic
│   ├── hemkop-api.ts       # Server-side Tjek API client
│   ├── hemkop-client.ts    # Browser-side Tjek API client
│   ├── store.ts            # Zustand state management
│   ├── ocr.ts              # Tesseract.js OCR processing
│   ├── recipes.ts          # Recipe database & matching
│   └── sample-deals.ts     # Fallback sample data
└── types/                  # TypeScript definitions
    └── index.ts            # Shared types
```

## API Notes

### CORS Considerations

The Tjek API may have CORS restrictions. The app handles this by:
1. First trying client-side fetch (fastest)
2. Falling back to server-side proxy if CORS blocks
3. Using sample data if all else fails

### Adding More Stores

To add support for other grocery chains, find their Tjek dealer ID:

| Chain | Dealer ID |
|-------|-----------|
| Hemköp | d9b6XA |
| ICA | (TBD) |
| Coop | (TBD) |
| Willys | (TBD) |

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **OCR**: Tesseract.js (browser-based)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Future Enhancements

- [ ] Add more Swedish grocery chains
- [ ] User accounts for saving favorites
- [ ] Shopping list generation & export
- [ ] Nutritional information per recipe
- [ ] AI-powered recipe generation
- [ ] Price history tracking

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

Made with ❤️ for smarter grocery shopping in Sweden
