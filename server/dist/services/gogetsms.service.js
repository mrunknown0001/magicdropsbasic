"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gogetSmsService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const retry_1 = require("../utils/retry");
dotenv_1.default.config();
// GoGetSMS API Configuration
const API_BASE_URL = 'https://www.gogetsms.com/handler_api.php';
const API_KEY = process.env.GOGETSMS_API_KEY?.trim() || '';
if (!API_KEY) {
    console.warn('[GOGETSMS] API key not configured. Set GOGETSMS_API_KEY environment variable.');
}
else {
    console.log(`[GOGETSMS] API configured with key: ${API_KEY.substring(0, 8)}... (length: ${API_KEY.length})`);
}
// Error class for GoGetSMS API errors
class GoGetSmsError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'GoGetSmsError';
        this.code = code;
    }
}
/**
 * Check if GoGetSMS API is available (has API key)
 */
const isApiAvailable = () => {
    return !!API_KEY && API_KEY.length > 0;
};
// Rate limiting for GoGetSMS (10 requests per minute)
class GoGetSmsRateLimit {
    constructor() {
        this.requests = [];
        this.MAX_REQUESTS = 10;
        this.TIME_WINDOW = 60000; // 1 minute in milliseconds
    }
    async waitForRateLimit() {
        const now = Date.now();
        // Remove old requests outside the time window
        this.requests = this.requests.filter(time => now - time < this.TIME_WINDOW);
        // If we've hit the limit, wait
        if (this.requests.length >= this.MAX_REQUESTS) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.TIME_WINDOW - (now - oldestRequest) + 1000; // Add 1 second buffer
            console.log(`[GOGETSMS] Rate limit reached. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            // Recursively check again
            return this.waitForRateLimit();
        }
        // Track this request
        this.requests.push(now);
    }
}
const rateLimit = new GoGetSmsRateLimit();
// Service code mappings from standard codes to GoGetSMS RENTAL API service IDs
// Based on RENTAL API SERVICES LIST from documentation - RENTAL ONLY, NO ACTIVATIONS
const SERVICE_CODE_MAPPING = {
    // Core messaging services for rental
    'wa': '3', // WhatsApp
    'tg': '5', // Telegram  
    'go': '7', // Google,youtube,Gmail
    'fb': '9', // Facebook
    'tw': '10', // Twitter
    'ig': '15', // Instagram
    'ms': '19', // Microsoft
    'vi': '4', // Viber
    'wb': '6', // WeChat
    'ub': '11', // Uber
    'ds': '48', // Discord
    'am': '62', // Amazon
    'mb': '22', // Yahoo
    'ts': '137', // PayPal
    'vk': '483', // VK.com
    'hw': '93', // Alipay/Alibaba
    'ap': '254', // Apple
    'dh': '129', // eBay
    'mt': '28', // Steam
    'fu': '75', // Snapchat
    'oi': '29', // Tinder
    'lf': '51', // TikTok/Douyin
    'ot': '1', // OTHER (not guaranteed)
    'default': '1' // Default to OTHER
};
// Full country rental mapping - prioritized for rental use
const FULL_COUNTRY_RENTAL_MAPPING = {
    'full_uk': 'GB', // United Kingdom
    'full_germany': 'DE', // Germany
    'full_usa': 'US', // United States
    'full_lithuania': 'LT', // Lithuania
    'full_poland': 'PL', // Poland
    'full_netherlands': 'NL', // Netherlands
    'full_france': 'FR', // France
    'full_spain': 'ES', // Spain
    'full_italy': 'IT', // Italy
    'full_czechrepublic': 'CZ', // Czech Republic
    'full_portugal': 'PT', // Portugal
    'full_sweden': 'SE', // Sweden
    'full_finland': 'FI', // Finland
    'full_denmark': 'DK', // Denmark
    'full_estonia': 'EE', // Estonia
    'full_latvia': 'LV', // Latvia
    'full_ireland': 'IE', // Ireland
    'full_austria': 'AT', // Austria
    'full_belgium': 'BE', // Belgium
    'full_romania': 'RO', // Romania
    'full_greece': 'GR', // Greece
    'full_croatia': 'HR', // Croatia
    'full_slovenia': 'SI', // Slovenia
    'full_slovakia': 'SK', // Slovakia
    'full_hungary': 'HU', // Hungary
    'full_bulgaria': 'BG', // Bulgaria
    'full_cyprus': 'CY', // Cyprus
    'full_malta': 'MT', // Malta
    'full_switzerland': 'CH', // Switzerland
    'full_vietnam': 'VN', // Vietnam
    'full_mexico': 'MX', // Mexico
    'full_morocco': 'MA', // Morocco
    'full_japan': 'JP', // Japan
    'full_brazil': 'BR', // Brazil
    'full_india': 'IN', // India
    'full_newzealand': 'NZ', // New Zealand
    'full_thailand': 'TH', // Thailand
    'full_philippines': 'PH', // Philippines
    'full_australia': 'AU', // Australia
    'full_hongkong': 'HK', // Hong Kong
    'full_malaysia': 'MY', // Malaysia
    'full_norway': 'NO', // Norway
    'default_country': 'GB' // Default to UK
};
// Reverse mapping for service codes - RENTAL FOCUSED
const SERVICE_TO_PRODUCT_MAPPING = {
    'whatsapp': 'wa',
    'telegram': 'tg',
    'google': 'go',
    'facebook': 'fb',
    'twitter': 'tw',
    'instagram': 'ig',
    'microsoft': 'ms',
    'viber': 'vi',
    'wechat': 'wb',
    'uber': 'ub',
    'discord': 'ds',
    'amazon': 'am',
    'yahoo': 'mb',
    'paypal': 'ts',
    'vk': 'vk',
    'alipay': 'hw',
    'apple': 'ap',
    'ebay': 'dh',
    'steam': 'mt',
    'snapchat': 'fu',
    'tinder': 'oi',
    'tiktok': 'lf',
    'other': 'ot'
};
// === DUAL-MODE COUNTRY MAPPING SYSTEM ===
// Activation API uses numeric country codes (from main API documentation)
const ACTIVATION_COUNTRY_MAPPING = {
    // Standard numeric codes for activation API
    '0': 'RU', // Russia (default fallback)
    '1': 'UA', // Ukraine
    '2': 'KZ', // Kazakhstan
    '3': 'CN', // China
    '4': 'PH', // Philippines
    '5': 'MM', // Myanmar
    '6': 'ID', // Indonesia
    '7': 'MY', // Malaysia
    '8': 'KE', // Kenya
    '11': 'KG', // Kyrgyzstan
    '13': 'IL', // Israel
    '14': 'HK', // Hong Kong
    '15': 'PL', // Poland
    '16': 'GB', // United Kingdom
    '17': 'MG', // Madagascar
    '19': 'NG', // Nigeria
    '21': 'EG', // Egypt
    '23': 'IE', // Ireland
    '24': 'KH', // Cambodia
    '25': 'LA', // Laos
    '26': 'HT', // Haiti
    '29': 'RS', // Serbia
    '31': 'ZA', // South Africa
    '32': 'RO', // Romania
    '33': 'CO', // Colombia
    '34': 'EE', // Estonia
    '37': 'MA', // Morocco
    '38': 'GH', // Ghana
    '39': 'AR', // Argentina
    '40': 'UZ', // Uzbekistan
    '41': 'CM', // Cameroon
    '43': 'DE', // Germany
    '44': 'LT', // Lithuania
    '45': 'HR', // Croatia
    '46': 'SE', // Sweden
    '47': 'IQ', // Iraq
    '48': 'NL', // Netherlands
    '49': 'LV', // Latvia
    '50': 'AT', // Austria
    '51': 'BY', // Belarus
    '52': 'TH', // Thailand
    '54': 'MX', // Mexico
    '56': 'ES', // Spain
    '59': 'SI', // Slovenia
    '60': 'BD', // Bangladesh
    '63': 'CZ', // Czech Republic
    '64': 'LK', // Sri Lanka
    '65': 'PE', // Peru
    '66': 'PK', // Pakistan
    '67': 'NZ', // New Zealand
    '70': 'VE', // Venezuela
    '71': 'ET', // Ethiopia
    '73': 'BR', // Brazil
    '77': 'CY', // Cyprus
    '78': 'FR', // France
    '82': 'BE', // Belgium
    '83': 'BG', // Bulgaria
    '84': 'HU', // Hungary
    '85': 'MD', // Moldova
    '86': 'IT', // Italy
    '95': 'AE', // United Arab Emirates
    '108': 'BA', // Bosnia and Herzegovina
    '117': 'PT', // Portugal
    '128': 'GE', // Georgia
    '129': 'GR', // Greece
    '141': 'SK', // Slovakia
    '163': 'FI', // Finland
    '171': 'ME', // Montenegro
    '172': 'DK', // Denmark
    '174': 'NO', // Norway
    '175': 'AU', // Australia
    '182': 'JP', // Japan
    '183': 'MK', // Macedonia
    '187': 'US', // United States
    '196': 'SG', // Singapore
    '199': 'MT', // Malta
    '201': 'GI', // Gibraltar
    'default': 'GB' // Default to UK
};
// Rental API uses 2-letter ISO country codes (from rental API response)
const RENTAL_COUNTRY_MAPPING = {
    // Standard 2-letter codes for rental API
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'US': 'United States',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'PT': 'Portugal',
    'SE': 'Sweden',
    'FI': 'Finland',
    'DK': 'Denmark',
    'EE': 'Estonia',
    'LV': 'Latvia',
    'LT': 'Lithuania',
    'IE': 'Ireland',
    'AT': 'Austria',
    'BE': 'Belgium',
    'RO': 'Romania',
    'GR': 'Greece',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'HU': 'Hungary',
    'BG': 'Bulgaria',
    'CY': 'Cyprus',
    'MT': 'Malta',
    'CH': 'Switzerland',
    'BA': 'Bosnia and Herzegovina',
    'VN': 'Vietnam',
    'MX': 'Mexico',
    'MA': 'Morocco',
    'JP': 'Japan',
    'BR': 'Brazil',
    'IN': 'India',
    'GI': 'Gibraltar',
    'NZ': 'New Zealand',
    'TH': 'Thailand',
    'PH': 'Philippines',
    'AU': 'Australia',
    'HK': 'Hong Kong',
    'MY': 'Malaysia',
    'NO': 'Norway',
    'default': 'GB' // Default to UK
};
// Bidirectional mapping: Frontend country codes to GoGetSMS codes
const COUNTRY_CODE_MAPPING = {
    // Map frontend codes to both activation (numeric) and rental (2-letter) formats
    '43': { activation: '43', rental: 'DE' }, // Germany  
    '44': { activation: '16', rental: 'GB' }, // United Kingdom
    '1': { activation: '187', rental: 'US' }, // United States
    '33': { activation: '78', rental: 'FR' }, // France
    '39': { activation: '86', rental: 'IT' }, // Italy
    '34': { activation: '56', rental: 'ES' }, // Spain
    '31': { activation: '48', rental: 'NL' }, // Netherlands
    '48': { activation: '15', rental: 'PL' }, // Poland
    '420': { activation: '63', rental: 'CZ' }, // Czech Republic
    '351': { activation: '117', rental: 'PT' }, // Portugal
    '46': { activation: '46', rental: 'SE' }, // Sweden
    '358': { activation: '163', rental: 'FI' }, // Finland
    '45': { activation: '172', rental: 'DK' }, // Denmark
    '372': { activation: '34', rental: 'EE' }, // Estonia
    '371': { activation: '49', rental: 'LV' }, // Latvia
    '370': { activation: '44', rental: 'LT' }, // Lithuania
    '353': { activation: '23', rental: 'IE' }, // Ireland
    '43_at': { activation: '50', rental: 'AT' }, // Austria
    '32': { activation: '82', rental: 'BE' }, // Belgium
    // Add 2-letter ISO codes that the frontend actually sends
    'DE': { activation: '43', rental: 'DE' }, // Germany  
    'GB': { activation: '16', rental: 'GB' }, // United Kingdom
    'US': { activation: '187', rental: 'US' }, // United States
    'FR': { activation: '78', rental: 'FR' }, // France
    'IT': { activation: '86', rental: 'IT' }, // Italy
    'ES': { activation: '56', rental: 'ES' }, // Spain
    'NL': { activation: '48', rental: 'NL' }, // Netherlands
    'PL': { activation: '15', rental: 'PL' }, // Poland
    'CZ': { activation: '63', rental: 'CZ' }, // Czech Republic
    'PT': { activation: '117', rental: 'PT' }, // Portugal
    'SE': { activation: '46', rental: 'SE' }, // Sweden
    'FI': { activation: '163', rental: 'FI' }, // Finland
    'DK': { activation: '172', rental: 'DK' }, // Denmark
    'EE': { activation: '34', rental: 'EE' }, // Estonia
    'LV': { activation: '49', rental: 'LV' }, // Latvia
    'LT': { activation: '44', rental: 'LT' }, // Lithuania
    'IE': { activation: '23', rental: 'IE' }, // Ireland
    'AT': { activation: '50', rental: 'AT' }, // Austria
    'BE': { activation: '82', rental: 'BE' }, // Belgium
    '40': { activation: '32', rental: 'RO' }, // Romania
    '30': { activation: '129', rental: 'GR' }, // Greece
    '385': { activation: '45', rental: 'HR' }, // Croatia
    '386': { activation: '59', rental: 'SI' }, // Slovenia
    '421': { activation: '141', rental: 'SK' }, // Slovakia
    '36': { activation: '84', rental: 'HU' }, // Hungary
    '359': { activation: '83', rental: 'BG' }, // Bulgaria
    '357': { activation: '77', rental: 'CY' }, // Cyprus
    '356': { activation: '199', rental: 'MT' }, // Malta
    '0': { activation: '0', rental: 'RU' }, // Russia (fallback)
    'default': { activation: '16', rental: 'GB' } // Default to UK
};
// Error message mappings
const ERROR_MAPPING = {
    'BAD_KEY': 'Invalid API key',
    'BAD_ACTION': 'Invalid action parameter',
    'BAD_SERVICE': 'Invalid service parameter',
    'BAD_COUNTRY': 'Invalid country parameter',
    'NO_ACTIVATION': 'Activation not found',
    'STATUS_CANCEL': 'Order cancelled',
    'STATUS_WAIT_CODE': 'Waiting for SMS code',
    'NOT_ENOUGH_FUNDS': 'Insufficient balance for this rental. Full country rentals typically cost €10-50+. Current balance: €6.68. Please consider using activation mode (cheaper) or top up your account.',
    'ACCOUNT_BLOCKED': 'Account is blocked',
    'NO_NUMBERS': 'No numbers available for this service/country combination',
    'SERVICE_NOT_AVAILABLE': 'Service temporarily unavailable'
};
/**
 * GoGetSMS API Service
 * Implements the same interface as SMS-Activate, SMSPVA, and Anosim services
 */
exports.gogetSmsService = {
    /**
     * Check if the service is available
     */
    isAvailable: isApiAvailable,
    /**
     * Handle API errors with proper error mapping
     */
    handleApiError(error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response) {
                const data = error.response.data;
                // Handle string error responses
                if (typeof data === 'string') {
                    const errorCode = data.trim().toUpperCase();
                    const errorMessage = ERROR_MAPPING[errorCode] || `API returned error: ${data}`;
                    return new GoGetSmsError(errorMessage, errorCode);
                }
                // Handle JSON error responses
                if (data && data.error) {
                    return new GoGetSmsError(data.error, 'API_ERROR');
                }
            }
            return new GoGetSmsError(`Network error: ${error.message}`, 'NETWORK_ERROR');
        }
        return new GoGetSmsError(error.message || 'Unknown error', 'UNKNOWN_ERROR');
    },
    /**
     * Make API request to GoGetSMS with rate limiting and error handling
     */
    async makeApiRequest(params) {
        await rateLimit.waitForRateLimit();
        const fullParams = {
            api_key: API_KEY,
            ...params
        };
        console.log(`[GOGETSMS] 🔑 API Key used: ${API_KEY.substring(0, 8)}...${API_KEY.substring(-4)} (length: ${API_KEY.length})`);
        console.log(`[GOGETSMS] 📤 Request params:`, fullParams);
        console.log(`[GOGETSMS] 🌐 Full API URL: ${API_BASE_URL}?${new URLSearchParams(fullParams).toString()}`);
        try {
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: fullParams,
                timeout: 15000
            }), 3, 2000);
            console.log(`[GOGETSMS] 📥 Raw response status: ${response.status}`);
            console.log(`[GOGETSMS] 📥 Raw response data:`, response.data);
            console.log(`[GOGETSMS] 📥 Response type: ${typeof response.data}`);
            // Check if the response contains an error string
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                console.log(`[GOGETSMS] 🔍 Checking error code: "${errorCode}"`);
                if (['BAD_SERVICE', 'BAD_COUNTRY', 'BAD_KEY', 'BAD_ACTION'].includes(errorCode)) {
                    console.log(`[GOGETSMS] ❌ API returned error: ${errorCode}`);
                    // Create a fake error response to trigger our error handling
                    const fakeError = new Error('GoGetSMS API Error');
                    fakeError.response = { data: response.data };
                    throw fakeError;
                }
            }
            console.log(`[GOGETSMS] ✅ API call successful`);
            return response;
        }
        catch (error) {
            console.log(`[GOGETSMS] 💥 API call failed:`, error.message);
            if (error.response) {
                console.log(`[GOGETSMS] 💥 Error response status:`, error.response.status);
                console.log(`[GOGETSMS] 💥 Error response data:`, error.response.data);
            }
            throw error;
        }
    },
    /**
     * Get account balance
     */
    async getBalance() {
        try {
            console.log(`[GOGETSMS] 🔍 Testing balance endpoint for authentication...`);
            const response = await this.makeApiRequest({
                action: 'getBalance'
            });
            console.log('[GOGETSMS] Balance response:', response.data);
            // GoGetSMS returns balance in format: ACCESS_BALANCE:amount
            if (typeof response.data === 'string' && response.data.startsWith('ACCESS_BALANCE:')) {
                const balance = parseFloat(response.data.split(':')[1] || '0');
                console.log(`[GOGETSMS] ✅ Balance check successful: ${balance}`);
                return { balance };
            }
            else {
                console.log(`[GOGETSMS] ❌ Unexpected balance response: ${response.data}`);
                throw new GoGetSmsError(`Unexpected balance response: ${response.data}`, 'INVALID_BALANCE_RESPONSE');
            }
        }
        catch (error) {
            console.error('[GOGETSMS] ❌ Balance check failed:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get services and prices for a specific country
     */
    async getPrices(country = '0') {
        try {
            console.log(`[GOGETSMS] Getting prices for country: ${country}`);
            const response = await this.makeApiRequest({
                action: 'getPrices',
                country: country
            });
            console.log('[GOGETSMS] Prices response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[GOGETSMS] Error getting prices:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Request a phone number for activation (V2 API - preferred)
     */
    async getNumberV2(service, country = '0') {
        try {
            console.log(`[GOGETSMS] Getting number V2 for service: ${service}, country: ${country}`);
            const response = await this.makeApiRequest({
                action: 'getNumberV2',
                service: service,
                country: country
            });
            console.log('[GOGETSMS] Number V2 response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[GOGETSMS] Error getting number V2:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Check SMS status for an activation
     */
    async getStatus(id) {
        try {
            console.log(`[GOGETSMS] Getting status for activation: ${id}`);
            const response = await this.makeApiRequest({
                action: 'getStatus',
                id: id
            });
            console.log('[GOGETSMS] Status response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[GOGETSMS] Error getting status:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Cancel or close an activation
     */
    async setStatus(id, status) {
        try {
            console.log(`[GOGETSMS] Setting status for activation: ${id}, status: ${status}`);
            const response = await this.makeApiRequest({
                action: 'setStatus',
                id: id,
                status: status
            });
            console.log('[GOGETSMS] Set status response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[GOGETSMS] Error setting status:', error);
            throw this.handleApiError(error);
        }
    },
    // === RENTAL API METHODS ===
    /**
     * Get available rental services and countries
     * Matches the interface of SMS-Activate and other services
     */
    async getRentServicesAndCountries(rentTime = '4', operator = 'any', country = '0') {
        if (!isApiAvailable()) {
            throw new GoGetSmsError('GoGetSMS API key not configured', 'NO_API_KEY');
        }
        try {
            console.log('[GOGETSMS] Getting rental services and countries');
            // Translate country code to GoGetSMS format if specific country requested
            const gogetSmsCountry = country === 'all_countries' ? undefined : (COUNTRY_CODE_MAPPING[country]?.rental || 'GB');
            console.log(`[GOGETSMS] Using country for services: ${gogetSmsCountry || 'all'}`);
            const params = {
                action: 'getRentServicesAndCountries',
                rent_time: rentTime
            };
            // Only add country parameter if specific country requested
            if (gogetSmsCountry) {
                params.country = gogetSmsCountry;
            }
            const response = await this.makeApiRequest(params);
            console.log('[GOGETSMS] Rental services response:', response.data);
            // Transform response to match expected format
            return this.transformServicesResponse(response.data);
        }
        catch (error) {
            console.error('[GOGETSMS] Error getting rental services:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Rent a phone number - Using exact GoGetSMS rental API documentation
     */
    async getRentNumber(service, rentTime = '4', operator = 'any', country = '0', incomingCall = false) {
        // Declare variables at function scope
        let gogetSmsService = '1'; // Default to OTHER
        let gogetSmsCountry = 'GB'; // Default to UK
        try {
            console.log(`[GOGETSMS] 🎯 Starting rental request for: ${service}, country: ${country}, time: ${rentTime}h`);
            // First test basic API access with balance
            console.log(`[GOGETSMS] 🔍 Testing basic API access with balance check...`);
            try {
                const balanceResult = await this.getBalance();
                console.log(`[GOGETSMS] ✅ Balance check successful:`, balanceResult);
            }
            catch (balanceError) {
                console.log(`[GOGETSMS] ❌ Balance check failed - API key may be invalid:`, balanceError.message);
                throw new GoGetSmsError(`API authentication failed: ${balanceError.message}`, 'AUTH_FAILED');
            }
            // Check available rental services first
            console.log(`[GOGETSMS] 🔍 Checking available rental services...`);
            try {
                // First check if rental services endpoint is accessible
                const servicesParams = {
                    action: 'getRentServicesAndCountries'
                };
                console.log(`[GOGETSMS] 🔍 Testing rental services endpoint:`, servicesParams);
                const servicesResponse = await this.makeApiRequest(servicesParams);
                console.log(`[GOGETSMS] 📥 Rental services response:`, servicesResponse.data);
                // Check if response indicates rental API access
                if (typeof servicesResponse.data === 'string') {
                    if (servicesResponse.data === 'BAD_ACTION') {
                        console.log(`[GOGETSMS] ❌ BAD_ACTION - Rental API not available for this account`);
                        throw new GoGetSmsError('Your GoGetSMS account does not have access to the rental API. Please upgrade your account or contact GoGetSMS support.', 'NO_RENTAL_API_ACCESS');
                    }
                    else if (servicesResponse.data === 'BAD_KEY') {
                        console.log(`[GOGETSMS] ❌ BAD_KEY - API key invalid for rental services`);
                        throw new GoGetSmsError('API key invalid for rental services', 'INVALID_API_KEY');
                    }
                    else if (servicesResponse.data.startsWith('ERROR')) {
                        console.log(`[GOGETSMS] ❌ Rental services error:`, servicesResponse.data);
                        throw new GoGetSmsError(`Rental services error: ${servicesResponse.data}`, 'RENTAL_SERVICES_ERROR');
                    }
                }
                console.log(`[GOGETSMS] ✅ Rental services endpoint accessible`);
            }
            catch (servicesError) {
                console.log(`[GOGETSMS] ❌ Failed to get rental services:`, servicesError.message);
                // If it's our custom error, throw it
                if (servicesError instanceof GoGetSmsError) {
                    throw servicesError;
                }
                // Otherwise, provide helpful diagnostic
                throw new GoGetSmsError(`Cannot access rental services: ${servicesError.message}. This may indicate your account doesn't have rental API access.`, 'RENTAL_SERVICES_FAILED');
            }
            // Validate rental time according to GoGetSMS documentation
            const validRentTimes = ['4', '24', '72', '168', '360', '720'];
            if (!validRentTimes.includes(rentTime)) {
                console.log(`[GOGETSMS] Invalid rent time: ${rentTime}, using default: 168`);
                rentTime = '168'; // Default to 7 days
            }
            // Handle full country rentals
            if (service.startsWith('full_')) {
                console.log(`[GOGETSMS] Handling full country rental: ${service}`);
                // Map full country service to country code using GoGetSMS rental API country codes
                gogetSmsCountry = FULL_COUNTRY_RENTAL_MAPPING[service] || 'GB'; // Default to UK
                // For full country rentals, use OTHER service (most universal for rentals)
                gogetSmsService = '1'; // OTHER - according to GoGetSMS rental services list
                console.log(`[GOGETSMS] Full country rental - Service: OTHER (1), Country: ${gogetSmsCountry}`);
            }
            else {
                // Handle service-specific rentals using GoGetSMS rental services list
                gogetSmsService = SERVICE_CODE_MAPPING[service] || '1'; // Default to OTHER
                gogetSmsCountry = COUNTRY_CODE_MAPPING[country]?.rental || 'GB'; // Default to UK
                console.log(`[GOGETSMS] Service rental - Service: ${service} -> ${gogetSmsService}, Country: ${country} -> ${gogetSmsCountry}`);
            }
            console.log(`[GOGETSMS] 📤 Making rental API request with exact documentation format: {
  action: 'getRentNumber',
  service: '${gogetSmsService}',
  rent_time: '${rentTime}',
  country: '${gogetSmsCountry}'
}`);
            console.log(`[GOGETSMS] 🔍 Country code verification: Original=${country} -> GoGetSMS=${gogetSmsCountry} (Expected: 2-letter code)`);
            // Verify country is in available list
            const availableCountries = ['GB', 'US', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'CZ', 'PT', 'SE', 'FI', 'DK', 'EE', 'LV', 'LT', 'IE', 'AT', 'BE', 'RO', 'GR', 'HR', 'SI', 'SK', 'HU', 'BG', 'CY', 'MT', 'CH', 'VN', 'MX', 'MA', 'JP', 'BR', 'IN', 'NZ', 'TH', 'PH', 'AU', 'HK', 'MY', 'NO', 'BA'];
            if (!availableCountries.includes(gogetSmsCountry)) {
                console.log(`[GOGETSMS] ⚠️ Warning: Country '${gogetSmsCountry}' may not be in available rental countries list`);
            }
            else {
                console.log(`[GOGETSMS] ✅ Country '${gogetSmsCountry}' confirmed in available rental countries`);
            }
            // Use exact GoGetSMS rental API format from documentation
            // https://www.gogetsms.com/handler_api.php?api_key=$api_key&action=getRentNumber&service=$service&rent_time=$time&country=$country
            let requestParams = {
                action: 'getRentNumber',
                service: gogetSmsService,
                rent_time: rentTime,
                country: gogetSmsCountry
            };
            console.log(`[GOGETSMS] 📤 Making rental API request with exact documentation format:`, requestParams);
            let response;
            try {
                response = await this.makeApiRequest(requestParams);
            }
            catch (error) {
                // If we get BAD_COUNTRY, try fallback countries for rental
                if (error.response?.data === 'BAD_COUNTRY') {
                    console.log(`[GOGETSMS] ⚠️ Country ${gogetSmsCountry} not available, trying fallback countries...`);
                    const fallbackCountries = ['GB', 'US', 'RU']; // UK, US, Russia
                    for (const fallbackCountry of fallbackCountries) {
                        if (fallbackCountry === gogetSmsCountry)
                            continue; // Skip the one we already tried
                        console.log(`[GOGETSMS] 🔄 Trying fallback country: ${fallbackCountry}`);
                        try {
                            requestParams.country = fallbackCountry;
                            response = await this.makeApiRequest(requestParams);
                            gogetSmsCountry = fallbackCountry; // Update for response processing
                            console.log(`[GOGETSMS] ✅ Success with fallback country: ${fallbackCountry}`);
                            break;
                        }
                        catch (fallbackError) {
                            console.log(`[GOGETSMS] ❌ Fallback country ${fallbackCountry} also failed:`, fallbackError.response?.data);
                            continue;
                        }
                    }
                    if (!response) {
                        throw error; // Re-throw original error if all fallbacks failed
                    }
                }
                else {
                    throw error; // Re-throw non-country errors
                }
            }
            console.log('[GOGETSMS] 📥 Rental response received:', response.data);
            // According to GoGetSMS docs, successful rental response is JSON format:
            // {"status": "success", "phone": {"id": 5322764, "endDate": "2023-05-20T19:23:57+03:00", "number": 37063356515, "cost": "5.00"}}
            if (response.data && response.data.status === 'success' && response.data.phone) {
                console.log(`[GOGETSMS] ✅ Rental successful: ${response.data.phone.number}`);
                return this.transformRentResponse(response.data, service, gogetSmsCountry);
            }
            else {
                // Handle error response
                console.log(`[GOGETSMS] ❌ Rental failed with response:`, response.data);
                throw new GoGetSmsError(`Rental failed: ${JSON.stringify(response.data)}`, 'RENTAL_FAILED');
            }
        }
        catch (error) {
            console.error('[GOGETSMS] 💥 Rental failed:', error);
            // Handle specific GoGetSMS errors according to documentation
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log(`[GOGETSMS] 🔍 Error response analysis:`, errorData);
                if (errorData === 'BAD_KEY') {
                    throw new GoGetSmsError('Invalid API key - check your GoGetSMS account credentials', 'BAD_KEY');
                }
                else if (errorData === 'BAD_SERVICE') {
                    throw new GoGetSmsError(`Service ${gogetSmsService} not available for rental`, 'BAD_SERVICE');
                }
                else if (errorData === 'BAD_COUNTRY') {
                    throw new GoGetSmsError(`Country ${gogetSmsCountry} not available for rental`, 'BAD_COUNTRY');
                }
                else if (errorData === 'BAD_ACTION') {
                    throw new GoGetSmsError('Invalid action parameter - check rental API access', 'BAD_ACTION');
                }
            }
            throw this.handleApiError(error);
        }
    },
    /**
     * Get rental status and messages
     */
    async getRentStatus(id, page = '0', size = '10') {
        try {
            console.log(`[GOGETSMS] Getting rental status for: ${id}`);
            const response = await this.makeApiRequest({
                action: 'getRentStatus',
                id: id
            });
            console.log('[GOGETSMS] Rental status response:', response.data);
            // Transform response to match expected format
            return this.transformStatusResponse(response.data);
        }
        catch (error) {
            console.error('[GOGETSMS] Error getting rental status:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Set rental status (finish or cancel)
     */
    async setRentStatus(id, status) {
        try {
            console.log(`[GOGETSMS] Setting rental status for: ${id}, status: ${status}`);
            const response = await this.makeApiRequest({
                action: 'setRentStatus',
                id: id,
                status: status
            });
            console.log('[GOGETSMS] Set rental status response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[GOGETSMS] Error setting rental status:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Extend a rental
     */
    async continueRentNumber(id, rentTime) {
        try {
            console.log(`[GOGETSMS] Extending rental for: ${id}, time: ${rentTime}h`);
            const response = await this.makeApiRequest({
                action: 'continueRentNumber',
                id: id,
                rent_time: rentTime
            });
            console.log('[GOGETSMS] Continue rent response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('[GOGETSMS] Error extending rental:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get list of active rentals
     */
    async getRentList() {
        try {
            console.log('[GOGETSMS] Getting rental list');
            const response = await this.makeApiRequest({
                action: 'getRentList'
            });
            console.log('[GOGETSMS] Rental list response:', response.data);
            // Transform response to match expected format
            return this.transformRentListResponse(response.data);
        }
        catch (error) {
            console.error('[GOGETSMS] Error getting rental list:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Test API connectivity and get valid countries/services
     */
    async testApiConnectivity() {
        try {
            console.log('[GOGETSMS] Testing API connectivity...');
            // Test 1: Get balance to verify API key
            const balanceResponse = await this.makeApiRequest({
                action: 'getBalance'
            });
            console.log('[GOGETSMS] Balance test response:', balanceResponse.data);
            // Test 2: Get prices for different countries to find valid ones
            const testCountries = ['GB', 'US', 'DE', 'RU', 'FR', 'IT', 'ES', 'NL', 'PL', 'CZ'];
            for (const country of testCountries) {
                try {
                    const pricesResponse = await this.makeApiRequest({
                        action: 'getPrices',
                        country: country
                    });
                    console.log(`[GOGETSMS] Valid country ${country}:`, typeof pricesResponse.data === 'string' ? pricesResponse.data.substring(0, 100) : pricesResponse.data);
                }
                catch (error) {
                    console.log(`[GOGETSMS] Invalid country ${country}:`, error.message || error.response?.data);
                }
            }
            // Test 3: Get rental services for a known good country
            try {
                const servicesResponse = await this.makeApiRequest({
                    action: 'getRentServicesAndCountries'
                });
                console.log('[GOGETSMS] Available services response:', typeof servicesResponse.data === 'string' ? servicesResponse.data.substring(0, 200) : servicesResponse.data);
            }
            catch (error) {
                console.log('[GOGETSMS] Services error:', error.message || error.response?.data);
            }
            return {
                status: 'success',
                message: 'API connectivity test completed. Check logs for details.'
            };
        }
        catch (error) {
            console.error('[GOGETSMS] API connectivity test failed:', error);
            throw this.handleApiError(error);
        }
    },
    // === ACTIVATION MODE METHODS ===
    /**
     * Get available activation services and countries
     * Uses numeric country codes and getPrices endpoint
     */
    async getActivationServices(country) {
        try {
            console.log('[GOGETSMS] 📱 Getting activation services and countries');
            // Use getPrices endpoint for activation services
            const targetCountry = country && country !== 'all_countries' ?
                COUNTRY_CODE_MAPPING[country]?.activation || '16' : '16'; // Default to UK
            console.log(`[GOGETSMS] 📱 Fetching activation prices for country: ${targetCountry}`);
            const params = {
                action: 'getPrices',
                country: targetCountry
            };
            const response = await this.makeApiRequest(params);
            console.log('[GOGETSMS] 📱 Activation services response:', typeof response.data === 'string' ? response.data.substring(0, 200) : response.data);
            // Transform response to activation format
            return this.transformActivationServicesResponse(response.data, targetCountry);
        }
        catch (error) {
            console.error('[GOGETSMS] ❌ Error getting activation services:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get activation number (single SMS verification)
     * Uses getNumberV2 endpoint for JSON response
     */
    async getActivationNumber(service, country = '16') {
        try {
            console.log(`[GOGETSMS] 📱 Getting activation number for: ${service}, country: ${country}`);
            // Map service and country for activation API
            const gogetSmsService = SERVICE_CODE_MAPPING[service] || '1';
            const gogetSmsCountry = COUNTRY_CODE_MAPPING[country]?.activation || '16';
            console.log(`[GOGETSMS] 📱 Activation request - Service: ${service} -> ${gogetSmsService}, Country: ${country} -> ${gogetSmsCountry}`);
            const params = {
                action: 'getNumberV2',
                service: gogetSmsService,
                country: gogetSmsCountry
            };
            const response = await this.makeApiRequest(params);
            console.log('[GOGETSMS] 📱 Activation response:', response.data);
            // Validate activation response
            if (typeof response.data === 'object' && response.data.activationId) {
                return response.data;
            }
            else {
                throw new GoGetSmsError(`Invalid activation response: ${JSON.stringify(response.data)}`, 'INVALID_RESPONSE');
            }
        }
        catch (error) {
            console.error('[GOGETSMS] ❌ Error getting activation number:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Check activation status (SMS received?)
     */
    async getActivationStatus(activationId) {
        try {
            console.log(`[GOGETSMS] 📱 Checking activation status for ID: ${activationId}`);
            const params = {
                action: 'getStatus',
                id: activationId
            };
            const response = await this.makeApiRequest(params);
            console.log('[GOGETSMS] 📱 Activation status response:', response.data);
            // Parse activation status response
            if (typeof response.data === 'string') {
                if (response.data === 'STATUS_WAIT_CODE') {
                    return { status: 'STATUS_WAIT_CODE' };
                }
                else if (response.data === 'STATUS_CANCEL') {
                    return { status: 'STATUS_CANCEL' };
                }
                else if (response.data.startsWith('STATUS_OK:')) {
                    const code = response.data.split(':')[1];
                    return { status: 'STATUS_OK', code };
                }
            }
            throw new GoGetSmsError(`Unknown activation status: ${response.data}`, 'UNKNOWN_STATUS');
        }
        catch (error) {
            console.error('[GOGETSMS] ❌ Error checking activation status:', error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Cancel activation
     */
    async cancelActivation(activationId) {
        try {
            console.log(`[GOGETSMS] 📱 Canceling activation ID: ${activationId}`);
            const params = {
                action: 'setStatus',
                status: '8', // Cancel order
                id: activationId
            };
            const response = await this.makeApiRequest(params);
            console.log('[GOGETSMS] 📱 Cancel activation response:', response.data);
            if (response.data !== 'ACCESS_CANCEL') {
                throw new GoGetSmsError(`Failed to cancel activation: ${response.data}`, 'CANCEL_FAILED');
            }
        }
        catch (error) {
            console.error('[GOGETSMS] ❌ Error canceling activation:', error);
            throw this.handleApiError(error);
        }
    },
    // === RENTAL MODE METHODS (Enhanced existing methods) ===
    /**
     * Get available rental services and countries (existing method, enhanced)
     */
    async getRentalServices(rentTime = '4', country) {
        // This is the existing getRentServicesAndCountries method, renamed for clarity
        return this.getRentServicesAndCountries(rentTime, 'any', country);
    },
    // === UNIFIED DUAL-MODE METHODS ===
    /**
     * Get services and countries for both activation and rental modes
     */
    async getDualModeServices(mode = 'rental', rentTime, country) {
        try {
            console.log(`[GOGETSMS] 🔄 Getting dual-mode services for: ${mode}`);
            if (mode === 'activation') {
                const activation = await this.getActivationServices(country);
                return {
                    mode: 'activation',
                    activation
                };
            }
            else {
                const rental = await this.getRentalServices(rentTime, country);
                return {
                    mode: 'rental',
                    rental
                };
            }
        }
        catch (error) {
            console.error(`[GOGETSMS] ❌ Error getting ${mode} services:`, error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Get a phone number using either activation or rental mode
     */
    async getPhoneNumber(mode, service, country, rentTime) {
        try {
            console.log(`[GOGETSMS] 📞 Getting phone number - Mode: ${mode}, Service: ${service}, Country: ${country}`);
            if (mode === 'activation') {
                const data = await this.getActivationNumber(service, country);
                return {
                    mode: 'activation',
                    success: true,
                    data,
                    cost: data.activationCost,
                    phoneNumber: data.phoneNumber,
                    id: data.activationId.toString()
                };
            }
            else {
                const data = await this.getRentNumber(service, rentTime || '4', 'any', country);
                return {
                    mode: 'rental',
                    success: true,
                    data,
                    cost: parseFloat(data.phone.cost),
                    phoneNumber: data.phone.number,
                    id: data.phone.id.toString(),
                    endDate: data.phone.endDate
                };
            }
        }
        catch (error) {
            console.error(`[GOGETSMS] ❌ Error getting ${mode} phone number:`, error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Check status for both activation and rental modes
     */
    async checkPhoneStatus(mode, id) {
        try {
            console.log(`[GOGETSMS] 📊 Checking ${mode} status for ID: ${id}`);
            if (mode === 'activation') {
                return await this.getActivationStatus(id);
            }
            else {
                return await this.getRentStatus(id);
            }
        }
        catch (error) {
            console.error(`[GOGETSMS] ❌ Error checking ${mode} status:`, error);
            throw this.handleApiError(error);
        }
    },
    /**
     * Detect optimal mode based on service and duration
     */
    detectOptimalMode(service, duration) {
        const durationHours = duration ? parseInt(duration) : 4;
        // Verification services with short duration = activation
        const verificationServices = ['wa', 'tg', 'fb', 'ig', 'go', 'tw'];
        if (verificationServices.includes(service) && durationHours <= 4) {
            return 'activation';
        }
        // Full country services = rental
        if (service.startsWith('full_')) {
            return 'rental';
        }
        // Long duration = rental
        if (durationHours >= 24) {
            return 'rental';
        }
        // Default to activation for short-term use
        return 'activation';
    },
    // === DATA TRANSFORMATION METHODS ===
    /**
     * Transform activation services response (from getPrices)
     */
    transformActivationServicesResponse(data, country) {
        try {
            console.log('[GOGETSMS] 📱 Transforming activation services response');
            // Activation services response is typically a JSON object with service codes and prices
            const services = {};
            const countries = {};
            // Add the requested country to countries list
            const countryName = ACTIVATION_COUNTRY_MAPPING[country] || 'Unknown';
            countries[country] = countryName;
            if (typeof data === 'object' && data !== null) {
                // Parse activation services from getPrices response
                for (const [serviceCode, serviceData] of Object.entries(data)) {
                    if (typeof serviceData === 'object' && serviceData !== null) {
                        const serviceInfo = serviceData;
                        services[serviceCode] = {
                            code: serviceCode,
                            name: this.getServiceName(serviceCode),
                            cost: parseFloat(serviceInfo.cost || serviceInfo.price || '0'),
                            count: parseInt(serviceInfo.count || serviceInfo.quantity || '0')
                        };
                    }
                }
            }
            // Add fallback services if none found
            if (Object.keys(services).length === 0) {
                console.log('[GOGETSMS] 📱 No services found, adding fallback activation services');
                const fallbackServices = ['wa', 'tg', 'fb', 'ig', 'go', 'tw', 'ot'];
                for (const serviceCode of fallbackServices) {
                    services[serviceCode] = {
                        code: serviceCode,
                        name: this.getServiceName(serviceCode),
                        cost: 1.0, // Default cost
                        count: 10 // Default available count
                    };
                }
            }
            console.log(`[GOGETSMS] 📱 Transformed ${Object.keys(services).length} activation services`);
            return {
                services,
                countries
            };
        }
        catch (error) {
            console.error('[GOGETSMS] ❌ Error transforming activation services response:', error);
            // Return minimal fallback response
            return {
                services: {
                    'ot': {
                        code: 'ot',
                        name: 'Other',
                        cost: 1.0,
                        count: 1
                    }
                },
                countries: {
                    [country]: ACTIVATION_COUNTRY_MAPPING[country] || 'Unknown'
                }
            };
        }
    },
    /**
     * Transform services response to rental-focused format
     * Prioritizes Full Country Rentals and core messaging services
     */
    transformServicesResponse(data) {
        try {
            console.log('[GOGETSMS] Raw API response:', JSON.stringify(data, null, 2));
            const services = {};
            const countries = {};
            // First, add prioritized FULL COUNTRY RENTALS
            const fullCountryServices = {
                'full_uk': { name: 'Full UK Rental', price: 15.00, currency: 'USD' },
                'full_germany': { name: 'Full Germany Rental', price: 18.00, currency: 'USD' },
                'full_usa': { name: 'Full USA Rental', price: 20.00, currency: 'USD' },
                'full_lithuania': { name: 'Full Lithuania Rental', price: 12.00, currency: 'USD' },
                'full_poland': { name: 'Full Poland Rental', price: 14.00, currency: 'USD' },
                'full_netherlands': { name: 'Full Netherlands Rental', price: 16.00, currency: 'USD' },
                'full_france': { name: 'Full France Rental', price: 17.00, currency: 'USD' },
                'full_spain': { name: 'Full Spain Rental', price: 15.00, currency: 'USD' },
                'full_italy': { name: 'Full Italy Rental', price: 16.00, currency: 'USD' },
                'full_czechrepublic': { name: 'Full Czech Republic Rental', price: 13.00, currency: 'USD' },
                'full_portugal': { name: 'Full Portugal Rental', price: 14.00, currency: 'USD' },
                'full_sweden': { name: 'Full Sweden Rental', price: 16.00, currency: 'USD' },
                'full_finland': { name: 'Full Finland Rental', price: 15.00, currency: 'USD' },
                'full_denmark': { name: 'Full Denmark Rental', price: 17.00, currency: 'USD' }
            };
            // Add full country rentals first (prioritized)
            Object.assign(services, fullCountryServices);
            // Add core messaging service rentals
            const coreServices = {
                'wa': { name: 'WhatsApp', price: 5.00, currency: 'USD' },
                'tg': { name: 'Telegram', price: 4.50, currency: 'USD' },
                'go': { name: 'Google', price: 6.00, currency: 'USD' },
                'fb': { name: 'Facebook', price: 5.50, currency: 'USD' },
                'tw': { name: 'Twitter', price: 5.00, currency: 'USD' },
                'ig': { name: 'Instagram', price: 5.50, currency: 'USD' },
                'ms': { name: 'Microsoft', price: 6.00, currency: 'USD' },
                'vi': { name: 'Viber', price: 4.00, currency: 'USD' },
                'wb': { name: 'WeChat', price: 5.00, currency: 'USD' },
                'ds': { name: 'Discord', price: 4.50, currency: 'USD' },
                'am': { name: 'Amazon', price: 6.50, currency: 'USD' },
                'ap': { name: 'Apple', price: 7.00, currency: 'USD' },
                'ts': { name: 'PayPal', price: 6.00, currency: 'USD' },
                'oi': { name: 'Tinder', price: 5.00, currency: 'USD' },
                'lf': { name: 'TikTok', price: 5.50, currency: 'USD' }
            };
            // Add core services
            Object.assign(services, coreServices);
            // Add major countries for rental
            const rentalCountries = {
                'GB': { name: 'United Kingdom', iso: 'GB' },
                'DE': { name: 'Germany', iso: 'DE' },
                'US': { name: 'United States', iso: 'US' },
                'LT': { name: 'Lithuania', iso: 'LT' },
                'PL': { name: 'Poland', iso: 'PL' },
                'NL': { name: 'Netherlands', iso: 'NL' },
                'FR': { name: 'France', iso: 'FR' },
                'ES': { name: 'Spain', iso: 'ES' },
                'IT': { name: 'Italy', iso: 'IT' },
                'CZ': { name: 'Czech Republic', iso: 'CZ' },
                'PT': { name: 'Portugal', iso: 'PT' },
                'SE': { name: 'Sweden', iso: 'SE' },
                'FI': { name: 'Finland', iso: 'FI' },
                'DK': { name: 'Denmark', iso: 'DK' },
                'EE': { name: 'Estonia', iso: 'EE' },
                'LV': { name: 'Latvia', iso: 'LV' }
            };
            Object.assign(countries, rentalCountries);
            console.log('[GOGETSMS] Transformed rental services:', Object.keys(services).length);
            console.log('[GOGETSMS] Available countries:', Object.keys(countries).length);
            return {
                services,
                countries,
                provider: 'gogetsms',
                type: 'rental'
            };
        }
        catch (error) {
            console.error('[GOGETSMS] Error transforming services response:', error);
            throw new GoGetSmsError('Failed to transform services response', 'TRANSFORM_ERROR');
        }
    },
    /**
     * Transform rent response to expected format
     */
    transformRentResponse(data, originalService, actualCountryUsed) {
        if (data && data.phone) {
            // Convert ISO country code back to numeric for database storage
            const isoToNumericMap = {
                'GB': '16', 'US': '187', 'DE': '43', 'FR': '78', 'IT': '86', 'ES': '56',
                'NL': '48', 'PL': '15', 'RU': '0', 'UA': '1', 'CZ': '63', 'EE': '34',
                'LT': '44', 'LV': '49', 'ID': '6', 'CY': '77', 'PH': '4', 'HR': '45',
                'MY': '7', 'AT': '50', 'TH': '52', 'DK': '172', 'RO': '32', 'IE': '23',
                'GR': '129', 'FI': '163', 'PT': '117', 'AU': '175', 'SE': '46'
            };
            const countryCode = actualCountryUsed ? isoToNumericMap[actualCountryUsed] || '16' : '16';
            return {
                activationId: data.phone.id,
                phone: { number: data.phone.number },
                id: data.phone.id.toString(),
                phone_number: data.phone.number,
                rent_id: data.phone.id.toString(),
                cost: data.phone.cost,
                end_date: data.phone.endDate,
                service: originalService,
                country: countryCode
            };
        }
        return data;
    },
    /**
     * Transform status response to expected format
     */
    transformStatusResponse(data) {
        if (data && data.values) {
            const messages = [];
            // Transform messages to standard format
            Object.values(data.values).forEach((msg) => {
                if (msg && typeof msg === 'object') {
                    messages.push({
                        sender: msg.phoneFrom || 'Unknown',
                        message: msg.text || '',
                        received_at: msg.date || new Date().toISOString(),
                        text: msg.text || ''
                    });
                }
            });
            return {
                status: 'success',
                messages: messages,
                quantity: data.quantity || messages.length
            };
        }
        return {
            status: 'success',
            messages: [],
            quantity: 0
        };
    },
    /**
     * Transform rent list response to expected format
     */
    transformRentListResponse(data) {
        // Handle different response formats
        if (Array.isArray(data)) {
            return {
                status: 'success',
                rentals: data.map((rental) => ({
                    id: rental.id?.toString() || '',
                    phoneNumber: rental.number || '',
                    service: rental.service || '',
                    status: rental.status || 'active',
                    endDate: rental.endDate || null
                }))
            };
        }
        return {
            status: 'success',
            rentals: []
        };
    },
    /**
     * Get service name from a GoGetSMS service code
     */
    getServiceName(code) {
        const serviceNameMappings = {
            'wa': 'WhatsApp',
            'tg': 'Telegram',
            'go': 'Google',
            'fb': 'Facebook',
            'tw': 'Twitter',
            'ig': 'Instagram',
            'ms': 'Microsoft',
            'vi': 'Viber',
            'wb': 'WeChat',
            'ub': 'Uber',
            'ds': 'Discord',
            'am': 'Amazon',
            'mb': 'Yahoo',
            'ts': 'PayPal',
            'vk': 'VK.com',
            'hw': 'Alipay/Alibaba',
            'ap': 'Apple',
            'dh': 'eBay',
            'mt': 'Steam',
            'fu': 'Snapchat',
            'oi': 'Tinder',
            'lf': 'TikTok/Douyin',
            'ot': 'Other'
        };
        return serviceNameMappings[code] || code;
    }
};
