// Simple test script to check if APIs are working
// Run with: node test-api.js

async function testDealsAPI() {
  console.log('Testing /api/deals...');
  try {
    const response = await fetch('http://localhost:3000/api/deals');
    const data = await response.json();
    console.log('✅ Deals API Response:');
    console.log(`   Source: ${data.source || 'unknown'}`);
    console.log(`   Count: ${data.count || 0}`);
    console.log(`   First 3 deals:`, data.deals?.slice(0, 3) || []);
    if (data.error) {
      console.log(`   ⚠️  Error: ${data.error}`);
    }
    return data.deals && data.deals.length > 0;
  } catch (error) {
    console.error('❌ Deals API Error:', error.message);
    return false;
  }
}

async function testGenerateAPI() {
  console.log('\nTesting /api/generate...');
  const testIngredients = [
    { name: 'Lövbiff', price: 89 },
    { name: 'Paprika', price: 15 },
    { name: 'Gräddfil', price: 22 },
    { name: 'Taco Krydda', price: 18 },
  ];
  
  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ingredients: testIngredients }),
    });
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ Generate API Error:', data.error);
      if (data.error.includes('API key')) {
        console.log('   💡 Make sure OPENAI_API_KEY is set in .env.local');
      }
      return false;
    }
    
    console.log('✅ Generate API Response:');
    console.log(`   Recipe: ${data.recipe_title}`);
    console.log(`   Ingredients used: ${data.ingredients_used?.length || 0}`);
    console.log(`   Instructions: ${data.instructions?.length || 0} steps`);
    return true;
  } catch (error) {
    console.error('❌ Generate API Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API tests...\n');
  console.log('Make sure the dev server is running: npm run dev\n');
  
  const dealsOk = await testDealsAPI();
  const generateOk = await testGenerateAPI();
  
  console.log('\n📊 Test Summary:');
  console.log(`   Deals API: ${dealsOk ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Generate API: ${generateOk ? '✅ Working' : '❌ Failed'}`);
  
  if (!dealsOk || !generateOk) {
    console.log('\n💡 Tips:');
    if (!dealsOk) {
      console.log('   - The deals API will use mock data if scraping fails');
      console.log('   - Set USE_MOCK_DATA=true in .env.local to force mock data');
    }
    if (!generateOk) {
      console.log('   - Make sure OPENAI_API_KEY is set in .env.local');
      console.log('   - Check that the API key is valid');
    }
  }
}

runTests();
