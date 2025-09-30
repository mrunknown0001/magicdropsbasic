"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPhoneNumbers = void 0;
const smsActivate_service_1 = require("../services/smsActivate.service");
const smspva_service_1 = require("../services/smspva.service");
const gogetsms_service_1 = require("../services/gogetsms.service");
const supabase_1 = require("../lib/supabase");
/**
 * Synchronize rented numbers from API to database
 */
const syncPhoneNumbers = async (req, res, next) => {
    try {
        const provider = req.query.provider;
        console.log(`Starting phone number synchronization for provider: ${provider || 'all'}...`);
        let totalSynced = 0;
        let syncResults = [];
        // Step 1: Sync SMS-Activate if no provider specified or if specifically requested
        if (!provider || provider === 'sms_activate') {
            console.log('Syncing SMS-Activate rentals...');
            try {
                const smsResult = await syncSmsActivateRentals();
                syncResults.push({ provider: 'sms_activate', ...smsResult });
                totalSynced += smsResult.synced;
            }
            catch (error) {
                console.error('Error syncing SMS-Activate rentals:', error);
                syncResults.push({
                    provider: 'sms_activate',
                    status: 'error',
                    error: error.message,
                    synced: 0
                });
            }
        }
        // Step 2: Sync SMSPVA if no provider specified or if specifically requested
        if (!provider || provider === 'smspva') {
            console.log('Syncing SMSPVA rentals...');
            try {
                const smspvaResult = await syncSmspvaRentals();
                syncResults.push({ provider: 'smspva', ...smspvaResult });
                totalSynced += smspvaResult.synced;
            }
            catch (error) {
                console.error('Error syncing SMSPVA rentals:', error);
                syncResults.push({
                    provider: 'smspva',
                    status: 'error',
                    error: error.message,
                    synced: 0
                });
            }
        }
        // Step 3: Sync GoGetSMS if no provider specified or if specifically requested
        if (!provider || provider === 'gogetsms') {
            console.log('Syncing GoGetSMS rentals...');
            try {
                const gogetSmsResult = await syncGoGetSmsRentals();
                syncResults.push({ provider: 'gogetsms', ...gogetSmsResult });
                totalSynced += gogetSmsResult.synced;
            }
            catch (error) {
                console.error('Error syncing GoGetSMS rentals:', error);
                syncResults.push({
                    provider: 'gogetsms',
                    status: 'error',
                    error: error.message,
                    synced: 0
                });
            }
        }
        return res.status(200).json({
            status: 'success',
            message: `Synchronization complete. Total synced: ${totalSynced}`,
            data: {
                totalSynced,
                results: syncResults
            }
        });
    }
    catch (error) {
        console.error('Error in syncPhoneNumbers controller:', error);
        next(error);
    }
};
exports.syncPhoneNumbers = syncPhoneNumbers;
/**
 * Internal function to sync SMS-Activate rentals
 */
async function syncSmsActivateRentals() {
    console.log('Fetching SMS-Activate rentals...');
    // Step 1: Get all active rentals from SMS-Activate API
    const apiRentals = await smsActivate_service_1.smsActivateService.getRentList();
    console.log('SMS-Activate API rentals:', JSON.stringify(apiRentals, null, 2));
    if (!apiRentals || !apiRentals.values) {
        return {
            status: 'success',
            message: 'No active rentals found in SMS-Activate API',
            synced: 0
        };
    }
    // Step 2: Convert to array if it's an object
    const rentalValues = apiRentals.values;
    const rentalData = [];
    if (typeof rentalValues === 'object' && !Array.isArray(rentalValues)) {
        // Handle object format
        for (const [rentId, data] of Object.entries(rentalValues)) {
            let phoneNumber = '';
            let id = null;
            if (data !== null && typeof data === 'object') {
                // Try to extract phone number and id from object
                phoneNumber = data.phone || data.number || '';
                id = data.id || null;
            }
            else if (typeof data === 'string') {
                // If data is directly the phone number
                phoneNumber = data;
            }
            if (phoneNumber) {
                rentalData.push({
                    rent_id: rentId,
                    phone_number: phoneNumber,
                    id,
                    provider: 'sms_activate'
                });
            }
        }
    }
    console.log(`Found ${rentalData.length} active SMS-Activate rentals in API`);
    if (rentalData.length === 0) {
        return {
            status: 'success',
            message: 'No active SMS-Activate rentals to sync',
            synced: 0
        };
    }
    return await syncRentalsToDatabase(rentalData, 'sms_activate');
}
/**
 * Internal function to sync SMSPVA rentals
 */
