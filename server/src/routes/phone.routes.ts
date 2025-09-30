import express from 'express';
import {
  getServicesAndCountries,
  rentNumber,
  getNumberStatus,
  cancelRental,
  extendRental,
  getActiveRentals,
  handleSmsWebhook,
  testGoGetSms,
  testApiAuth,
  testGoGetSmsDualMode,
  testAnosimApiKey,
  testAnosimServices,
  getAvailableProviders
} from '../controllers/phone.controller';
import { syncPhoneNumbers } from '../controllers/phoneSync.controller';
import { 
  handleGoGetSmsWebhook, 
  gogetSmsWebhookHealth 
} from '../controllers/gogetSmsWebhook.controller';

const router = express.Router();

// Phone services and countries
router.get('/services', getServicesAndCountries as any);

// Get available providers (which have API keys configured)
router.get('/providers', getAvailableProviders as any);

// Rent a new phone number
router.post('/rent', rentNumber as any);

// Get status and messages for a rented number
router.get('/status/:id', getNumberStatus as any);

// Cancel a rental
router.post('/cancel/:id', cancelRental as any);

// Extend a rental
router.post('/extend/:id', extendRental as any);

// Get all active rentals
router.get('/list', getActiveRentals as any);

// Sync phone numbers from API to database
router.post('/sync', syncPhoneNumbers as any);

// SMS webhook
router.post('/webhook', handleSmsWebhook as any);

// New route to fetch SMS messages from receive-sms-online URLs (bypass CORS)
router.post('/fetch-sms', async (req: any, res: any) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('receive-sms-online.info')) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }
    
    console.log('🌐 Server-side SMS fetch for URL:', url);
    
    // Fetch the HTML content server-side (no CORS issues)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
    }
    
    const html = await response.text();
    console.log('✅ Successfully fetched HTML, length:', html.length);
    
    // Return the HTML content to the client
    res.json({ html, success: true });
    
  } catch (error) {
    console.error('❌ Error in server-side SMS fetch:', error);
    res.status(500).json({ 
      error: 'Failed to fetch SMS messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GoGetSMS webhook endpoints
router.post('/webhook/gogetsms', handleGoGetSmsWebhook as any);
router.get('/webhook/gogetsms/health', gogetSmsWebhookHealth as any);

// GoGetSMS test endpoint
router.get('/test/gogetsms', testGoGetSms as any);

// Test API authentication for all providers (DEBUG)
router.get('/test/auth', testApiAuth as any);

// Test GoGetSMS dual-mode
router.get('/test/gogetsms/dual-mode', testGoGetSmsDualMode as any);
router.get('/test/anosim/api-key', testAnosimApiKey as any);
router.get('/test/anosim/services', testAnosimServices as any);

export default router;
