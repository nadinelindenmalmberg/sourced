// Test the deals scraper directly
// Run with: node test-scraper.js

async function testScraper() {
  console.log('Testing deals scraper...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/deals');
    const data = await response.json();
    
    console.log('Response:');
    console.log(`  Source: ${data.source || 'unknown'}`);
    console.log(`  Count: ${data.count || 0}`);
    console.log(`  Pages fetched: ${data.pagesFetched || 'N/A'}`);
    
    if (data.error) {
      console.log(`  Error: ${data.error}`);
    }
    
    if (data.warning) {
      console.log(`  Warning: ${data.warning}`);
    }
    
    if (data.deals && data.deals.length > 0) {
      console.log(`\nFirst 5 deals:`);
      data.deals.slice(0, 5).forEach((deal, i) => {
        console.log(`  ${i + 1}. ${deal.name} - ${deal.price} kr${deal.category ? ` (${deal.category})` : ''}`);
      });
      console.log(`\n✅ Successfully retrieved ${data.deals.length} deals!`);
    } else {
      console.log('\n❌ No deals found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

testScraper();
