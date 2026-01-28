// Test the complete flow: deals -> selection -> recipes
// Run with: node test-complete-flow.js

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Flow: Deals → Selection → Recipes\n');
  
  const baseUrl = 'http://localhost:3000';
  const storeId = '4547';
  
  try {
    // Step 1: Fetch deals
    console.log('1️⃣ Fetching deals...');
    const dealsResponse = await fetch(`${baseUrl}/api/deals?storeId=${storeId}`);
    const dealsData = await dealsResponse.json();
    
    if (dealsData.error || !dealsData.deals || dealsData.deals.length === 0) {
      console.error('❌ Failed to fetch deals:', dealsData.error || 'No deals found');
      return;
    }
    
    console.log(`✅ Fetched ${dealsData.deals.length} deals`);
    
    // Check for promotions
    const withPromotions = dealsData.deals.filter(d => d.promotion && d.promotion.length > 0);
    console.log(`   - ${withPromotions.length} items with promotions`);
    console.log(`   - Sample: ${dealsData.deals.slice(0, 3).map(d => d.name).join(', ')}\n`);
    
    // Step 2: Simulate random selection (test the logic)
    console.log('2️⃣ Testing selection logic...');
    const testDeals = dealsData.deals.slice(0, 20); // Use first 20 for testing
    
    // Count items with promotions
    const promoItems = testDeals.filter(d => d.promotion && d.promotion.length > 0);
    const regularItems = testDeals.filter(d => !d.promotion || d.promotion.length === 0);
    
    console.log(`   - Test set: ${testDeals.length} items`);
    console.log(`   - With promotions: ${promoItems.length}`);
    console.log(`   - Regular items: ${regularItems.length}\n`);
    
    // Step 3: Test recipe generation (if OpenAI key is set)
    if (process.env.OPENAI_API_KEY) {
      console.log('3️⃣ Testing recipe generation...');
      const testIngredients = testDeals
        .filter(d => d.promotion && d.promotion.length > 0)
        .slice(0, 5)
        .map(d => d.name);
      
      if (testIngredients.length >= 2) {
        console.log(`   - Selected ingredients: ${testIngredients.join(', ')}`);
        
        const recipeResponse = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: testIngredients }),
        });
        
        const recipeData = await recipeResponse.json();
        
        if (recipeData.error) {
          console.log(`   ⚠️  Recipe generation error: ${recipeData.error}`);
        } else if (recipeData.recipes && recipeData.recipes.length > 0) {
          console.log(`   ✅ Generated ${recipeData.recipes.length} recipes:`);
          recipeData.recipes.forEach((r, i) => {
            console.log(`      ${i + 1}. ${r.title}`);
            console.log(`         Search: ${r.search_query}`);
          });
        } else {
          console.log('   ⚠️  No recipes generated');
        }
      } else {
        console.log('   ⚠️  Not enough ingredients with promotions for testing');
      }
    } else {
      console.log('3️⃣ Skipping recipe generation (OPENAI_API_KEY not set)');
    }
    
    console.log('\n✅ Flow test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Click "🎲 Chansa! Ge mig ett recept baserat på erbjudanden"');
    console.log('   3. The app will automatically select sale items and generate recipes');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure the dev server is running: npm run dev');
  }
}

testCompleteFlow();
