"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableProviders = exports.testAnosimServices = exports.testAnosimApiKey = exports.testGoGetSmsDualMode = exports.testApiAuth = exports.testGoGetSms = exports.handleSmsWebhook = exports.getActiveRentals = exports.extendRental = exports.cancelRental = exports.getNumberStatus = exports.rentNumber = exports.getServicesAndCountries = void 0;
const smsActivate_service_1 = require("../services/smsActivate.service");
const smspva_service_1 = require("../services/smspva.service");
const anosim_service_1 = require("../services/anosim.service");
const gogetsms_service_1 = require("../services/gogetsms.service");
const supabase_1 = require("../lib/supabase");
/**
 * Get available services and countries for phone rentals
 */
const getServicesAndCountries = async (req, res, next) => {
    try {
        const rentTime = req.query.rentTime || '4'; // Default to 4 hours
        const operator = req.query.operator || 'any';
        const country = req.query.country || '0'; // Default to Russia
        const incomingCall = req.query.incomingCall || 'false';
        const provider = req.query.provider || 'sms_activate'; // Default to SMS-Activate
        const mode = req.query.mode || 'rental'; // Default to rental mode
        console.log(`[API] Fetching services and countries with params: provider=${provider}, mode=${mode}, rentTime=${rentTime}, operator=${operator}, country=${country}, incomingCall=${incomingCall}`);
        // Set a longer timeout for the request
        req.setTimeout(30000); // 30 second request timeout
        let data;
        // Select appropriate service based on provider
        switch (provider) {
            case 'smspva':
                if (!smspva_service_1.smspvaService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'SMSPVA provider is not available - API key not configured',
                        code: 'NO_API_KEY'
                    });
                }
                data = await smspva_service_1.smspvaService.getRentServicesAndCountries();
                break;
            case 'anosim':
                if (!anosim_service_1.anosimService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Anosim provider is not available - API key not configured',
                        code: 'NO_API_KEY'
                    });
                }
                // NEW: Support dual-mode for Anosim
                console.log(`[ANOSIM CONTROLLER] Mode parameter received: '${mode}'`);
                console.log(`[ANOSIM CONTROLLER] Calling getDualModeServices with mode: '${mode}'`);
                data = await anosim_service_1.anosimService.getDualModeServices(mode);
                console.log(`[ANOSIM CONTROLLER] Response type: '${data.type}', services count: ${Object.keys(data.services).length}`);
                break;
            case 'gogetsms':
                if (!gogetsms_service_1.gogetSmsService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'GoGetSMS provider is not available - API key not configured',
                        code: 'NO_API_KEY'
                    });
                }
                data = await gogetsms_service_1.gogetSmsService.getRentServicesAndCountries(rentTime, operator, country);
                break;
            case 'sms_activate':
            default:
                if (!smsActivate_service_1.smsActivateService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'SMS-Activate provider is not available - API key not configured',
                        code: 'NO_API_KEY'
                    });
                }
                data = await smsActivate_service_1.smsActivateService.getRentServicesAndCountries(rentTime, operator, country, incomingCall === 'true');
                break;
        }
        // Validate response data
        if (!data || !data.services || Object.keys(data.services).length === 0) {
            console.error('[API] Invalid or empty services data received from SMS-Activate');
            return res.status(500).json({
                status: 'error',
                message: 'Invalid or empty services data received from provider'
            });
        }
        // Log the successful response
        console.log(`[API] Successfully retrieved ${Object.keys(data.services).length} services and ${Object.keys(data.countries || {}).length} countries`);
        res.status(200).json({
            status: 'success',
            data
        });
    }
    catch (error) {
        console.error('[API] Error fetching services and countries:', error);
        // Send appropriate error response based on the error type
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                status: 'error',
                message: 'Request to SMS service timed out. Please try again later.',
                code: 'TIMEOUT'
            });
        }
        if (error.response && error.response.status) {
            return res.status(error.response.status).json({
                status: 'error',
                message: error.message || 'Error communicating with SMS service',
                code: error.code || 'API_ERROR'
            });
        }
        // Default error handling
        next(error);
    }
};
exports.getServicesAndCountries = getServicesAndCountries;
/**
 * Rent a new phone number
 */
