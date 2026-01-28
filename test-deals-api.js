// Test script to verify the deals API works
// Run with: node test-deals-api.js

async function testDealsAPI() {
  console.log('🧪 Testing Hemköp Deals API...\n');
  
  const storeId = process.argv[2] || '4547';
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log(`Fetching deals for store ${storeId}...`);
    const response = await fetch(`${baseUrl}/api/deals?storeId=${storeId}`);
    
    if (!response.ok) {
      console.error(`❌ API returned status ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n✅ API Response:');
    console.log(`   Source: ${data.source || 'unknown'}`);
    console.log(`   Store ID: ${data.storeId || 'unknown'}`);
    console.log(`   Total deals: ${data.count || 0}`);
    
    if (data.error) {
      console.log(`   ⚠️  Error: ${data.error}`);
      if (data.details) {
        console.log(`   Details: ${data.details}`);
      }
      return;
    }
    
    if (data.deals && data.deals.length > 0) {
      console.log('\n📦 First 5 deals:');
      data.deals.slice(0, 5).forEach((deal, i) => {
        console.log(`   ${i + 1}. ${deal.name}`);
        console.log(`      Brand: ${deal.brand || 'N/A'}`);
        console.log(`      Price: ${deal.price} ${deal.unit}`);
        console.log(`      Promotion: ${deal.promotion || 'N/A'}`);
        console.log(`      Category: ${deal.category || 'N/A'}`);
        console.log('');
      });
      
      // Check for non-food items
      const nonFoodCategories = ['Hushåll', 'Djur', 'Hälsa', 'Hygien', 'Städning'];
      const nonFoodItems = data.deals.filter(d => 
        nonFoodCategories.some(cat => 
          (d.category || '').toLowerCase().includes(cat.toLowerCase())
        )
      );
      
      console.log(`\n📊 Statistics:`);
      console.log(`   Total items: ${data.deals.length}`);
      console.log(`   Non-food items (will be filtered): ${nonFoodItems.length}`);
      console.log(`   Food items: ${data.deals.length - nonFoodItems.length}`);
      
      if (data.count >= 60 && data.count <= 70) {
        console.log('\n✅ Expected range (60-70 items) - Test PASSED!');
      } else {
        console.log(`\n⚠️  Expected ~65 items, got ${data.count}`);
      }
    } else {
      console.log('\n❌ No deals found');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure the dev server is running: npm run dev');
  }
}

testDealsAPI();
