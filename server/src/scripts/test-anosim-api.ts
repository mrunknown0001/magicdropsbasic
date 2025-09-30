import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'https://anosim.net/api/v1';
const API_KEY = process.env.ANOSIM_API_KEY?.trim() || '';

console.log('🔧 Anosim API Test Tool');
console.log('======================');

if (!API_KEY) {
  console.error('❌ ANOSIM_API_KEY environment variable is not set');
  process.exit(1);
}

console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}... (length: ${API_KEY.length})`);
console.log(`🌐 Base URL: ${API_BASE_URL}`);
console.log('');

interface TestResult {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: 'GET' | 'POST' | 'PATCH',
  endpoint: string,
  params: Record<string, any> = {},
  data?: any
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Testing ${name}...`);
    console.log(`   Method: ${method} ${endpoint}`);
    console.log(`   Params: ${JSON.stringify(params)}`);
    
    const config = {
      params: { apikey: API_KEY, ...params },
      timeout: 15000,
      headers: {
        'User-Agent': 'Anosim-Test-Tool/1.0',
        'Accept': 'application/json'
      }
    };
    
    let response;
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    
    switch (method) {
      case 'GET':
        response = await axios.get(fullUrl, config);
        break;
      case 'POST':
        response = await axios.post(fullUrl, data, config);
        break;
      case 'PATCH':
        response = await axios.patch(fullUrl, data, config);
        break;
    }
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Success (${duration}ms)`);
    console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
    console.log('');
    
    return {
      endpoint: name,
      success: true,
      data: response.data,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ Failed (${duration}ms)`);
    console.log(`   Error: ${error.response?.status} ${error.response?.statusText}`);
    console.log(`   Details: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
    console.log('');
    
    return {
      endpoint: name,
      success: false,
      error: error.response?.data ? JSON.stringify(error.response.data) : error.message,
      duration
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Anosim API Tests');
  console.log('============================');
  console.log('');
  
  // Test 1: Get Balance
  const balanceResult = await testEndpoint(
    'Get Balance',
    'GET',
    '/Balance'
  );
  results.push(balanceResult);
  
  // Test 2: Get Countries
  const countriesResult = await testEndpoint(
    'Get Countries',
    'GET',
    '/Countries'
  );
  results.push(countriesResult);
  
  // Test 3: Get All Products
  const allProductsResult = await testEndpoint(
    'Get All Products',
    'GET',
    '/Products'
  );
  results.push(allProductsResult);
  
  // Test 4: Get Products for Germany (ID 98)
  const germanyProductsResult = await testEndpoint(
    'Get Products for Germany',
    'GET',
    '/Products',
    { countryId: 98 }
  );
  results.push(germanyProductsResult);
  
  // Test 5: Get Current Order Bookings
  const currentBookingsResult = await testEndpoint(
    'Get Current Order Bookings',
    'GET',
    '/OrderBookingsCurrent'
  );
  results.push(currentBookingsResult);
  
  // Test 6: Get All SMS
  const allSmsResult = await testEndpoint(
    'Get All SMS',
    'GET',
    '/Sms'
  );
  results.push(allSmsResult);
  
  // Test 7: Get Product Details (if we have products)
  if (allProductsResult.success && allProductsResult.data && Array.isArray(allProductsResult.data) && allProductsResult.data.length > 0) {
    const firstProduct = allProductsResult.data[0];
    const productDetailsResult = await testEndpoint(
      `Get Product Details (ID: ${firstProduct.id})`,
      'GET',
      `/Products/${firstProduct.id}`
    );
    results.push(productDetailsResult);
  }
  
  // Generate Summary Report
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  console.log('');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  console.log('');
  
  // Detailed Results
  console.log('📋 DETAILED RESULTS');
  console.log('==================');
  console.log('');
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.endpoint}`);
    console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.success && result.data) {
      if (Array.isArray(result.data)) {
        console.log(`   Data: Array with ${result.data.length} items`);
        if (result.data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(result.data[0]).substring(0, 100)}...`);
        }
      } else if (typeof result.data === 'object') {
        console.log(`   Data: Object with keys: ${Object.keys(result.data).join(', ')}`);
      } else {
        console.log(`   Data: ${result.data}`);
      }
    }
    console.log('');
  });
  
  // API Analysis
  console.log('🔍 API ANALYSIS');
  console.log('===============');
  console.log('');
  
  if (balanceResult.success) {
    console.log(`💰 Account Balance: $${balanceResult.data.accountBalanceInUSD}`);
  }
  
  if (countriesResult.success && Array.isArray(countriesResult.data)) {
    console.log(`🌍 Available Countries: ${countriesResult.data.length}`);
    countriesResult.data.forEach((country: any) => {
      console.log(`   - ${country.country} (ID: ${country.id})`);
    });
  }
  
  if (allProductsResult.success && Array.isArray(allProductsResult.data)) {
    console.log(`📦 Total Products: ${allProductsResult.data.length}`);
    
    const productsByType = allProductsResult.data.reduce((acc: any, product: any) => {
      acc[product.rentalType] = (acc[product.rentalType] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`   Product Types:`);
    Object.entries(productsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    const productsByCountry = allProductsResult.data.reduce((acc: any, product: any) => {
      acc[product.country] = (acc[product.country] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`   Products by Country:`);
    Object.entries(productsByCountry).forEach(([country, count]) => {
      console.log(`   - ${country}: ${count}`);
    });
    
    // Show sample products
    console.log(`   Sample Products:`);
    allProductsResult.data.slice(0, 5).forEach((product: any) => {
      console.log(`   - ID: ${product.id}, Type: ${product.rentalType}, Country: ${product.country}, Service: ${product.service || 'N/A'}, Price: $${product.price}`);
    });
  }
  
  if (currentBookingsResult.success && Array.isArray(currentBookingsResult.data)) {
    console.log(`📱 Current Active Bookings: ${currentBookingsResult.data.length}`);
    if (currentBookingsResult.data.length > 0) {
      currentBookingsResult.data.forEach((booking: any) => {
        console.log(`   - ID: ${booking.id}, State: ${booking.state}, Phone: ${booking.number || 'N/A'}`);
      });
    }
  }
  
  if (allSmsResult.success && Array.isArray(allSmsResult.data)) {
    console.log(`💬 Recent SMS Messages: ${allSmsResult.data.length}`);
    if (allSmsResult.data.length > 0) {
      allSmsResult.data.slice(0, 3).forEach((sms: any) => {
        console.log(`   - From: ${sms.from || 'Unknown'}, Message: ${(sms.message || '').substring(0, 50)}...`);
      });
    }
  }
  
  console.log('');
  console.log('🎯 RECOMMENDATIONS');
  console.log('==================');
  console.log('');
  
  if (failed === 0) {
    console.log('✅ All API endpoints are working correctly!');
    console.log('✅ Your API key has proper access permissions.');
    console.log('✅ The integration should work as expected.');
  } else {
    console.log(`❌ ${failed} endpoint(s) failed. Check the detailed results above.`);
    console.log('❌ Verify your API key has the required permissions.');
    console.log('❌ Check the Anosim API documentation for any changes.');
  }
  
  console.log('');
  console.log('🔧 Test completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
}); 