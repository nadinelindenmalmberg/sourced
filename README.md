# Sourced

A Notion-inspired web application for discovering recipe suggestions based on products on sale.

## Features

- **Product Discovery**: View products on sale from grocery stores via Browse AI
- **Smart Selection**: Click products to select them
- **AI Recipes**: Get instant recipe suggestions based on selected products via OpenAI
- **Clean Design**: Notion-style interface with minimal, professional aesthetics
- **Demo Mode**: Works out of the box with demo data, real APIs optional

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe code
- **Tailwind CSS 4** - Utility-first styling
- **Browse AI** - Product data integration
- **OpenAI GPT-4o-mini** - Recipe generation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app will work immediately with demo data. To use real APIs, see Configuration below.

### Production

```bash
npm run build
npm start
```

## Configuration

The app works out of the box with demo data. To connect real APIs:

### 1. Create Environment File

Copy the example file:

```bash
cp .env.local.example .env.local
```

### 2. Browse AI Setup (for real product data)

1. Go to [Browse AI](https://browse.ai) and sign up
2. Create a robot to scrape your grocery store's sale page
3. Configure the robot to capture:
   - Product name
   - Current price
   - Original price (optional)
   - Category (optional)
   - Discount percentage (optional)
4. Get your API key from Settings
5. Get your Robot ID from the robot's page
6. Add to `.env.local`:

```env
BROWSE_AI_API_KEY=your_actual_api_key
BROWSE_AI_ROBOT_ID=your_actual_robot_id
```

**Note:** You may need to adjust the field mapping in `src/app/api/browse-ai/route.ts` based on how your Browse AI robot captures data.

### 3. OpenAI Setup (for AI-generated recipes)

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an account and add credits
3. Generate an API key
4. Add to `.env.local`:

```env
OPENAI_API_KEY=your_actual_api_key
```

The app uses the `gpt-4o-mini` model which is cost-effective for this use case.

## How It Works

### Without API Keys (Demo Mode)
- Shows 8 demo products on sale
- Generates 3 static recipe suggestions
- Perfect for development and testing

### With API Keys (Production Mode)
- **Browse AI** fetches real products from your configured store
- **OpenAI** generates custom recipes based on selected products
- Recipes adapt to your actual selections

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── browse-ai/route.ts      # Fetches products from Browse AI
│   │   └── recipes/generate/route.ts # Generates recipes via OpenAI
│   ├── globals.css                  # Minimal global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Main application page
└── ...
```

## Code Principles

- **Simplicity**: Minimal dependencies, clear code
- **Documentation**: Every file and function documented
- **Type Safety**: Full TypeScript coverage
- **Clean Architecture**: Single responsibility, no unused code
- **Performance**: Auto-loading data, optimized rendering
- **Graceful Degradation**: Works without API keys for development

## API Endpoints

### `GET /api/browse-ai`

Fetches products on sale from Browse AI.

**Response:**
```json
{
  "success": true,
  "demo": false,
  "products": [
    {
      "id": "1",
      "name": "Product Name",
      "price": 99,
      "originalPrice": 129,
      "category": "Category",
      "discount": 23
    }
  ]
}
```

If `demo: true`, the data is static demo content.

### `POST /api/recipes/generate`

Generates recipe suggestions using OpenAI based on selected products.

**Request:**
```json
{
  "products": [
    { "id": "1", "name": "Product Name" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "demo": false,
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description of the recipe",
      "matchedProducts": ["Product Name", "Another Product"]
    }
  ]
}
```

If `demo: true`, the recipes are static demo content.

## Customization

### Browse AI Field Mapping

If your Browse AI robot uses different field names, update the mapping in `src/app/api/browse-ai/route.ts`:

```typescript
const products = capturedProducts.map((item: any, index: number) => ({
  id: String(index + 1),
  name: item.productName || item.name,  // Adjust field name here
  price: parseFloat(item.price || '0'),
  originalPrice: parseFloat(item.originalPrice || '0'),
  category: item.category || 'Övrigt',
  // ...
}));
```

### Recipe Prompt

Customize the OpenAI prompt in `src/app/api/recipes/generate/route.ts` to change recipe style, cuisine type, or dietary preferences.

## Troubleshooting

### Products not loading
- Check Browse AI API key and Robot ID in `.env.local`
- Verify your Browse AI robot has completed at least one task
- Check server logs for errors
- Demo data will be used as fallback

### Recipes not generating
- Check OpenAI API key in `.env.local`
- Ensure you have credits in your OpenAI account
- Check server logs for errors
- Demo recipes will be used as fallback

### Server logs
View logs in terminal where `npm run dev` is running.

## License

Private project

## Support

For issues with:
- **Browse AI**: See [Browse AI Documentation](https://docs.browse.ai)
- **OpenAI**: See [OpenAI API Documentation](https://platform.openai.com/docs)
