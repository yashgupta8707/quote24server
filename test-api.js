// A simple script to test if the API is working correctly
// Run with: node test-api.js

const fetch = require('node-fetch');

const testApi = async () => {
  try {
    console.log('Testing API health endpoint...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    
    if (!healthResponse.ok) {
      console.error('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
      return;
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Health check successful:', healthData);
    
    console.log('\nTesting parties endpoint...');
    const partiesResponse = await fetch('http://localhost:5000/api/parties');
    
    if (!partiesResponse.ok) {
      console.error('❌ Parties endpoint failed:', partiesResponse.status, partiesResponse.statusText);
      const text = await partiesResponse.text();
      console.error('Response:', text);
      return;
    }
    
    const contentType = partiesResponse.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Warning: Response is not JSON!');
      const text = await partiesResponse.text();
      console.error('First 500 chars of response:', text.substring(0, 500));
      return;
    }
    
    const partiesData = await partiesResponse.json();
    console.log('✅ Parties endpoint successful!');
    console.log(`Found ${Array.isArray(partiesData) ? partiesData.length : '?'} parties.`);
    console.log('Sample data:', partiesData.slice(0, 2));
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

testApi();