async function syncSmspvaRentals() {
    console.log('Fetching SMSPVA rentals...');
    // Step 1: Get all active rentals from SMSPVA API
    const apiRentals = await smspva_service_1.smspvaService.getRentList();
    console.log('SMSPVA API rentals:', JSON.stringify(apiRentals, null, 2));
    if (!apiRentals || !apiRentals.rentals) {
        return {
            status: 'success',
            message: 'No active rentals found in SMSPVA API',
            synced: 0
        };
    }
    // Step 2: Process SMSPVA rentals
    const rentals = Array.isArray(apiRentals.rentals) ? apiRentals.rentals : [];
    const rentalData = [];
    for (const rental of rentals) {
        if (rental && typeof rental === 'object' && rental.id && rental.number) {
            rentalData.push({
                rent_id: rental.id,
                phone_number: rental.number,
                id: rental.id,
                provider: 'smspva'
            });
        }
    }
    console.log(`Found ${rentalData.length} active SMSPVA rentals in API`);
    if (rentalData.length === 0) {
        return {
            status: 'success',
            message: 'No active SMSPVA rentals to sync',
            synced: 0
        };
    }
    return await syncRentalsToDatabase(rentalData, 'smspva');
}
/**
 * Common function to sync rentals to database
 */
async function syncRentalsToDatabase(rentalData, provider) {
    // Step 1: Get existing phone numbers from database for this provider
    const { data: existingPhones, error: fetchError } = await supabase_1.supabase
        .from('phone_numbers')
        .select('rent_id, phone_number')
        .eq('provider', provider);
    if (fetchError) {
        console.error(`Error fetching existing ${provider} phone numbers:`, fetchError);
        throw new Error(`Error fetching existing ${provider} phone numbers: ${fetchError.message}`);
    }
    console.log(`Found ${existingPhones.length} existing ${provider} phone numbers in database`);
    // Step 2: Filter out phone numbers that are already in the database
    const existingRentIds = new Set(existingPhones.map(phone => phone.rent_id));
    const existingPhoneNumbers = new Set(existingPhones.map(phone => phone.phone_number));
    const newRentals = rentalData.filter(rental => !existingRentIds.has(rental.rent_id) &&
        rental.phone_number &&
        !existingPhoneNumbers.has(rental.phone_number));
    console.log(`Found ${newRentals.length} new ${provider} rentals to sync`);
    if (newRentals.length === 0) {
        return {
            status: 'success',
            message: `All ${provider} rentals already synced`,
            synced: 0
        };
    }
    // Step 3: Insert new phone numbers into database
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 4); // Default 4 hours
    const phonesToInsert = newRentals.map(rental => ({
        phone_number: rental.phone_number,
        rent_id: rental.rent_id,
        service: 'unknown', // Service info isn't available in getRentList response
        country: '0', // Country info isn't available in getRentList response
        end_date: endDate.toISOString(),
        status: 'active',
        provider: rental.provider
    }));
    console.log(`Inserting new ${provider} phone numbers:`, phonesToInsert);
    const { data: insertedData, error: insertError } = await supabase_1.supabase
        .from('phone_numbers')
        .insert(phonesToInsert)
        .select();
    if (insertError) {
        console.error(`Error inserting new ${provider} phone numbers:`, insertError);
        throw new Error(`Error inserting new ${provider} phone numbers: ${insertError.message}`);
    }
    console.log(`Successfully synced ${insertedData.length} ${provider} phone numbers`);
    return {
        status: 'success',
        message: `Successfully synced ${insertedData.length} ${provider} phone numbers`,
        synced: insertedData.length,
        phoneNumbers: insertedData
    };
}
/**
 * Internal function to sync GoGetSMS rentals
 */
async function syncGoGetSmsRentals() {
    console.log('Fetching GoGetSMS rentals...');
    // Step 1: Get all active rentals from GoGetSMS API
    const apiRentals = await gogetsms_service_1.gogetSmsService.getRentList();
    console.log('GoGetSMS API rentals:', JSON.stringify(apiRentals, null, 2));
    if (!apiRentals || !apiRentals.rentals) {
        return {
            status: 'success',
            message: 'No active rentals found in GoGetSMS API',
            synced: 0
        };
    }
    // Step 2: Process GoGetSMS rentals
    const rentals = Array.isArray(apiRentals.rentals) ? apiRentals.rentals : [];
    const rentalData = [];
    for (const rental of rentals) {
        if (rental && typeof rental === 'object' && rental.id && rental.phoneNumber) {
            rentalData.push({
                rent_id: rental.id,
                phone_number: rental.phoneNumber,
                id: rental.id,
                provider: 'gogetsms'
            });
        }
    }
    console.log(`Found ${rentalData.length} active GoGetSMS rentals in API`);
    if (rentalData.length === 0) {
        return {
            status: 'success',
            message: 'No active GoGetSMS rentals to sync',
            synced: 0
        };
    }
    return await syncRentalsToDatabase(rentalData, 'gogetsms');
}
