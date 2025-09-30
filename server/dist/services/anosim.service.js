"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anosimService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const retry_1 = require("../utils/retry");
dotenv_1.default.config();
// Anosim API Configuration
const API_BASE_URL = 'https://anosim.net/api/v1';
const API_KEY = process.env.ANOSIM_API_KEY?.trim() || '';
if (!API_KEY) {
    console.warn('[ANOSIM] API key not configured. Set ANOSIM_API_KEY environment variable.');
}
else {
    console.log(`[ANOSIM] API configured with key: ${API_KEY.substring(0, 8)}... (length: ${API_KEY.length})`);
    console.log(`[ANOSIM] Full API key for debugging: ${API_KEY}`);
}
// Error class for Anosim API errors
class AnosimError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'AnosimError';
        this.code = code;
    }
}
/**
 * Check if Anosim API is available (has API key)
 */
const isApiAvailable = () => {
    return !!API_KEY && API_KEY.length > 0;
};
// Product name to service code mapping
const PRODUCT_TO_SERVICE_MAPPING = {
    'WhatsApp': 'wa',
    'Telegram': 'tg',
    'Google': 'go',
    'Facebook': 'fb',
    'Instagram': 'ig',
    'Twitter': 'tw',
    'Discord': 'ds',
    'Amazon': 'am',
    'Apple': 'ap',
    'Microsoft': 'ms',
    'Viber': 'vi',
    'WeChat': 'wb',
    'TikTok': 'lf',
    'Tinder': 'oi',
    'Netflix': 'nt',
    'LinkedIn': 'li',
    'Snapchat': 'sn',
    'YouTube': 'go', // Map to Google
    'Gmail': 'go', // Map to Google
    'VK': 'vk',
    'Other': 'ot'
};
// Service code to product name mapping (reverse)
const SERVICE_TO_PRODUCT_MAPPING = {
    'wa': 'WhatsApp',
    'tg': 'Telegram',
    'go': 'Google',
    'fb': 'Facebook',
    'ig': 'Instagram',
    'tw': 'Twitter',
    'ds': 'Discord',
    'am': 'Amazon',
    'ap': 'Apple',
    'ms': 'Microsoft',
    'vi': 'Viber',
    'wb': 'WeChat',
    'lf': 'TikTok',
    'oi': 'Tinder',
    'nt': 'Netflix',
    'li': 'LinkedIn',
    'sn': 'Snapchat',
    'vk': 'VK',
    'ot': 'Other'
};
// Country code to Anosim country ID mapping
// Based on actual API response: Cyprus(66), CzechRepublic(67), Germany(98), Kenya(151), Lithuania(165), Netherlands(196), Poland(220), Portugal(221), SouthAfrica(252), Sweden(261), UnitedKingdom(286)
const COUNTRY_TO_ANOSIM_ID = {
    // SMS-Activate country codes -> Anosim country IDs
    '0': 98, // Default -> Germany
    '12': 98, // USA -> Germany (closest available)
    '43': 98, // Germany -> Germany
    '16': 286, // UK -> UnitedKingdom
    '67': 67, // Czech -> CzechRepublic
    '165': 165, // Lithuania -> Lithuania
    '98': 98, // Germany -> Germany (direct mapping)
    '196': 196, // Netherlands -> Netherlands
    '220': 220, // Poland -> Poland
    '221': 221, // Portugal -> Portugal
    '252': 252, // South Africa -> SouthAfrica
    '261': 261, // Sweden -> Sweden
    '286': 286, // United Kingdom -> UnitedKingdom
    '66': 66, // Cyprus -> Cyprus
    '151': 151 // Kenya -> Kenya
};
// Service name mappings for display
const SERVICE_NAMES = {
    'wa': 'WhatsApp',
    'tg': 'Telegram',
    'go': 'Google/Gmail/YouTube',
    'fb': 'Facebook',
    'ig': 'Instagram',
    'tw': 'Twitter',
    'ds': 'Discord',
    'am': 'Amazon',
    'ap': 'Apple',
    'ms': 'Microsoft',
    'vi': 'Viber',
    'wb': 'WeChat',
    'lf': 'TikTok',
    'oi': 'Tinder',
    'nt': 'Netflix',
    'li': 'LinkedIn',
    'sn': 'Snapchat',
    'vk': 'VK',
    'ot': 'Other'
};
/**
 * Anosim API Service
 * Implements the same interface as SMS-Activate and SMSPVA services
 */
