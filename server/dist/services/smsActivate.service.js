"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsActivateService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const retry_1 = require("../utils/retry");
dotenv_1.default.config();
// SMS-Activate API base URL - using main API endpoint for rental
const API_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php';
const API_KEY = process.env.SMS_ACTIVATE_API_KEY;
// Validate API key is present
if (!API_KEY) {
    console.error('ERROR: SMS_ACTIVATE_API_KEY is not set in environment variables');
}
else {
    console.log(`SMS Activate API configured with key: ${API_KEY.substring(0, 5)}...`);
}
// Error class for SMS Activate API errors
class SmsActivateError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'SmsActivateError';
        this.code = code;
    }
}
/**
 * Check if SMS Activate API is available (has API key)
 */
const isApiAvailable = () => {
    return !!API_KEY && API_KEY.length > 0;
};
/**
 * SMS Activate API Service
 */
exports.smsActivateService = {
    /**
     * Check if the service is available
     */
    isAvailable: isApiAvailable,
    /**
     * Get available countries and services for phone rentals
     */
    async getRentServicesAndCountries(rentTime = '4', operator = 'any', country = '0', incomingCall = false) {
        if (!isApiAvailable()) {
            throw new SmsActivateError('SMS-Activate API key not configured', 'NO_API_KEY');
        }
        try {
            console.log(`[SMS-ACTIVATE] Fetching services and countries with params: rentTime=${rentTime}, operator=${operator}, country=${country}, incomingCall=${incomingCall}`);
            // Use 15 second timeout to avoid quick failures
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: {
                    api_key: API_KEY,
                    action: 'getRentServicesAndCountries',
                    rent_time: rentTime,
                    operator,
                    country,
                    incomingCall: incomingCall ? 'true' : undefined
                },
                timeout: 15000 // 15 second timeout
            }), 3, // Try up to 3 times
            1000 // Wait 1 second between retries
            );
            // Handle string error responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key',
                    'NOT_AUTHORIZED': 'API key not authorized or insufficient permissions',
                    'NO_NUMBERS': 'No phone numbers available for this service/country',
                    'NO_BALANCE': 'Insufficient balance',
                    'BAD_ACTION': 'Invalid action parameter',
                    'BAD_SERVICE': 'Invalid service parameter',
                    'EARLY_CANCEL_DENIED': 'Cannot cancel rental yet',
                    'BANNED': 'Account is banned'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] String error response: ${response.data}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Log response data size for debugging
            const dataSize = JSON.stringify(response.data).length;
            console.log(`[SMS-ACTIVATE] Received response (${dataSize} bytes)`);
            // Check for JSON error response
            if (response.data && response.data.status === 'error') {
                console.error('[SMS-ACTIVATE] API returned error status:', response.data);
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            // Validate response has required data
            if (!response.data ||
                !response.data.services ||
                typeof response.data.services !== 'object' ||
                Object.keys(response.data.services).length === 0) {
                console.error('[SMS-ACTIVATE] Invalid or empty services data:', response.data);
                throw new SmsActivateError('Invalid or empty services data returned by API', 'INVALID_RESPONSE');
            }
            // Validate countries - warn but don't fail if missing
            if (!response.data.countries ||
                typeof response.data.countries !== 'object' ||
                Object.keys(response.data.countries).length === 0) {
                console.warn('[SMS-ACTIVATE] Missing or empty countries data in response');
            }
            console.log(`[SMS-ACTIVATE] Successfully fetched ${Object.keys(response.data.services).length} services and ${Object.keys(response.data.countries || {}).length} countries`);
            return response.data;
        }
        catch (error) {
            console.error('[SMS-ACTIVATE] Error getting rent services and countries:', error);
            // Log detailed error information
            if (error.response) {
                console.error('[SMS-ACTIVATE] API Response Error:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
            else if (error.request) {
                console.error('[SMS-ACTIVATE] API Request Error (No Response):', error.request);
            }
            if (error instanceof SmsActivateError) {
                throw error;
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to get rent services and countries');
        }
    },
    /**
     * Rent a new phone number
     */
    async getRentNumber(service, rentTime = '4', operator = 'any', country = '0', incomingCall = false) {
        try {
            console.log(`[SMS-ACTIVATE] 🎯 Starting rental request for: ${service}, country: ${country}, time: ${rentTime}h`);
            console.log(`[SMS-ACTIVATE] 🔑 Using API key: ${API_KEY?.substring(0, 5)}...`);
            console.log(`[SMS-ACTIVATE] 🌐 API endpoint: ${API_BASE_URL}`);
            const requestParams = {
                api_key: API_KEY,
                action: 'getRentNumber',
                service,
                rent_time: rentTime,
                operator,
                country,
                incomingCall: incomingCall ? 'true' : undefined
            };
            console.log(`[SMS-ACTIVATE] 📤 Request parameters:`, requestParams);
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: requestParams,
                timeout: 15000
            }), 3, 1000);
            console.log(`[SMS-ACTIVATE] 📥 Raw response:`, response.data);
            console.log(`[SMS-ACTIVATE] 📥 Response type:`, typeof response.data);
            // Handle string error responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                console.log(`[SMS-ACTIVATE] 🔍 Checking error code: "${errorCode}"`);
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key - check your SMS-Activate account credentials',
                    'NOT_AUTHORIZED': 'API key not authorized for rental API - check account permissions',
                    'NO_NUMBERS': 'No phone numbers available for this service/country combination. Try a different country or service.',
                    'NO_BALANCE': 'Insufficient balance. Full rentals cost ~$4.78, WhatsApp ~$0.36. Please add funds to your SMS-Activate account.',
                    'BAD_ACTION': 'Invalid action parameter - rental API may not be available',
                    'BAD_SERVICE': 'Invalid service parameter for rental',
                    'EARLY_CANCEL_DENIED': 'Cannot cancel rental yet - please wait for the lock period to expire',
                    'BANNED': 'Account is banned or restricted - contact SMS-Activate support'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] ❌ Error response: ${errorCode} - ${errorMessage}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Check for JSON error response
            if (response.data && response.data.status === 'error') {
                console.error(`[SMS-ACTIVATE] ❌ JSON error response:`, response.data);
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            console.log(`[SMS-ACTIVATE] ✅ Rental successful:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error('[SMS-ACTIVATE] 💥 Error renting phone number:', error);
            if (error instanceof SmsActivateError) {
                throw error;
            }
            // Handle network and other errors
            if (error.response) {
                console.error('[SMS-ACTIVATE] 💥 Error response status:', error.response.status);
                console.error('[SMS-ACTIVATE] 💥 Error response data:', error.response.data);
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to rent phone number');
        }
    },
    /**
     * Get status and messages for a rented number
     */
    async getRentStatus(id, page = '0', size = '10') {
        try {
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: {
                    api_key: API_KEY,
                    action: 'getRentStatus',
                    id,
                    page,
                    size
                }
            }));
            // Handle string error responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key',
                    'NOT_AUTHORIZED': 'API key not authorized or insufficient permissions',
                    'NO_NUMBERS': 'No phone numbers available for this service/country',
                    'NO_BALANCE': 'Insufficient balance',
                    'BAD_ACTION': 'Invalid action parameter',
                    'BAD_SERVICE': 'Invalid service parameter',
                    'EARLY_CANCEL_DENIED': 'Cannot cancel rental yet',
                    'BANNED': 'Account is banned'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] String error response: ${response.data}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Check for JSON error response
            if (response.data.status === 'error') {
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error getting rent status:', error);
            if (error instanceof SmsActivateError) {
                throw error;
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to get rent status');
        }
    },
    /**
     * Change rental status (finish or cancel)
     */
    async setRentStatus(id, status // 1 = Finish, 2 = Cancel
    ) {
        try {
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: {
                    api_key: API_KEY,
                    action: 'setRentStatus',
                    id,
                    status
                }
            }));
            // Handle string error responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key',
                    'NOT_AUTHORIZED': 'API key not authorized or insufficient permissions',
                    'NO_NUMBERS': 'No phone numbers available for this service/country',
                    'NO_BALANCE': 'Insufficient balance',
                    'BAD_ACTION': 'Invalid action parameter',
                    'BAD_SERVICE': 'Invalid service parameter',
                    'EARLY_CANCEL_DENIED': 'Cannot cancel rental yet',
                    'BANNED': 'Account is banned'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] String error response: ${response.data}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Check for JSON error response
            if (response.data.status === 'error') {
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error setting rent status:', error);
            if (error instanceof SmsActivateError) {
                throw error;
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to set rent status');
        }
    },
    /**
     * Extend a rental
     */
    async continueRentNumber(id, rentTime = '4') {
        try {
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: {
                    api_key: API_KEY,
                    action: 'continueRentNumber',
                    id,
                    rent_time: rentTime
                }
            }));
            // Handle string error responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key',
                    'NOT_AUTHORIZED': 'API key not authorized or insufficient permissions',
                    'NO_NUMBERS': 'No phone numbers available for this service/country',
                    'NO_BALANCE': 'Insufficient balance',
                    'BAD_ACTION': 'Invalid action parameter',
                    'BAD_SERVICE': 'Invalid service parameter',
                    'EARLY_CANCEL_DENIED': 'Cannot cancel rental yet',
                    'BANNED': 'Account is banned'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] String error response: ${response.data}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Check for JSON error response
            if (response.data.status === 'error') {
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error extending rental:', error);
            if (error instanceof SmsActivateError) {
                throw error;
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to extend rental');
        }
    },
    /**
     * Get account balance
     */
    async getBalance() {
        try {
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: {
                    api_key: API_KEY,
                    action: 'getBalance'
                }
            }));
            // Handle string responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const responseString = response.data.trim();
                // Check if it's a balance response (ACCESS_BALANCE:amount format)
                if (responseString.startsWith('ACCESS_BALANCE:')) {
                    const balanceAmount = parseFloat(responseString.replace('ACCESS_BALANCE:', ''));
                    return {
                        status: 'success',
                        balance: balanceAmount,
                        currency: 'USD'
                    };
                }
                // Handle error responses
                const errorCode = responseString.toUpperCase();
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key',
                    'NOT_AUTHORIZED': 'API key not authorized or insufficient permissions',
                    'BANNED': 'Account is banned'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] String error response: ${response.data}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Check for JSON error response
            if (response.data.status === 'error') {
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error getting balance:', error);
            if (error instanceof SmsActivateError) {
                throw error;
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to get balance');
        }
    },
    /**
     * Get list of active rentals
     */
    async getRentList() {
        try {
            const response = await (0, retry_1.retryOperation)(() => axios_1.default.get(API_BASE_URL, {
                params: {
                    api_key: API_KEY,
                    action: 'getRentList'
                }
            }));
            // Handle string error responses from SMS-Activate API
            if (typeof response.data === 'string') {
                const errorCode = response.data.trim().toUpperCase();
                const errorMessages = {
                    'BAD_KEY': 'Invalid API key',
                    'NOT_AUTHORIZED': 'API key not authorized or insufficient permissions',
                    'NO_NUMBERS': 'No phone numbers available for this service/country',
                    'NO_BALANCE': 'Insufficient balance',
                    'BAD_ACTION': 'Invalid action parameter',
                    'BAD_SERVICE': 'Invalid service parameter',
                    'EARLY_CANCEL_DENIED': 'Cannot cancel rental yet',
                    'BANNED': 'Account is banned'
                };
                const errorMessage = errorMessages[errorCode] || `API returned error: ${response.data}`;
                console.error(`[SMS-ACTIVATE] String error response: ${response.data}`);
                throw new SmsActivateError(errorMessage, errorCode);
            }
            // Check for JSON error response
            if (response.data.status === 'error') {
                throw new SmsActivateError(response.data.message || 'Unknown API error', response.data.message || 'UNKNOWN_ERROR');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error getting rent list:', error);
            if (error instanceof SmsActivateError) {
                throw error;
            }
            throw new Error(error.response?.data?.message ||
                error.message ||
                'Failed to get rent list');
        }
    }
};