const rentNumber = async (req, res) => {
    try {
        const { service, rentTime = '4', country = '0', provider = 'sms_activate', mode = 'rental' } = req.body;
        console.log('==== NEW RENTAL REQUEST ====');
        console.log('Request params:', { provider, service, rentTime, country, mode });
        // Validation
        if (!service) {
            return res.status(400).json({
                status: 'error',
                message: 'Service is required'
            });
        }
        let response;
        switch (provider) {
            case 'sms_activate':
                response = await smsActivate_service_1.smsActivateService.getRentNumber(service, rentTime, 'any', country);
                break;
            case 'smspva':
                response = await smspva_service_1.smspvaService.getRentNumber(service, rentTime, 'any', country);
                break;
            case 'anosim':
                // NEW: Support dual-mode for Anosim
                if (mode === 'activation') {
                    console.log('[ANOSIM] Using ACTIVATION mode');
                    const activationResponse = await anosim_service_1.anosimService.getActivationNumber(service, country);
                    // Transform activation response to match rental format
                    response = {
                        activationId: activationResponse.activationId,
                        phone: {
                            number: activationResponse.phoneNumber
                        },
                        id: activationResponse.activationId.toString(),
                        phone_number: activationResponse.phoneNumber,
                        rent_id: activationResponse.activationId.toString(),
                        cost: activationResponse.activationCost.toString(),
                        end_date: activationResponse.endTime,
                        service: service,
                        country: country,
                        mode: 'activation'
                    };
                }
                else {
                    console.log('[ANOSIM] Using RENTAL mode');
                    response = await anosim_service_1.anosimService.getRentNumber(service, rentTime, 'any', country);
                    // Transform rental response to ensure consistent format
                    response = {
                        ...response,
                        mode: 'rental'
                    };
                }
                break;
            case 'gogetsms':
                // NEW: Support dual-mode for GoGetSMS
                if (mode === 'activation') {
                    console.log('[GOGETSMS] Using ACTIVATION mode');
                    const activationResponse = await gogetsms_service_1.gogetSmsService.getActivationNumber(service, country);
                    // Transform activation response to match rental format
                    response = {
                        activationId: activationResponse.activationId,
                        phone: {
                            number: activationResponse.phoneNumber
                        },
                        id: activationResponse.activationId.toString(),
                        phone_number: activationResponse.phoneNumber,
                        rent_id: activationResponse.activationId.toString(),
                        cost: activationResponse.activationCost.toString(),
                        end_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours default
                        service: service,
                        country: country,
                        mode: 'activation'
                    };
                }
                else {
                    console.log('[GOGETSMS] Using RENTAL mode');
                    console.log('[GOGETSMS] Calling getRentNumber with params:', { service, rentTime, country });
                    try {
                        response = await gogetsms_service_1.gogetSmsService.getRentNumber(service, rentTime, 'any', country);
                        console.log('[GOGETSMS] ===== RAW RESPONSE FROM SERVICE =====');
                        console.log('[GOGETSMS] Response type:', typeof response);
                        console.log('[GOGETSMS] Response:', JSON.stringify(response, null, 2));
                        console.log('[GOGETSMS] Has phone property:', !!response.phone);
                        console.log('[GOGETSMS] Has phone.id property:', !!(response.phone && response.phone.id));
                    }
                    catch (serviceError) {
                        console.error('[GOGETSMS] Error from getRentNumber service:', serviceError);
                        throw serviceError;
                    }
                    // Response is already transformed by GoGetSMS service
                    console.log('[GOGETSMS] Final transformed response:', JSON.stringify(response, null, 2));
                }
                break;
            default:
                return res.status(400).json({
                    status: 'error',
                    message: `Unsupported provider: ${provider}`
                });
        }
        // Log the complete API response for debugging
        console.log('API Response (Raw):', JSON.stringify(response, null, 2));
        // Check if we have a valid API response
        if (!response) {
            console.error('API returned null or undefined response');
            return res.status(500).json({
                status: 'error',
                message: 'Invalid response from rental service'
            });
        }
        // Extract phone number from different possible response formats
        let phoneNumber = null;
        let rentId = null;
        // Log all keys in the response for debugging
        console.log('Response keys:', Object.keys(response));
        // Provider-specific extraction logic
        if (provider === 'smspva') {
            console.log('[SMSPVA] Using SMSPVA-specific extraction logic');
            // SMSPVA returns phone_number and activationId in the response
            if (response.phone_number) {
                phoneNumber = response.phone_number;
                console.log('[SMSPVA] Found phone_number directly:', phoneNumber);
            }
            else if (response.phone && response.phone.number) {
                phoneNumber = response.phone.number;
                console.log('[SMSPVA] Found phone.number:', phoneNumber);
            }
            // For SMSPVA, use activationId as rent_id
            if (response.activationId) {
                rentId = response.activationId;
                console.log('[SMSPVA] Found activationId as rent_id:', rentId);
            }
            else if (response.id) {
                rentId = response.id;
                console.log('[SMSPVA] Using id as rent_id:', rentId);
            }
        }
        else {
            // Generic extraction for other providers
            // Try multiple ways to extract the phone number
            if (response.phone_number) {
                phoneNumber = response.phone_number;
                console.log('Found phone_number directly:', phoneNumber);
            }
            else if (response.phone && response.phone.number) {
                phoneNumber = response.phone.number;
                console.log('Found phone.number:', phoneNumber);
            }
            else if (typeof response === 'object') {
                // Check if any property looks like a phone number
                for (const key in response) {
                    if (typeof response[key] === 'string' &&
                        (/^\+?\d+$/.test(response[key]) || /phone|number|tel/i.test(key))) {
                        phoneNumber = response[key];
                        console.log(`Extracted phone number from key '${key}':`, phoneNumber);
                        break;
                    }
                }
            }
            // Try to extract rent ID
            if (response.rent_id) {
                rentId = response.rent_id;
                console.log('Found rent_id directly:', rentId);
            }
            else if (response.id) {
                rentId = response.id;
                console.log('Using id as rent_id:', rentId);
            }
            else if (response.phone && response.phone.id) {
                rentId = response.phone.id;
                console.log('Using phone.id as rent_id:', rentId);
            }
        }
        // Generate a fallback ID if none found
        if (!rentId) {
            rentId = `rent_${Date.now()}`;
            console.log('Generated fallback rent_id:', rentId);
        }
        if (!phoneNumber) {
            console.error('Could not extract phone number from response');
            return res.status(500).json({
                status: 'error',
                message: 'Could not extract phone number from rental service response',
                data: response
            });
        }
        // Calculate end date based on rent time
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + parseInt(rentTime || '4'));
        // Determine actual country and service from API response or fallback to input
        const actualCountry = response.country || country || '0';
        const actualService = response.service || service;
        // Create database record
        const phoneRecord = {
            phone_number: phoneNumber,
            rent_id: rentId,
            service: actualService,
            country: actualCountry,
            end_date: endDate.toISOString(),
            status: 'active',
            provider: provider,
            // Store SMSPVA activation ID in external_url field for status calls
            external_url: provider === 'smspva' ? response.activationId : (provider === 'receive_sms_online' ? undefined : null),
            access_key: provider === 'receive_sms_online' ? undefined : null
        };
        console.log(`[PHONE] Using actual country: ${actualCountry}, actual service: ${actualService}`);
        // Add Anosim-specific fields if using Anosim provider
        if (provider === 'anosim') {
            phoneRecord.order_id = response.order_id || null;
            phoneRecord.order_booking_id = response.order_booking_id || response.activationId || null;
            phoneRecord.provider_id = response.provider_id || null;
            phoneRecord.auto_renewal = response.auto_renewal || false;
            phoneRecord.external_url = response.external_url || response.order_id || null;
        }
        console.log('Attempting database insertion with record:', phoneRecord);
        try {
            // First check if the phone number already exists to prevent duplicates
            const { data: existingNumber, error: queryError } = await supabase_1.supabase
                .from('phone_numbers')
                .select('*')
                .eq('phone_number', phoneNumber)
                .maybeSingle();
            if (queryError) {
                console.error('Error checking for existing phone number:', queryError);
            }
            else if (existingNumber) {
                console.log('Phone number already exists in database:', existingNumber);
                return res.status(200).json({
                    status: 'success',
                    message: 'Phone number already exists in database',
                    data: existingNumber
                });
            }
            // Insert the new phone number with direct SQL for better error reporting
            let sqlInsert;
            if (provider === 'anosim') {
                sqlInsert = `
          INSERT INTO public.phone_numbers 
          (phone_number, rent_id, service, country, end_date, status, provider, external_url, access_key, order_id, order_booking_id, provider_id, auto_renewal, created_at, updated_at)
          VALUES 
          ('${phoneNumber}', '${rentId}', '${service}', '${country || '0'}', '${endDate.toISOString()}', 'active', '${provider}', 
          ${phoneRecord.external_url ? `'${phoneRecord.external_url}'` : 'NULL'}, NULL, 
          ${phoneRecord.order_id ? `'${phoneRecord.order_id}'` : 'NULL'}, 
          ${phoneRecord.order_booking_id ? `'${phoneRecord.order_booking_id}'` : 'NULL'}, 
          ${phoneRecord.provider_id ? `'${phoneRecord.provider_id}'` : 'NULL'}, 
          ${phoneRecord.auto_renewal}, now(), now())
          RETURNING *;
        `;
            }
            else {
                sqlInsert = `
          INSERT INTO public.phone_numbers 
          (phone_number, rent_id, service, country, end_date, status, provider, external_url, access_key, created_at, updated_at)
          VALUES 
          ('${phoneNumber}', '${rentId}', '${service}', '${country || '0'}', '${endDate.toISOString()}', 'active', '${provider}', NULL, NULL, now(), now())
          RETURNING *;
        `;
            }
            const { data: directInsertData, error: directInsertError } = await supabase_1.supabase.rpc('execute_sql', {
                query: sqlInsert
            });
            if (directInsertError) {
                console.error('Direct SQL insertion error:', directInsertError);
                // Fall back to the standard insertion method
                console.log('Falling back to standard insert...');
                const { data: insertedData, error: insertError } = await supabase_1.supabase
                    .from('phone_numbers')
                    .insert(phoneRecord)
                    .select()
                    .single();
                if (insertError) {
                    console.error('Standard database insertion error:', insertError);
                    // Check if it's a unique constraint violation
                    if (insertError.code === '23505') {
                        // Try to fetch the existing record
                        const { data: constraintData } = await supabase_1.supabase
                            .from('phone_numbers')
                            .select('*')
                            .eq('phone_number', phoneNumber)
                            .single();
                        if (constraintData) {
                            return res.status(200).json({
                                status: 'success',
                                message: 'Phone number already exists (constraint violation)',
                                data: constraintData
                            });
                        }
                    }
                    // Return partial success since we did rent the number
                    return res.status(201).json({
                        status: 'partial_success',
                        message: 'Phone number rented but failed to save to database',
                        data: response,
                        dbError: insertError
                    });
                }
                console.log('Successfully inserted phone number into database:', insertedData);
                // Success response with the database record
                return res.status(201).json({
                    status: 'success',
                    message: 'Phone number successfully rented and saved',
                    data: insertedData
                });
            }
            console.log('Successfully inserted phone number via direct SQL:', directInsertData);
            // Return the inserted data
            return res.status(201).json({
                status: 'success',
                message: 'Phone number successfully rented and saved via direct SQL',
                data: directInsertData
            });
        }
        catch (dbError) {
            console.error('Unexpected database error:', dbError);
            // Return partial success with rental data but error info
            return res.status(201).json({
                status: 'partial_success',
                message: 'Phone number rented but error occurred when saving to database',
                data: response,
                error: dbError.message || String(dbError)
            });
        }
    }
    catch (error) {
        console.error('Error in rentNumber controller:', error);
        // Handle specific SMS API errors
        if (error.code === 'NO_NUMBERS') {
            return res.status(404).json({
                status: 'error',
                message: 'No phone numbers available for this service/country',
                code: error.code
            });
        }
        if (error.code === 'BAD_KEY') {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid API key. Please check your SMS-Activate API configuration.',
                code: error.code
            });
        }
        if (error.code === 'NOT_AUTHORIZED') {
            return res.status(401).json({
                status: 'error',
                message: 'API key not authorized. Please check your SMS-Activate account permissions.',
                code: error.code
            });
        }
        // Handle other errors
        console.error('Error in rentNumber controller:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error',
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
};
exports.rentNumber = rentNumber;
/**
 * Get status and messages for a rented number
 */
const getNumberStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = req.query.page || '0';
        const size = req.query.size || '10';
        // First, look up the phone number in our database to determine the provider and get activation details
        // Try to find by rent_id first, then by id (UUID)
        let phoneRecord;
        let lookupError;
        // Try finding by rent_id first (for backward compatibility)
        const { data: phoneByRentId, error: rentIdError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('provider, external_url, service, country, rent_id, order_booking_id')
            .eq('rent_id', id)
            .maybeSingle();
        if (phoneByRentId) {
            phoneRecord = phoneByRentId;
            lookupError = rentIdError;
        }
        else {
            // If not found by rent_id, try finding by UUID id
            const { data: phoneById, error: idError } = await supabase_1.supabase
                .from('phone_numbers')
                .select('provider, external_url, service, country, rent_id, order_booking_id')
                .eq('id', id)
                .maybeSingle();
            phoneRecord = phoneById;
            lookupError = idError;
            console.log(`[DEBUG] Looking up phone by UUID: ${id}, found:`, phoneRecord);
        }
        if (lookupError) {
            console.error('Error looking up phone number:', lookupError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to lookup phone number in database'
            });
        }
        if (!phoneRecord) {
            return res.status(404).json({
                status: 'error',
                message: 'Phone number not found'
            });
        }
        // Determine provider, default to SMS-Activate for backwards compatibility
        const provider = phoneRecord.provider || 'sms_activate';
        let data;
        // Call appropriate service based on provider
        switch (provider) {
            case 'smspva':
                // For SMSPVA, use the stored activation ID and service/country info
                const smspvaActivationId = phoneRecord.external_url || id;
                const service = phoneRecord.service || 'opt1';
                const country = phoneRecord.country || 'RU';
                console.log(`[CONTROLLER] ===== SMSPVA STATUS REQUEST =====`);
                console.log(`[CONTROLLER] Phone record:`, JSON.stringify(phoneRecord, null, 2));
                console.log(`[CONTROLLER] Activation ID: ${smspvaActivationId}`);
                console.log(`[CONTROLLER] Service: ${service}, Country: ${country}`);
                console.log(`[CONTROLLER] Page: ${page}, Size: ${size}`);
                data = await smspva_service_1.smspvaService.getRentStatus(smspvaActivationId, page, size, service, country);
                console.log(`[CONTROLLER] ===== SMSPVA STATUS RESPONSE =====`);
                console.log(`[CONTROLLER] Response data:`, JSON.stringify(data, null, 2));
                break;
            case 'anosim':
                // For Anosim, use the order booking ID (check multiple fields for compatibility)
                const anosimBookingId = phoneRecord.order_booking_id || phoneRecord.external_url || phoneRecord.rent_id || id;
                console.log(`[ANOSIM] Getting status for order booking ID: ${anosimBookingId}`);
                console.log(`[ANOSIM] Phone record fields - order_booking_id: ${phoneRecord.order_booking_id}, external_url: ${phoneRecord.external_url}, rent_id: ${phoneRecord.rent_id}`);
                data = await anosim_service_1.anosimService.getRentStatus(anosimBookingId, page, size);
                break;
            case 'gogetsms':
                // For GoGetSMS, use the stored activation ID
                const gogetSmsActivationId = phoneRecord.external_url || phoneRecord.rent_id || id;
                console.log(`[GOGETSMS] Getting status for activation ID: ${gogetSmsActivationId}`);
                data = await gogetsms_service_1.gogetSmsService.getRentStatus(gogetSmsActivationId, page, size);
                break;
            case 'sms_activate':
            default:
                data = await smsActivate_service_1.smsActivateService.getRentStatus(id, page, size);
                break;
        }
        res.status(200).json({
            status: 'success',
            data
        });
    }
    catch (error) {
        console.error('Error in getNumberStatus:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to get number status'
        });
    }
};
exports.getNumberStatus = getNumberStatus;
/**
 * Cancel a rental
 */