exports.anosimService = {
    /**
     * Check if the service is available
     */
    isAvailable: isApiAvailable,
    /**
     * Get account balance
     */
    async getBalance() {
        if (!isApiAvailable()) {
            throw new AnosimError('Anosim API key not configured', 'NO_API_KEY');
        }
        try {
            console.log('[ANOSIM] Getting account balance');
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/Balance`, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Balance response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting balance:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Test API key validity
     */
    async testApiKey() {
        try {
            console.log('[ANOSIM] Testing API key...');
            const balance = await this.getBalance();
            console.log('[ANOSIM] ✅ API key is valid, balance:', balance);
            return { valid: true, balance };
        }
        catch (error) {
            console.error('[ANOSIM] ❌ API key test failed:', error.message);
            return { valid: false, error: error.message };
        }
    },
    /**
     * Get available countries
     */
    async getCountries() {
        try {
            console.log('[ANOSIM] Getting countries');
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/Countries`, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Countries response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting countries:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get available products
     */
    async getProducts(countryId) {
        try {
            console.log(`[ANOSIM] Getting products for country: ${countryId || 'all'}`);
            const params = { apikey: API_KEY };
            if (countryId) {
                // Convert our country code to Anosim country ID
                const anosimCountryId = COUNTRY_TO_ANOSIM_ID[countryId];
                if (anosimCountryId) {
                    params.countryId = anosimCountryId;
                }
            }
            console.log(`[ANOSIM] Making API request to: ${API_BASE_URL}/Products`);
            console.log(`[ANOSIM] Request params:`, { ...params, apikey: `${params.apikey.substring(0, 8)}...` });
            // Log the full request details for debugging
            console.log(`[ANOSIM] Full request URL: ${API_BASE_URL}/Products?${new URLSearchParams(params).toString()}`);
            console.log(`[ANOSIM] Full params object:`, params);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/Products`, {
                params,
                timeout: 15000,
                headers: {
                    'User-Agent': 'Padeno-Anosim-Client/1.0',
                    'Accept': 'application/json'
                }
            }), 3, 1000);
            console.log('[ANOSIM] Products response length:', response.data?.length || 0);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting products:');
            console.error('[ANOSIM] Error status:', error.response?.status);
            console.error('[ANOSIM] Error data:', error.response?.data);
            console.error('[ANOSIM] Error headers:', error.response?.headers);
            console.error('[ANOSIM] Request URL:', error.config?.url);
            console.error('[ANOSIM] Request params:', error.config?.params);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get product details by ID
     */
    async getProductDetails(productId) {
        try {
            console.log(`[ANOSIM] Getting product details for ID: ${productId}`);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/Products/${productId}`, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Product details response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting product details:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Create an order (rent a phone number)
     */
    async createOrder(productId, amount = '1', providerId = '0') {
        try {
            console.log(`[ANOSIM] Creating order for product: ${productId}, amount: ${amount}, provider: ${providerId}`);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.post(`${API_BASE_URL}/Orders`, null, {
                params: {
                    apikey: API_KEY,
                    productId,
                    amount,
                    providerId
                },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Order creation response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error creating order:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get current order bookings
     */
    async getCurrentOrderBookings() {
        try {
            console.log('[ANOSIM] Getting current order bookings');
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/OrderBookingsCurrent`, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Order bookings response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting order bookings:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get order booking by ID
     */
    async getOrderBooking(id) {
        try {
            console.log(`[ANOSIM] Getting order booking: ${id}`);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/OrderBookings/${id}`, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Order booking response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting order booking:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Cancel order booking
     */
    async cancelOrderBooking(id) {
        try {
            console.log(`[ANOSIM] Cancelling order booking: ${id}`);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.patch(`${API_BASE_URL}/OrderBookings/${id}`, null, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Cancel response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error cancelling order booking:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Extend order booking
     */
    async extendOrderBooking(id, extensionMinutes) {
        try {
            console.log(`[ANOSIM] Extending order booking: ${id} by ${extensionMinutes} minutes`);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.post(`${API_BASE_URL}/OrderBookings`, null, {
                params: {
                    apikey: API_KEY,
                    orderBookingId: id,
                    extentionInMinutes: extensionMinutes
                },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Extension response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error extending order booking:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Set auto-renewal status
     */
    async setAutoRenewal(enable, orderBookingId) {
        try {
            console.log(`[ANOSIM] Setting auto-renewal: ${enable} for booking: ${orderBookingId || 'all'}`);
            const params = {
                apikey: API_KEY,
                enable: enable ? '1' : '0'
            };
            if (orderBookingId) {
                params.orderBookingId = orderBookingId;
            }
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.post(`${API_BASE_URL}/OrderBookingsAutoRenewal`, null, {
                params,
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Auto-renewal response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error setting auto-renewal:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get SMS messages
     */
    async getSms(orderBookingId) {
        try {
            console.log(`[ANOSIM] Getting SMS for booking: ${orderBookingId || 'all'}`);
            const url = orderBookingId
                ? `${API_BASE_URL}/Sms/${orderBookingId}`
                : `${API_BASE_URL}/Sms`;
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(url, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] SMS response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting SMS:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get all orders (including historical)
     */
    async getOrders() {
        try {
            console.log('[ANOSIM] Getting all orders');
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(`${API_BASE_URL}/Orders`, {
                params: { apikey: API_KEY },
                timeout: 15000
            }), 3, 1000);
            console.log('[ANOSIM] Orders response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[ANOSIM] Error getting orders:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Transform products to services (SMS-Activate format)
     */
    transformProductsToServices(products) {
        const services = {};
        if (!Array.isArray(products)) {
            console.warn('[ANOSIM] Products is not an array:', products);
            return services;
        }
        console.log(`[ANOSIM] Processing ${products.length} products...`);
        products.forEach((product) => {
            if (product) {
                // Handle RentalFull products (empty service field)
                if (product.rentalType === 'RentalFull' && (!product.service || product.service.trim() === '')) {
                    const countryName = product.country || 'Unknown';
                    const serviceCode = `full_${countryName.toLowerCase().replace(/[^a-z]/g, '')}`;
                    services[serviceCode] = {
                        name: `Full Rental - ${countryName}`,
                        cost: parseFloat(product.price || '0'),
                        count: 99,
                        productId: product.id,
                        country: product.country,
                        duration: product.durationInMinutes,
                        rentalType: product.rentalType
                    };
                    // Also add a generic "full" service for the cheapest option
                    if (!services['full'] || parseFloat(product.price || '999') < parseFloat(services['full'].cost || '999')) {
                        services['full'] = {
                            name: `Full Phone Rental`,
                            cost: parseFloat(product.price || '0'),
                            count: 99,
                            productId: product.id,
                            country: product.country,
                            duration: product.durationInMinutes,
                            rentalType: product.rentalType
                        };
                    }
                }
                // Handle service-specific products
                else if (product.service && product.service.trim()) {
                    // Anosim products have service names in the 'service' field
                    const serviceName = product.service.trim();
                    // Map common service names to our service codes
                    let serviceCode = 'ot'; // default to 'other'
                    // Check for common services
                    if (serviceName.toLowerCase().includes('google') || serviceName.toLowerCase().includes('gmail') || serviceName.toLowerCase().includes('youtube')) {
                        serviceCode = 'go';
                    }
                    else if (serviceName.toLowerCase().includes('whatsapp')) {
                        serviceCode = 'wa';
                    }
                    else if (serviceName.toLowerCase().includes('telegram')) {
                        serviceCode = 'tg';
                    }
                    else if (serviceName.toLowerCase().includes('facebook')) {
                        serviceCode = 'fb';
                    }
                    else if (serviceName.toLowerCase().includes('instagram')) {
                        serviceCode = 'ig';
                    }
                    else if (serviceName.toLowerCase().includes('twitter')) {
                        serviceCode = 'tw';
                    }
                    else if (serviceName.toLowerCase().includes('discord')) {
                        serviceCode = 'ds';
                    }
                    else if (serviceName.toLowerCase().includes('apple')) {
                        serviceCode = 'ap';
                    }
                    else if (serviceName.toLowerCase().includes('microsoft')) {
                        serviceCode = 'ms';
                    }
                    else if (serviceName.toLowerCase().includes('tiktok')) {
                        serviceCode = 'lf';
                    }
                    else if (serviceName.toLowerCase().includes('netflix')) {
                        serviceCode = 'nt';
                    }
                    else if (serviceName.toLowerCase().includes('linkedin')) {
                        serviceCode = 'li';
                    }
                    else if (serviceName.toLowerCase().includes('viber')) {
                        serviceCode = 'vi';
                    }
                    else if (serviceName.toLowerCase().includes('snapchat')) {
                        serviceCode = 'sn';
                    }
                    else if (serviceName.toLowerCase().includes('amazon')) {
                        serviceCode = 'am';
                    }
                    else {
                        // Create a unique service code based on the service name
                        serviceCode = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
                    }
                    // Only add if not already exists or if this is a better price
                    if (!services[serviceCode] || parseFloat(product.price || '999') < parseFloat(services[serviceCode].cost || '999')) {
                        services[serviceCode] = {
                            name: serviceName,
                            cost: parseFloat(product.price || '0'),
                            count: 99, // Anosim doesn't provide availability count, use default
                            productId: product.id,
                            country: product.country,
                            duration: product.durationInMinutes,
                            rentalType: product.rentalType
                        };
                    }
                }
            }
        });
        console.log(`[ANOSIM] Transformed ${Object.keys(services).length} unique services`);
        // Log sample services for debugging
        const sampleServices = Object.entries(services).slice(0, 5);
        console.log('[ANOSIM] Sample transformed services:', JSON.stringify(sampleServices, null, 2));
        return services;
    },
    /**
     * Transform countries to country mapping (SMS-Activate format)
     */
    transformCountriesToCountryMapping(countries) {
        const countryMapping = {};
        if (!Array.isArray(countries)) {
            console.warn('[ANOSIM] Countries is not an array:', countries);
            return countryMapping;
        }
        countries.forEach((country) => {
            if (country && country.id && country.country) {
                // Find our country code that maps to this Anosim country ID
                const ourCountryCode = Object.keys(COUNTRY_TO_ANOSIM_ID).find(key => COUNTRY_TO_ANOSIM_ID[key] === country.id);
                if (ourCountryCode) {
                    countryMapping[ourCountryCode] = country.country;
                }
                else {
                    // Add as string ID for unmapped countries
                    countryMapping[country.id.toString()] = country.country;
                }
            }
        });
        console.log(`[ANOSIM] Transformed ${Object.keys(countryMapping).length} countries`);
        return countryMapping;
    },
    /**
     * Transform order to phone number record
     */
    transformOrderToPhoneNumber(order) {
        if (!order) {
            console.warn('[ANOSIM] Invalid order structure:', order);
            return null;
        }
        // Handle direct order booking response (single booking)
        if (order.number) {
            return {
                phone_number: order.number,
                rent_id: order.id,
                order_id: order.orderId || order.id,
                order_booking_id: order.id,
                provider_id: order.providerId || 0,
                auto_renewal: order.autoRenewal || false,
                external_url: order.id, // Store booking ID for reference
                access_key: null
            };
        }
        // Handle order with orderBookings array
        if (order.orderBookings && Array.isArray(order.orderBookings)) {
            const booking = order.orderBookings[0]; // Get first booking
            if (!booking) {
                console.warn('[ANOSIM] No booking in order:', order);
                return null;
            }
            return {
                phone_number: booking.number || booking.simCard?.phoneNumber,
                rent_id: booking.id,
                order_id: order.id,
                order_booking_id: booking.id,
                provider_id: booking.providerId || 0,
                auto_renewal: booking.autoRenewal || false,
                external_url: booking.id, // Store booking ID for reference
                access_key: null
            };
        }
        console.warn('[ANOSIM] Unrecognized order structure:', order);
        return null;
    },
    /**
     * Transform SMS to messages (SMS-Activate format)
     * Fixed to handle Anosim API response format correctly
     */
    transformSmsToMessages(smsArray) {
        const messages = [];
        if (!Array.isArray(smsArray)) {
            console.warn('[ANOSIM] SMS is not an array:', smsArray);
            return messages;
        }
        console.log(`[ANOSIM] Processing ${smsArray.length} SMS messages for transformation`);
        smsArray.forEach((sms, index) => {
            console.log(`[ANOSIM] Processing SMS ${index + 1}:`, JSON.stringify(sms, null, 2));
            // Handle Anosim API response format:
            // { simCardNumber, messageDate, messageSender, messageText }
            const messageText = sms.messageText || sms.message || '';
            const sender = sms.messageSender || sms.from || 'Unknown';
            const receivedAt = sms.messageDate || sms.receivedAt || new Date().toISOString();
            if (messageText) {
                const transformedMessage = {
                    sender: sender,
                    message: messageText,
                    received_at: receivedAt,
                    text: messageText // Alternative field name for compatibility
                };
                messages.push(transformedMessage);
                console.log(`[ANOSIM] ✅ Transformed message ${index + 1}:`, transformedMessage);
            }
            else {
                console.log(`[ANOSIM] ❌ Skipping message ${index + 1} - no messageText found`);
            }
        });
        console.log(`[ANOSIM] Successfully transformed ${messages.length} out of ${smsArray.length} messages`);
        return messages;
    },
    /**
     * Transform order booking to rental (for getRentList)
     */
    transformOrderBookingToRental(booking) {
        if (!booking || !booking.simCard) {
            return null;
        }
        return {
            id: booking.id,
            phoneNumber: booking.simCard.phoneNumber,
            service: booking.productName || 'unknown',
            status: booking.state || 'Active',
            endTime: booking.endTime,
            autoRenewal: booking.autoRenewal || false
        };
    },
    /**
     * Helper method to get country name by ID
     */
    getCountryNameById(countryId) {
        // Don't map country "0" - it means "any country"
        if (countryId === '0')
            return null;
        const anosimCountryId = COUNTRY_TO_ANOSIM_ID[countryId];
        if (!anosimCountryId)
            return null;
        // Map Anosim country IDs to names
        const countryNames = {
            66: 'Cyprus',
            67: 'CzechRepublic',
            98: 'Germany',
            151: 'Kenya',
            165: 'Lithuania',
            196: 'Netherlands',
            220: 'Poland',
            221: 'Portugal',
            252: 'SouthAfrica',
            261: 'Sweden',
            286: 'UnitedKingdom'
        };
        return countryNames[anosimCountryId] || null;
    },
    // === Interface methods that match SMS-Activate/SMSPVA pattern ===
    /**
     * Get activation services and countries
     * NEW: Support for activation mode - single SMS, short duration
     */
    async getActivationServicesAndCountries() {
        try {
            console.log('[ANOSIM] Getting activation services and countries (ACTIVATION ONLY)');
            // Get all products first
            const allProducts = await this.getProducts();
            console.log(`[ANOSIM] Retrieved ${allProducts.length} total products`);
            // Filter to ACTIVATION products only - be strict about this
            const activationProducts = allProducts.filter((product) => product.rentalType === 'Activation');
            console.log(`[ANOSIM] Found ${activationProducts.length} strict activation products`);
            // If no activation products, return a curated list of popular services for activation
            if (activationProducts.length === 0) {
                console.log('[ANOSIM] No activation products found, returning curated activation services');
                return this.getCuratedActivationServices();
            }
            return this.transformActivationProducts(activationProducts);
        }
        catch (error) {
            console.error('[ANOSIM] Error getting activation services:', error);
            throw error;
        }
    },
    /**
     * Get curated activation services when no real activation products exist
     */
    getCuratedActivationServices() {
        const services = {};
        const countries = {};
        // Curated list of popular services for activation (single SMS)
        const curatedServices = [
            { code: 'wa', name: 'WhatsApp', price: 2.50 },
            { code: 'tg', name: 'Telegram', price: 2.00 },
            { code: 'go', name: 'Google/Gmail', price: 2.80 },
            { code: 'fb', name: 'Facebook', price: 2.60 },
            { code: 'ig', name: 'Instagram', price: 2.70 },
            { code: 'tw', name: 'Twitter', price: 2.90 },
            { code: 'ds', name: 'Discord', price: 2.40 },
            { code: 'oi', name: 'Tinder', price: 1.50 },
            { code: 'ap', name: 'Apple', price: 3.00 },
            { code: 'nt', name: 'Netflix', price: 2.80 }
        ];
        curatedServices.forEach(service => {
            services[service.code] = {
                name: service.name,
                price: service.price,
                currency: 'USD',
                type: 'activation',
                country: 'Germany', // Default to Germany
                productId: null, // No real product ID for curated services
                durationInMinutes: 240 // 4 hours default for activations
            };
        });
        // Add Germany as the main country for activation
        countries['98'] = {
            name: 'Germany',
            iso: 'DE'
        };
        console.log(`[ANOSIM] Created ${Object.keys(services).length} curated activation services`);
        return {
            services,
            countries,
            provider: 'anosim',
            type: 'activation'
        };
    },
    /**
     * Transform activation products into service format
     */
    transformActivationProducts(activationProducts) {
        const services = {};
        const countries = {};
        // Process activation products
        activationProducts.forEach((product) => {
            if (product.service) {
                const serviceCode = PRODUCT_TO_SERVICE_MAPPING[product.service] || 'ot';
                if (!services[serviceCode]) {
                    services[serviceCode] = {
                        name: product.service,
                        price: parseFloat(product.price || '2.00'), // Lower prices for activations
                        currency: 'USD',
                        type: 'activation',
                        country: product.country,
                        productId: product.id,
                        durationInMinutes: 240 // 4 hours default for activations
                    };
                }
            }
        });
        // Add countries based on available activation products
        const availableCountries = [...new Set(activationProducts.map((p) => p.country))];
        const countryIdMap = {
            'Germany': 98,
            'CzechRepublic': 67,
            'Lithuania': 165,
            'Netherlands': 196,
            'Poland': 220,
            'Portugal': 221,
            'SouthAfrica': 252,
            'Sweden': 261,
            'UnitedKingdom': 286,
            'Cyprus': 77,
            'Kenya': 8
        };
        availableCountries.forEach(country => {
            const countryId = countryIdMap[country];
            if (countryId) {
                countries[countryId.toString()] = {
                    name: country.replace(/([A-Z])/g, ' $1').trim(),
                    iso: this.getCountryISOCode(country)
                };
            }
        });
        console.log(`[ANOSIM] Transformed ${Object.keys(services).length} activation services and ${Object.keys(countries).length} countries`);
        return {
            services,
            countries,
            provider: 'anosim',
            type: 'activation'
        };
    },
    /**
     * Get available rental services and countries
     * RENTAL ONLY - Filters out activation products
     */
    async getRentServicesAndCountries() {
        if (!isApiAvailable()) {
            throw new AnosimError('Anosim API key not configured', 'NO_API_KEY');
        }
        try {
            console.log('[ANOSIM] Getting rental services and countries (RENTAL ONLY)');
            // Get all products first
            const allProducts = await this.getProducts();
            console.log(`[ANOSIM] Retrieved ${allProducts.length} total products`);
            // Filter to RENTAL ONLY products - exclude Activation products
            const rentalProducts = allProducts.filter((product) => product.rentalType === 'RentalFull' || product.rentalType === 'RentalService');
            console.log(`[ANOSIM] Filtered to ${rentalProducts.length} rental-only products (excluded ${allProducts.length - rentalProducts.length} activation products)`);
            // Group by rental type for better organization
            const fullRentals = rentalProducts.filter((p) => p.rentalType === 'RentalFull');
            const serviceRentals = rentalProducts.filter((p) => p.rentalType === 'RentalService');
            console.log(`[ANOSIM] Full Country Rentals: ${fullRentals.length}, Service-Specific Rentals: ${serviceRentals.length}`);
            // Transform to focus on rental products, emphasizing full country rentals
            return this.transformRentalProducts(rentalProducts);
        }
        catch (error) {
            console.error('[ANOSIM] Error getting rental services:', error);
            throw error;
        }
    },
    /**
   * Get dual-mode services (both activation and rental)
   * NEW: Supports mode parameter to determine which services to return
   */
    async getDualModeServices(mode = 'rental') {
        try {
            console.log(`[ANOSIM] getDualModeServices called with mode: '${mode}'`);
            console.log(`[ANOSIM] Mode type: ${typeof mode}`);
            console.log(`[ANOSIM] Mode === 'activation': ${mode === 'activation'}`);
            console.log(`[ANOSIM] Mode === 'rental': ${mode === 'rental'}`);
            if (mode === 'activation') {
                console.log(`[ANOSIM] ✅ Calling getActivationServicesAndCountries()`);
                const result = await this.getActivationServicesAndCountries();
                console.log(`[ANOSIM] ✅ Activation result type: ${result.type}`);
                return result;
            }
            else {
                console.log(`[ANOSIM] ✅ Calling getRentServicesAndCountries()`);
                const result = await this.getRentServicesAndCountries();
                console.log(`[ANOSIM] ✅ Rental result type: ${result.type}`);
                return result;
            }
        }
        catch (error) {
            console.error(`[ANOSIM] Error getting ${mode} services:`, error);
            throw error;
        }
    },
    /**
     * Transform rental products into service format
     * Prioritizes Full Country Rentals over service-specific rentals
     */
    transformRentalProducts(rentalProducts) {
        const services = {};
        const countries = {};
        // First, add prioritized FULL COUNTRY RENTALS
        const fullRentals = rentalProducts.filter((p) => p.rentalType === 'RentalFull');
        const countryRentalMap = {
            'Germany': 'full_germany',
            'CzechRepublic': 'full_czechrepublic',
            'Lithuania': 'full_lithuania',
            'Netherlands': 'full_netherlands',
            'Poland': 'full_poland',
            'Portugal': 'full_portugal',
            'SouthAfrica': 'full_southafrica',
            'Sweden': 'full_sweden',
            'UnitedKingdom': 'full_unitedkingdom',
            'Cyprus': 'full_cyprus',
            'Kenya': 'full_kenya'
        };
        // Add full country rentals with proper pricing - these are the main rental offerings
        fullRentals.forEach((product) => {
            const serviceKey = countryRentalMap[product.country];
            if (serviceKey) {
                services[serviceKey] = {
                    name: `Full ${product.country.replace(/([A-Z])/g, ' $1').trim()} Phone Rental`,
                    price: parseFloat(product.price || '15.00'),
                    currency: 'USD',
                    type: 'full_rental',
                    country: product.country,
                    productId: product.id,
                    durationInMinutes: product.durationInMinutes || 10080 // Default 7 days
                };
            }
        });
        // Add a generic "full" service for the cheapest full rental
        if (fullRentals.length > 0) {
            const cheapestFull = fullRentals.sort((a, b) => parseFloat(a.price || '999') - parseFloat(b.price || '999'))[0];
            services['full'] = {
                name: 'Full Phone Rental (Any Country)',
                price: parseFloat(cheapestFull.price || '15.00'),
                currency: 'USD',
                type: 'full_rental',
                country: cheapestFull.country,
                productId: cheapestFull.id,
                durationInMinutes: cheapestFull.durationInMinutes || 10080
            };
        }
        // Limit service-specific rentals to avoid cluttering the rental interface
        const serviceRentals = rentalProducts.filter((p) => p.rentalType === 'RentalService');
        // Only add a few popular service rentals to keep the interface clean for rental mode
        const popularServices = ['Google', 'WhatsApp', 'Telegram', 'Apple', 'Microsoft'];
        serviceRentals.forEach((product) => {
            if (product.service && popularServices.some(popular => product.service.toLowerCase().includes(popular.toLowerCase()))) {
                const serviceCode = PRODUCT_TO_SERVICE_MAPPING[product.service] || 'ot';
                if (!services[serviceCode]) {
                    services[serviceCode] = {
                        name: `${product.service} Rental`,
                        price: parseFloat(product.price || '8.00'),
                        currency: 'USD',
                        type: 'service_rental',
                        country: product.country,
                        productId: product.id,
                        durationInMinutes: product.durationInMinutes || 1440 // Default 24 hours
                    };
                }
            }
        });
        // Add countries based on available rental products
        const availableCountries = [...new Set(rentalProducts.map((p) => p.country))];
        const countryIdMap = {
            'Germany': 98,
            'CzechRepublic': 67,
            'Lithuania': 165,
            'Netherlands': 196,
            'Poland': 220,
            'Portugal': 221,
            'SouthAfrica': 252,
            'Sweden': 261,
            'UnitedKingdom': 286,
            'Cyprus': 77,
            'Kenya': 8
        };
        availableCountries.forEach(country => {
            const countryId = countryIdMap[country];
            if (countryId) {
                countries[countryId.toString()] = {
                    name: country.replace(/([A-Z])/g, ' $1').trim(),
                    iso: this.getCountryISOCode(country)
                };
            }
        });
        console.log(`[ANOSIM] Transformed ${Object.keys(services).length} rental services and ${Object.keys(countries).length} countries`);
        console.log('[ANOSIM] Full country rentals:', Object.keys(services).filter(k => k.startsWith('full_')).length);
        console.log('[ANOSIM] Service rentals:', Object.keys(services).filter(k => !k.startsWith('full_')).length);
        return {
            services,
            countries,
            provider: 'anosim',
            type: 'rental'
        };
    },
    /**
     * Get country ISO code from country name
     */
    getCountryISOCode(countryName) {
        const isoMap = {
            'Germany': 'DE',
            'CzechRepublic': 'CZ',
            'Lithuania': 'LT',
            'Netherlands': 'NL',
            'Poland': 'PL',
            'Portugal': 'PT',
            'SouthAfrica': 'ZA',
            'Sweden': 'SE',
            'UnitedKingdom': 'GB',
            'Cyprus': 'CY',
            'Kenya': 'KE'
        };
        return isoMap[countryName] || 'XX';
    },
    /**
   * Rent a new phone number - RENTAL ONLY
   * Filters out all activation products, focuses on RentalFull and RentalService only
   * Matches the interface: getRentNumber(service, rentTime, operator, country, incomingCall)
   */
    async getRentNumber(service, rentTime = '4', operator = 'any', country = '0', incomingCall = false) {
        try {
            console.log(`[ANOSIM] 🎯 Starting rental request for: ${service}, country: ${country}, time: ${rentTime}h (RENTAL ONLY)`);
            console.log(`[ANOSIM] 🔑 Using API key: ${API_KEY.substring(0, 8)}... (length: ${API_KEY.length})`);
            console.log(`[ANOSIM] 🌐 API endpoint: ${API_BASE_URL}`);
            // Test API authentication first
            try {
                console.log(`[ANOSIM] 🔍 Testing API authentication...`);
                // Map SMS-Activate country codes to Anosim country IDs
                const anosimCountryId = COUNTRY_TO_ANOSIM_ID[country] || 98; // Default to Germany
                console.log(`[ANOSIM] 🗺️ Country mapping: ${country} -> ${anosimCountryId} (Germany)`);
                const testProducts = await this.getProducts(anosimCountryId.toString());
                console.log(`[ANOSIM] ✅ Authentication successful - found ${testProducts.length} products`);
            }
            catch (authError) {
                console.error(`[ANOSIM] ❌ Authentication failed:`, authError.message);
                throw new AnosimError(`Authentication failed: ${authError.message}`, 'AUTH_FAILED');
            }
            // Get all products for the specified country  
            const anosimCountryId = COUNTRY_TO_ANOSIM_ID[country] || 98; // Default to Germany
            const allProducts = await this.getProducts(anosimCountryId.toString());
            console.log(`[ANOSIM] Retrieved ${allProducts.length} total products for country ${anosimCountryId}`);
            // CRITICAL: Filter to RENTAL ONLY products - exclude ALL activation products
            const rentalProducts = allProducts.filter((product) => product.rentalType === 'RentalFull' || product.rentalType === 'RentalService');
            console.log(`[ANOSIM] Filtered to ${rentalProducts.length} RENTAL products (excluded ${allProducts.length - rentalProducts.length} activation products)`);
            if (rentalProducts.length === 0) {
                throw new AnosimError('No rental products available for this country', 'NO_RENTAL_PRODUCTS');
            }
            let selectedProduct = null;
            // Handle full rental requests
            if (service === 'full' || service.startsWith('full_')) {
                const fullProducts = rentalProducts.filter((p) => p.rentalType === 'RentalFull');
                console.log(`[ANOSIM] Found ${fullProducts.length} RentalFull products`);
                if (fullProducts.length === 0) {
                    throw new AnosimError('No full rental products available for this country', 'NO_FULL_PRODUCTS');
                }
                // For specific country requests like "full_germany"
                if (service.startsWith('full_')) {
                    const requestedCountry = service.replace('full_', '');
                    const countryMapping = {
                        'germany': 'Germany',
                        'czechrepublic': 'CzechRepublic',
                        'lithuania': 'Lithuania',
                        'netherlands': 'Netherlands',
                        'poland': 'Poland',
                        'portugal': 'Portugal',
                        'southafrica': 'SouthAfrica',
                        'sweden': 'Sweden',
                        'unitedkingdom': 'UnitedKingdom',
                        'cyprus': 'Cyprus',
                        'kenya': 'Kenya'
                    };
                    const targetCountry = countryMapping[requestedCountry];
                    if (targetCountry) {
                        const countryProducts = fullProducts.filter((p) => p.country === targetCountry);
                        if (countryProducts.length > 0) {
                            // For Germany, map rent time to specific duration/price
                            if (targetCountry === 'Germany') {
                                const rentTimeHours = parseInt(rentTime || '168');
                                let targetPrice = null;
                                // Map rent time to German pricing
                                switch (rentTimeHours) {
                                    case 4: // 4 hours  
                                        targetPrice = { min: 2, max: 4 }; // $3.00
                                        break;
                                    case 24: // 1 day
                                        targetPrice = { min: 3.5, max: 4.5 }; // $4.00
                                        break;
                                    case 168: // 7 days
                                        targetPrice = { min: 10, max: 12 }; // $10.85
                                        break;
                                    case 720: // 30 days
                                        targetPrice = { min: 28, max: 32 }; // $30.00
                                        break;
                                    case 2160: // 90 days
                                        targetPrice = { min: 58, max: 62 }; // $60.00
                                        break;
                                    case 4320: // 180 days
                                        targetPrice = { min: 98, max: 102 }; // $100.00
                                        break;
                                    case 8760: // 360 days
                                        targetPrice = { min: 148, max: 152 }; // $150.00
                                        break;
                                    default:
                                        targetPrice = { min: 10, max: 12 }; // Default to 7 days
                                }
                                if (targetPrice) {
                                    selectedProduct = countryProducts.find((p) => {
                                        const price = parseFloat(p.price || '999');
                                        return price >= targetPrice.min && price <= targetPrice.max;
                                    });
                                }
                            }
                            // If no specific price match, take the first available
                            if (!selectedProduct) {
                                selectedProduct = countryProducts[0];
                            }
                        }
                    }
                }
                else {
                    // Generic full rental request
                    selectedProduct = fullProducts[0];
                }
            }
            // Handle service-specific rentals
            else {
                const serviceProducts = rentalProducts.filter((p) => p.rentalType === 'RentalService');
                console.log(`[ANOSIM] Found ${serviceProducts.length} RentalService products`);
                // Map service codes to names
                const serviceName = SERVICE_TO_PRODUCT_MAPPING[service];
                if (!serviceName) {
                    throw new AnosimError(`Unsupported service code: ${service}`, 'UNSUPPORTED_SERVICE');
                }
                // Find matching product
                selectedProduct = serviceProducts.find((p) => p.service && p.service.toLowerCase().includes(serviceName.toLowerCase()));
                if (!selectedProduct) {
                    // Try reverse matching
                    selectedProduct = serviceProducts.find((p) => p.service && serviceName.toLowerCase().includes(p.service.toLowerCase()));
                }
                console.log(`[ANOSIM] Looking for service "${serviceName}", found:`, selectedProduct);
            }
            if (!selectedProduct) {
                const availableProducts = rentalProducts.slice(0, 5).map((p) => `${p.rentalType}:${p.service || 'Full'}:${p.country}:$${p.price}`);
                throw new AnosimError(`No suitable rental product found for service: ${service}. Available: ${availableProducts.join(', ')}`, 'PRODUCT_NOT_FOUND');
            }
            console.log(`[ANOSIM] Creating order for rental product ID: ${selectedProduct.id} (${selectedProduct.rentalType})`);
            // Create order according to API documentation
            const order = await this.createOrder(selectedProduct.id.toString(), '1', '0');
            console.log(`[ANOSIM] Rental order created successfully:`, order);
            // Extract phone data from order response - handle different response structures
            let phoneNumber;
            let bookingId;
            let actualCountry;
            let orderId;
            // Check if this is a direct booking response (current active bookings format)
            if (order.number) {
                phoneNumber = order.number;
                bookingId = order.id.toString();
                actualCountry = order.country || selectedProduct.country || 'Unknown';
                orderId = order.orderId || order.id.toString();
            }
            // Check if this is an order with orderBookings array
            else if (order.orderBookings && Array.isArray(order.orderBookings) && order.orderBookings.length > 0) {
                const booking = order.orderBookings[0];
                phoneNumber = booking.number || booking.simCard?.phoneNumber;
                bookingId = booking.id.toString();
                actualCountry = booking.country || selectedProduct.country || 'Unknown';
                orderId = order.id.toString();
            }
            // Check if this is a simple order response with embedded booking
            else if (order.id) {
                // For cases where the API returns minimal data, we may need to fetch the current bookings
                console.log('[ANOSIM] Order created but phone number not immediately available, checking current bookings...');
                try {
                    const currentBookings = await this.getCurrentOrderBookings();
                    const latestBooking = currentBookings.find((booking) => booking.id && (!booking.endDate || new Date(booking.endDate) > new Date()));
                    if (latestBooking && latestBooking.number) {
                        phoneNumber = latestBooking.number;
                        bookingId = latestBooking.id.toString();
                        actualCountry = latestBooking.country || selectedProduct.country || 'Unknown';
                        orderId = order.id.toString();
                    }
                    else {
                        throw new AnosimError('Order created but no active phone number found', 'NO_PHONE_ALLOCATED');
                    }
                }
                catch (fetchError) {
                    console.error('[ANOSIM] Error fetching current bookings:', fetchError);
                    throw new AnosimError('Order created but unable to retrieve phone number', 'PHONE_FETCH_FAILED');
                }
            }
            else {
                throw new AnosimError('Order created but no phone number allocated', 'NO_PHONE_ALLOCATED');
            }
            if (!phoneNumber) {
                throw new AnosimError('Order booking missing phone number', 'MISSING_PHONE_NUMBER');
            }
            console.log(`[ANOSIM] ✅ Phone number rented: ${phoneNumber} (${actualCountry}, ${selectedProduct.rentalType})`);
            // Return in expected format
            return {
                activationId: bookingId,
                phone: { number: phoneNumber },
                id: bookingId,
                order_id: orderId,
                order_booking_id: bookingId,
                phone_number: phoneNumber,
                rent_id: bookingId,
                provider_id: selectedProduct.id,
                auto_renewal: false, // Anosim doesn't seem to have auto-renewal in the response
                country: actualCountry, // Include actual country from API response
                service: selectedProduct.rentalType === 'RentalFull' ? `full_${actualCountry.toLowerCase()}` : service, // Provide proper service name
                rental_type: selectedProduct.rentalType // Include rental type for clarity
            };
        }
        catch (error) {
            console.error('[ANOSIM] Error renting number:', error);
            throw error;
        }
    },
    /**
     * Get status and messages for a rented number
     * Matches the interface: getRentStatus(id, page, size)
     */
    async getRentStatus(id, page = '0', size = '10') {
        try {
            console.log(`[ANOSIM] Getting rental status for ID: ${id}`);
            // Get SMS messages for the order booking
            const smsMessages = await this.getSms(id);
            // Transform to expected format
            const messages = this.transformSmsToMessages(smsMessages);
            return {
                status: 'success',
                messages,
                values: messages // Alternative field name
            };
        }
        catch (error) {
            console.error('[ANOSIM] Error getting rental status:', error);
            throw error;
        }
    },
    /**
     * Change rental status (finish or cancel)
     * Matches the interface: setRentStatus(id, status)
     */
    async setRentStatus(id, status // 1 = Finish, 2 = Cancel
    ) {
        try {
            console.log(`[ANOSIM] Setting rental status for ID: ${id}, status: ${status}`);
            if (status === '2') {
                // Cancel the order booking
                const result = await this.cancelOrderBooking(id);
                return {
                    success: result.success || true,
                    status: 'cancelled'
                };
            }
            else {
                // For finish, just return success
                return {
                    success: true,
                    status: 'finished'
                };
            }
        }
        catch (error) {
            console.error('[ANOSIM] Error setting rental status:', error);
            throw error;
        }
    },
    /**
     * Extend a rental
     * Matches the interface: continueRentNumber(id, rentTime)
     */
    async continueRentNumber(id, rentTime = '4') {
        try {
            console.log(`[ANOSIM] Extending rental for ID: ${id}, time: ${rentTime}h`);
            // Convert hours to minutes
            const extensionMinutes = (parseInt(rentTime) * 60).toString();
            const result = await this.extendOrderBooking(id, extensionMinutes);
            return {
                success: true,
                message: `Rental extended by ${rentTime} hours`,
                data: result
            };
        }
        catch (error) {
            console.error('[ANOSIM] Error extending rental:', error);
            throw error;
        }
    },
    /**
     * Get list of active rentals
     * Matches the interface: getRentList()
     */
    async getRentList() {
        try {
            console.log('[ANOSIM] Getting rental list');
            const orderBookings = await this.getCurrentOrderBookings();
            // Transform to expected format
            const rentals = orderBookings
                .map((booking) => this.transformOrderBookingToRental(booking))
                .filter((rental) => rental !== null);
            return {
                status: 'success',
                rentals,
                values: rentals // Alternative field name
            };
        }
        catch (error) {
            console.error('[ANOSIM] Error getting rental list:', error);
            throw error;
        }
    },
    /**
     * Get activation number (single SMS)
     * NEW: Support for activation mode
     */
    async getActivationNumber(service, country = '98') {
        try {
            console.log(`[ANOSIM] Getting activation number for service: ${service}, country: ${country}`);
            // Get all products for the specified country  
            const allProducts = await this.getProducts(country);
            console.log(`[ANOSIM] Retrieved ${allProducts.length} total products for country ${country}`);
            // First try to find activation products
            let activationProducts = allProducts.filter((product) => product.rentalType === 'Activation');
            // If no activation products, use service rentals as alternatives
            if (activationProducts.length === 0) {
                console.log('[ANOSIM] No Activation products found, using RentalService as activation alternatives');
                activationProducts = allProducts.filter((product) => product.rentalType === 'RentalService');
            }
            console.log(`[ANOSIM] Found ${activationProducts.length} activation products`);
            if (activationProducts.length === 0) {
                throw new AnosimError('No activation products available for this country', 'NO_ACTIVATION_PRODUCTS');
            }
            // Find matching service
            const serviceName = SERVICE_TO_PRODUCT_MAPPING[service];
            if (!serviceName) {
                throw new AnosimError(`Unsupported service code: ${service}`, 'UNSUPPORTED_SERVICE');
            }
            let selectedProduct = activationProducts.find((p) => p.service && p.service.toLowerCase().includes(serviceName.toLowerCase()));
            if (!selectedProduct) {
                // Try reverse matching
                selectedProduct = activationProducts.find((p) => p.service && serviceName.toLowerCase().includes(p.service.toLowerCase()));
            }
            // If still no match, use the first available
            if (!selectedProduct) {
                selectedProduct = activationProducts[0];
                console.log(`[ANOSIM] No exact service match found, using first available: ${selectedProduct.service}`);
            }
            console.log(`[ANOSIM] Creating activation order for product ID: ${selectedProduct.id}`);
            // Create order with shorter duration for activation
            const order = await this.createOrder(selectedProduct.id.toString(), '1', '0');
            console.log(`[ANOSIM] Activation order created successfully:`, order);
            // Extract phone data from order response  
            if (!order || !order.orderBookings || order.orderBookings.length === 0) {
                throw new AnosimError('Order created but no phone number allocated', 'NO_PHONE_ALLOCATED');
            }
            const booking = order.orderBookings[0];
            if (!booking.number) {
                throw new AnosimError('Order booking missing phone number', 'MISSING_PHONE_NUMBER');
            }
            console.log(`[ANOSIM] ✅ Activation number acquired: ${booking.number} (${booking.country})`);
            // Return in activation format
            return {
                activationId: booking.id,
                phoneNumber: booking.number,
                activationCost: parseFloat(selectedProduct.price || '2.00'),
                service: service,
                country: booking.country,
                endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
            };
        }
        catch (error) {
            console.error('[ANOSIM] Error getting activation number:', error);
            throw error;
        }
    },
    /**
     * Handle API errors
     */
    handleApiError(error) {
        if (error instanceof AnosimError) {
            return error;
        }
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            switch (status) {
                case 401:
                    return new AnosimError('Invalid API key', 'INVALID_API_KEY');
                case 403:
                    return new AnosimError('API access forbidden', 'ACCESS_FORBIDDEN');
                case 404:
                    return new AnosimError('Resource not found', 'NOT_FOUND');
                case 429:
                    return new AnosimError('Rate limit exceeded', 'RATE_LIMITED');
                case 500:
                    return new AnosimError('Internal server error', 'SERVER_ERROR');
                default:
                    return new AnosimError(data?.message || `HTTP ${status} error`, `HTTP_${status}`);
            }
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return new AnosimError('Connection failed', 'CONNECTION_ERROR');
        }
        if (error.code === 'ECONNABORTED') {
            return new AnosimError('Request timeout', 'TIMEOUT');
        }
        return new AnosimError(error.message || 'Unknown API error', 'UNKNOWN_ERROR');
    }
};
