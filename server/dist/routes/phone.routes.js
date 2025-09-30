"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const phone_controller_1 = require("../controllers/phone.controller");
const phoneSync_controller_1 = require("../controllers/phoneSync.controller");
const gogetSmsWebhook_controller_1 = require("../controllers/gogetSmsWebhook.controller");
const router = express_1.default.Router();
// Phone services and countries
router.get('/services', phone_controller_1.getServicesAndCountries);
// Get available providers (which have API keys configured)
router.get('/providers', phone_controller_1.getAvailableProviders);
// Rent a new phone number
router.post('/rent', phone_controller_1.rentNumber);
// Get status and messages for a rented number
router.get('/status/:id', phone_controller_1.getNumberStatus);
// Cancel a rental
router.post('/cancel/:id', phone_controller_1.cancelRental);
// Extend a rental
router.post('/extend/:id', phone_controller_1.extendRental);
// Get all active rentals
router.get('/list', phone_controller_1.getActiveRentals);
// Sync phone numbers from API to database
router.post('/sync', phoneSync_controller_1.syncPhoneNumbers);
// SMS webhook
router.post('/webhook', phone_controller_1.handleSmsWebhook);
// New route to fetch SMS messages from receive-sms-online URLs (bypass CORS)
router.post('/fetch-sms', async (req, res) => {
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
    }
    catch (error) {
        console.error('❌ Error in server-side SMS fetch:', error);
        res.status(500).json({
            error: 'Failed to fetch SMS messages',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GoGetSMS webhook endpoints
router.post('/webhook/gogetsms', gogetSmsWebhook_controller_1.handleGoGetSmsWebhook);
router.get('/webhook/gogetsms/health', gogetSmsWebhook_controller_1.gogetSmsWebhookHealth);
// GoGetSMS test endpoint
router.get('/test/gogetsms', phone_controller_1.testGoGetSms);
// Test API authentication for all providers (DEBUG)
router.get('/test/auth', phone_controller_1.testApiAuth);
// Test GoGetSMS dual-mode
router.get('/test/gogetsms/dual-mode', phone_controller_1.testGoGetSmsDualMode);
router.get('/test/anosim/api-key', phone_controller_1.testAnosimApiKey);
router.get('/test/anosim/services', phone_controller_1.testAnosimServices);
exports.default = router;