const cancelRental = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`Cancelling rental with ID: ${id}`);
        // First, look up the phone number in our database to determine the provider
        const { data: phoneRecord, error: lookupError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('provider')
            .eq('rent_id', id)
            .maybeSingle();
        if (lookupError) {
            console.error('Error looking up phone number:', lookupError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to lookup phone number in database'
            });
        }
        // Determine provider, default to SMS-Activate for backwards compatibility
        const provider = phoneRecord?.provider || 'sms_activate';
        let apiCancellationSuccess = false;
        let apiError = null;
        // Step 1: Try to cancel the rental via appropriate API (only if API key is available)
        try {
            let data;
            switch (provider) {
                case 'smspva':
                    if (smspva_service_1.smspvaService.isAvailable()) {
                        data = await smspva_service_1.smspvaService.setRentStatus(id, '2'); // 2 = Cancel
                        console.log('SMSPVA API cancellation response:', data);
                        apiCancellationSuccess = true;
                    }
                    else {
                        console.log('SMSPVA API key not available - skipping API cancellation');
                    }
                    break;
                case 'anosim':
                    if (anosim_service_1.anosimService.isAvailable()) {
                        data = await anosim_service_1.anosimService.setRentStatus(id, '2'); // 2 = Cancel
                        console.log('Anosim API cancellation response:', data);
                        apiCancellationSuccess = true;
                    }
                    else {
                        console.log('Anosim API key not available - skipping API cancellation');
                    }
                    break;
                case 'gogetsms':
                    if (gogetsms_service_1.gogetSmsService.isAvailable()) {
                        data = await gogetsms_service_1.gogetSmsService.setRentStatus(id, '2'); // 2 = Cancel
                        console.log('GoGetSMS API cancellation response:', data);
                        apiCancellationSuccess = true;
                    }
                    else {
                        console.log('GoGetSMS API key not available - skipping API cancellation');
                    }
                    break;
                case 'sms_activate':
                default:
                    if (smsActivate_service_1.smsActivateService.isAvailable()) {
                        data = await smsActivate_service_1.smsActivateService.setRentStatus(id, '2'); // 2 = Cancel
                        console.log('SMS Activate API cancellation response:', data);
                        apiCancellationSuccess = true;
                    }
                    else {
                        console.log('SMS Activate API key not available - skipping API cancellation');
                    }
                    break;
            }
        }
        catch (error) {
            console.log(`${provider.toUpperCase()} API cancellation failed:`, error.message);
            apiError = error;
            // Handle common "rental already inactive" scenarios gracefully
            const isRentalInactiveError = error.code === 'NOT_AUTHORIZED' ||
                error.code === 'HTTP_400' ||
                (error.message && error.message.toLowerCase().includes('not active')) ||
                (error.response && error.response.data &&
                    typeof error.response.data === 'string' &&
                    error.response.data.toLowerCase().includes('not active'));
            if (isRentalInactiveError) {
                console.log('Rental likely already cancelled/expired/inactive - proceeding with database cleanup');
            }
            else {
                // For genuinely unexpected errors, we should still continue but log them
                console.error(`Unexpected API error during cancellation: ${error.message}`, error);
                console.log('Continuing with database cleanup despite API error...');
            }
        }
        // Step 2: Remove the phone number from our database (regardless of API result)
        try {
            const { supabase } = await Promise.resolve().then(() => __importStar(require('../lib/supabase')));
            // Find and delete the phone number by rent_id
            const { data: deletedData, error: deleteError } = await supabase
                .from('phone_numbers')
                .delete()
                .eq('rent_id', id)
                .select();
            if (deleteError) {
                console.error('Error deleting phone number from database:', deleteError);
                throw new Error(`Database deletion failed: ${deleteError.message}`);
            }
            else {
                console.log('Successfully removed phone number from database:', deletedData);
                if (deletedData.length === 0) {
                    console.log('No phone number found in database with rent_id:', id);
                }
            }
        }
        catch (dbError) {
            console.error('Database operation failed during cancellation:', dbError);
            throw new Error(`Failed to remove phone number from database: ${dbError.message}`);
        }
        // Determine response message based on what happened
        let message = '';
        if (apiCancellationSuccess) {
            message = 'Phone number rental cancelled via API and removed from database';
        }
        else if (apiError) {
            const isRentalInactiveError = apiError.code === 'NOT_AUTHORIZED' ||
                apiError.code === 'HTTP_400' ||
                (apiError.message && apiError.message.toLowerCase().includes('not active')) ||
                (apiError.response && apiError.response.data &&
                    typeof apiError.response.data === 'string' &&
                    apiError.response.data.toLowerCase().includes('not active'));
            if (isRentalInactiveError) {
                message = 'Phone number was already cancelled/expired/inactive - removed from database';
            }
            else {
                message = 'Phone number removed from database (API cancellation failed but cleanup completed)';
            }
        }
        else if (!apiCancellationSuccess && !apiError) {
            message = 'Phone number removed from database (API key not available - could not cancel via provider)';
        }
        else {
            message = 'Phone number removed from database';
        }
        res.status(200).json({
            status: 'success',
            message,
            details: {
                apiCancellation: apiCancellationSuccess ? 'success' : (apiError ? 'failed_or_already_inactive' : 'api_key_not_available'),
                databaseRemoval: 'success',
                provider: provider,
                apiError: apiError ? apiError.message : null
            }
        });
    }
    catch (error) {
        console.error('Error in cancelRental:', error);
        next(error);
    }
};
exports.cancelRental = cancelRental;
/**
 * Extend a rental
 */
const extendRental = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rentTime } = req.body;
        if (!rentTime) {
            return res.status(400).json({
                status: 'error',
                message: 'Rental time is required'
            });
        }
        // First, look up the phone number in our database to determine the provider
        const { data: phoneRecord, error: lookupError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('provider')
            .eq('rent_id', id)
            .maybeSingle();
        if (lookupError) {
            console.error('Error looking up phone number:', lookupError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to lookup phone number in database'
            });
        }
        // Determine provider, default to SMS-Activate for backwards compatibility
        const provider = phoneRecord?.provider || 'sms_activate';
        let data;
        // Call appropriate service based on provider (only if API key is available)
        switch (provider) {
            case 'smspva':
                if (!smspva_service_1.smspvaService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'SMSPVA API key not configured - cannot extend rental',
                        code: 'NO_API_KEY'
                    });
                }
                data = await smspva_service_1.smspvaService.continueRentNumber(id, rentTime);
                break;
            case 'anosim':
                if (!anosim_service_1.anosimService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Anosim API key not configured - cannot extend rental',
                        code: 'NO_API_KEY'
                    });
                }
                data = await anosim_service_1.anosimService.continueRentNumber(id, rentTime);
                break;
            case 'gogetsms':
                if (!gogetsms_service_1.gogetSmsService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'GoGetSMS API key not configured - cannot extend rental',
                        code: 'NO_API_KEY'
                    });
                }
                data = await gogetsms_service_1.gogetSmsService.continueRentNumber(id, rentTime);
                break;
            case 'sms_activate':
            default:
                if (!smsActivate_service_1.smsActivateService.isAvailable()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'SMS-Activate API key not configured - cannot extend rental',
                        code: 'NO_API_KEY'
                    });
                }
                data = await smsActivate_service_1.smsActivateService.continueRentNumber(id, rentTime);
                break;
        }
        res.status(200).json({
            status: 'success',
            data
        });
    }
    catch (error) {
        next(error);
    }
};
exports.extendRental = extendRental;
/**
 * Get all active rentals
 */
const getActiveRentals = async (req, res, next) => {
    try {
        const provider = req.query.provider;
        let combinedData = { rentals: [] };
        if (!provider || provider === 'sms_activate') {
            if (smsActivate_service_1.smsActivateService.isAvailable()) {
                try {
                    const smsActivateData = await smsActivate_service_1.smsActivateService.getRentList();
                    if (smsActivateData.rentals) {
                        combinedData.rentals.push(...smsActivateData.rentals.map((rental) => ({
                            ...rental,
                            provider: 'sms_activate'
                        })));
                    }
                }
                catch (error) {
                    console.error('Error fetching SMS-Activate rentals:', error);
                }
            }
            else {
                console.log('SMS-Activate API key not available - skipping rental list fetch');
            }
        }
        if (!provider || provider === 'smspva') {
            if (smspva_service_1.smspvaService.isAvailable()) {
                try {
                    const smspvaData = await smspva_service_1.smspvaService.getRentList();
                    if (smspvaData.rentals) {
                        combinedData.rentals.push(...smspvaData.rentals.map((rental) => ({
                            ...rental,
                            provider: 'smspva'
                        })));
                    }
                }
                catch (error) {
                    console.error('Error fetching SMSPVA rentals:', error);
                }
            }
            else {
                console.log('SMSPVA API key not available - skipping rental list fetch');
            }
        }
        if (!provider || provider === 'anosim') {
            if (anosim_service_1.anosimService.isAvailable()) {
                try {
                    const anosimData = await anosim_service_1.anosimService.getRentList();
                    if (anosimData.rentals) {
                        combinedData.rentals.push(...anosimData.rentals.map((rental) => ({
                            ...rental,
                            provider: 'anosim'
                        })));
                    }
                }
                catch (error) {
                    console.error('Error fetching Anosim rentals:', error);
                }
            }
            else {
                console.log('Anosim API key not available - skipping rental list fetch');
            }
        }
        if (!provider || provider === 'gogetsms') {
            if (gogetsms_service_1.gogetSmsService.isAvailable()) {
                try {
                    const gogetSmsData = await gogetsms_service_1.gogetSmsService.getRentList();
                    if (gogetSmsData.rentals) {
                        combinedData.rentals.push(...gogetSmsData.rentals.map((rental) => ({
                            ...rental,
                            provider: 'gogetsms'
                        })));
                    }
                }
                catch (error) {
                    console.error('Error fetching GoGetSMS rentals:', error);
                }
            }
            else {
                console.log('GoGetSMS API key not available - skipping rental list fetch');
            }
        }
        res.status(200).json({
            status: 'success',
            data: combinedData
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveRentals = getActiveRentals;
/**
 * Handle SMS webhook notifications
 */
const handleSmsWebhook = async (req, res, next) => {
    try {
        // Log the webhook payload
        console.log('Received SMS webhook:', req.body);
        // TODO: Process the webhook data and store in database
        // Always respond with 200 to acknowledge receipt
        res.status(200).json({
            status: 'success',
            message: 'Webhook received'
        });
    }
    catch (error) {
        // Even on error, respond with 200 to prevent retries
        console.error('Error processing webhook:', error);
        res.status(200).json({
            status: 'error',
            message: 'Error processing webhook, but acknowledged'
        });
    }
};
exports.handleSmsWebhook = handleSmsWebhook;
/**
 * Test GoGetSMS API connectivity and available services
 */
const testGoGetSms = async (req, res, next) => {
    try {
        const testResult = await gogetsms_service_1.gogetSmsService.testApiConnectivity();
        res.status(200).json({
            status: 'success',
            data: testResult
        });
    }
    catch (error) {
        console.error('Error testing GoGetSMS:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to test GoGetSMS API'
        });
    }
};
exports.testGoGetSms = testGoGetSms;
/**
 * Test API authentication for all providers - DEBUG ONLY
 */
const testApiAuth = async (req, res, next) => {
    try {
        console.log('🔍 Testing API authentication for all providers...');
        const results = {
            gogetsms: { status: 'unknown', error: null, response: null },
            sms_activate: { status: 'unknown', error: null, response: null },
            anosim: { status: 'unknown', error: null, response: null },
            smspva: { status: 'unknown', error: null, response: null }
        };
        // Test GoGetSMS - check balance
        try {
            console.log('🔍 Testing GoGetSMS...');
            const gogetResponse = await gogetsms_service_1.gogetSmsService.getBalance();
            results.gogetsms.status = 'success';
            results.gogetsms.response = gogetResponse;
            console.log('✅ GoGetSMS: Success');
        }
        catch (error) {
            results.gogetsms.status = 'error';
            results.gogetsms.error = error.message;
            console.log('❌ GoGetSMS:', error.message);
        }
        // Test SMS-Activate - try getting services
        try {
            console.log('🔍 Testing SMS-Activate...');
            const smsResponse = await smsActivate_service_1.smsActivateService.getRentServicesAndCountries();
            results.sms_activate.status = 'success';
            results.sms_activate.response = 'Services fetched successfully';
            console.log('✅ SMS-Activate: Success');
        }
        catch (error) {
            results.sms_activate.status = 'error';
            results.sms_activate.error = error.message;
            console.log('❌ SMS-Activate:', error.message);
        }
        // Test Anosim - get products  
        try {
            console.log('🔍 Testing Anosim...');
            const anosimResponse = await anosim_service_1.anosimService.getProducts('43'); // Germany
            results.anosim.status = 'success';
            results.anosim.response = `Found ${anosimResponse.length} products`;
            console.log('✅ Anosim: Success');
        }
        catch (error) {
            results.anosim.status = 'error';
            results.anosim.error = error.message;
            console.log('❌ Anosim:', error.message);
        }
        // Test SMSPVA - get services
        try {
            console.log('🔍 Testing SMSPVA...');
            const smspvaResponse = await smspva_service_1.smspvaService.getRentServicesAndCountries();
            results.smspva.status = 'success';
            results.smspva.response = 'Services fetched successfully';
            console.log('✅ SMSPVA: Success');
        }
        catch (error) {
            results.smspva.status = 'error';
            results.smspva.error = error.message;
            console.log('❌ SMSPVA:', error.message);
        }
        res.status(200).json({
            status: 'success',
            message: 'API authentication test completed',
            results
        });
    }
    catch (error) {
        console.error('Error in API auth test:', error);
        next(error);
    }
};
exports.testApiAuth = testApiAuth;
// Test GoGetSMS dual-mode functionality
const testGoGetSmsDualMode = async (req, res) => {
    try {
        const { mode = 'activation', service = 'wa', country = '16' } = req.query;
        console.log(`[TEST] Testing GoGetSMS ${mode} mode - Service: ${service}, Country: ${country}`);
        if (mode === 'activation') {
            // Test activation mode
            console.log('[TEST] Testing activation services...');
            const services = await gogetsms_service_1.gogetSmsService.getActivationServices(country);
            console.log('[TEST] Activation services:', Object.keys(services.services).length);
            res.json({
                status: 'success',
                mode: 'activation',
                message: `Found ${Object.keys(services.services).length} activation services`,
                data: {
                    services: Object.keys(services.services).slice(0, 10), // First 10 services
                    countries: services.countries,
                    sampleService: services.services['wa'] || services.services['ot']
                }
            });
        }
        else {
            // Test rental mode
            console.log('[TEST] Testing rental services...');
            const services = await gogetsms_service_1.gogetSmsService.getRentalServices('4', country);
            console.log('[TEST] Rental services:', services);
            res.json({
                status: 'success',
                mode: 'rental',
                message: 'Rental services retrieved',
                data: services
            });
        }
    }
    catch (error) {
        console.error('[TEST] GoGetSMS dual-mode test error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
};
exports.testGoGetSmsDualMode = testGoGetSmsDualMode;
// Test Anosim API key and functionality
const testAnosimApiKey = async (req, res) => {
    try {
        console.log('[TEST] Testing Anosim API key...');
        // Test API key first
        const keyTest = await anosim_service_1.anosimService.testApiKey();
        if (!keyTest.valid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key',
                details: keyTest.error
            });
        }
        // Test getting products
        const products = await anosim_service_1.anosimService.getProducts();
        const activationProducts = products.filter((p) => p.rentalType === 'Activation');
        const rentalProducts = products.filter((p) => p.rentalType === 'RentalFull' || p.rentalType === 'RentalService');
        res.json({
            success: true,
            balance: keyTest.balance,
            totalProducts: products.length,
            activationProducts: activationProducts.length,
            rentalProducts: rentalProducts.length,
            sampleActivation: activationProducts.slice(0, 3),
            sampleRental: rentalProducts.slice(0, 3)
        });
    }
    catch (error) {
        console.error('[TEST] Anosim API test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
};
exports.testAnosimApiKey = testAnosimApiKey;
// Test Anosim service integration - get services and countries
const testAnosimServices = async (req, res) => {
    try {
        console.log('[TEST] Testing Anosim services integration...');
        // Test getting services and countries
        const servicesData = await anosim_service_1.anosimService.getRentServicesAndCountries();
        const serviceCount = Object.keys(servicesData.services || {}).length;
        const countryCount = Object.keys(servicesData.countries || {}).length;
        res.json({
            success: true,
            message: 'Anosim services integration working',
            serviceCount,
            countryCount,
            sampleServices: Object.entries(servicesData.services || {}).slice(0, 5),
            sampleCountries: Object.entries(servicesData.countries || {}).slice(0, 5)
        });
    }
    catch (error) {
        console.error('[TEST] Anosim services test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
};
exports.testAnosimServices = testAnosimServices;
/**
 * Get available SMS providers - check which providers have API keys configured
 */
const getAvailableProviders = async (req, res) => {
    try {
        console.log('[API] Checking available SMS providers...');
        const providers = {
            sms_activate: {
                available: smsActivate_service_1.smsActivateService.isAvailable(),
                name: 'SMS-Activate',
                description: 'International SMS service with rental and activation options'
            },
            smspva: {
                available: smspva_service_1.smspvaService.isAvailable(),
                name: 'SMSPVA',
                description: 'Russian SMS service provider'
            },
            anosim: {
                available: anosim_service_1.anosimService.isAvailable(),
                name: 'Anosim',
                description: 'German SMS service provider with dual-mode support'
            },
            gogetsms: {
                available: gogetsms_service_1.gogetSmsService.isAvailable(),
                name: 'GoGetSMS',
                description: 'International SMS service with activation and rental modes'
            },
            receive_sms_online: {
                available: true, // Always available as it doesn't require API key
                name: 'Receive SMS Online',
                description: 'Manual SMS collection from receive-sms-online.info (no API key required)'
            }
        };
        const availableCount = Object.values(providers).filter(p => p.available).length;
        console.log(`[API] Found ${availableCount} available providers out of ${Object.keys(providers).length}`);
        res.status(200).json({
            status: 'success',
            data: {
                providers,
                availableCount,
                totalCount: Object.keys(providers).length
            }
        });
    }
    catch (error) {
        console.error('[API] Error checking available providers:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to check available providers'
        });
    }
};
exports.getAvailableProviders = getAvailableProviders;
