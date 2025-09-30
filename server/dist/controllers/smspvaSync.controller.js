"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSingleSmspvaNumber = exports.syncSingleSmspvaNumberEndpoint = exports.syncSmspvaMessages = void 0;
const smspva_service_1 = require("../services/smspva.service");
const supabase_1 = require("../lib/supabase");
/**
 * Sync messages from all active SMSPVA phone numbers
 */
const syncSmspvaMessages = async (req, res, next) => {
    try {
        console.log('[SMSPVA-SYNC] Starting sync for all active SMSPVA numbers');
        // Get all active SMSPVA phone numbers from database
        const { data: phoneNumbers, error: fetchError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('provider', 'smspva')
            .eq('status', 'active');
        if (fetchError) {
            console.error('[SMSPVA-SYNC] Error fetching phone numbers:', fetchError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch SMSPVA phone numbers'
            });
        }
        if (!phoneNumbers || phoneNumbers.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No active SMSPVA phone numbers to sync',
                synced: 0
            });
        }
        console.log(`[SMSPVA-SYNC] Found ${phoneNumbers.length} active SMSPVA numbers to sync`);
        let totalSynced = 0;
        let errors = [];
        // Sync messages for each phone number
        for (const phoneNumber of phoneNumbers) {
            try {
                const syncResult = await (0, exports.syncSingleSmspvaNumber)(phoneNumber.rent_id, phoneNumber.id);
                totalSynced += syncResult.newMessages;
                console.log(`[SMSPVA-SYNC] Synced ${syncResult.newMessages} new messages for ${phoneNumber.phone_number}`);
            }
            catch (error) {
                console.error(`[SMSPVA-SYNC] Error syncing ${phoneNumber.phone_number}:`, error);
                errors.push({
                    phoneNumber: phoneNumber.phone_number,
                    error: error.message
                });
            }
        }
        res.status(200).json({
            status: 'success',
            message: `Synced messages from ${phoneNumbers.length} SMSPVA numbers`,
            totalNumbers: phoneNumbers.length,
            totalNewMessages: totalSynced,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        console.error('[SMSPVA-SYNC] Error in bulk sync:', error);
        next(error);
    }
};
exports.syncSmspvaMessages = syncSmspvaMessages;
/**
 * Sync messages from a specific SMSPVA phone number
 */
const syncSingleSmspvaNumberEndpoint = async (req, res, next) => {
    try {
        const { rentId } = req.params;
        if (!rentId) {
            return res.status(400).json({
                status: 'error',
                message: 'Rent ID is required'
            });
        }
        // Get the phone number record from database
        const { data: phoneNumber, error: fetchError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('rent_id', rentId)
            .eq('provider', 'smspva')
            .maybeSingle();
        if (fetchError) {
            console.error('[SMSPVA-SYNC] Error fetching phone number:', fetchError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch phone number'
            });
        }
        if (!phoneNumber) {
            return res.status(404).json({
                status: 'error',
                message: 'SMSPVA phone number not found'
            });
        }
        const result = await (0, exports.syncSingleSmspvaNumber)(rentId, phoneNumber.id);
        res.status(200).json({
            status: 'success',
            message: `Synced ${result.newMessages} new messages`,
            data: result
        });
    }
    catch (error) {
        console.error('[SMSPVA-SYNC] Error in single sync:', error);
        next(error);
    }
};
exports.syncSingleSmspvaNumberEndpoint = syncSingleSmspvaNumberEndpoint;
/**
 * Internal function to sync messages from a single SMSPVA number
 */
const syncSingleSmspvaNumber = async (rentId, phoneNumberId) => {
    try {
        console.log(`[SMSPVA-SYNC] Starting sync for rent ID: ${rentId}`);
        // Get messages from SMSPVA Rental Messages API
        const apiResponse = await smspva_service_1.smspvaService.getRentalMessages(rentId);
        if (!apiResponse || !apiResponse.messages || !Array.isArray(apiResponse.messages)) {
            console.log(`[SMSPVA-SYNC] No messages found for rent ID: ${rentId}`);
            return { newMessages: 0, totalMessages: 0 };
        }
        const messages = apiResponse.messages;
        if (messages.length === 0) {
            console.log(`[SMSPVA-SYNC] No messages to sync for rent ID: ${rentId}`);
            return { newMessages: 0, totalMessages: 0 };
        }
        console.log(`[SMSPVA-SYNC] Found ${messages.length} messages from API for rent ID: ${rentId}`);
        let newMessages = 0;
        // Process each message
        for (const message of messages) {
            try {
                // Check if message already exists (prevent duplicates)
                const messageHash = `${rentId}-${message.sender}-${message.text}-${message.date}`;
                const { data: existingMessage } = await supabase_1.supabase
                    .from('phone_messages')
                    .select('id')
                    .eq('phone_number_id', phoneNumberId)
                    .eq('sender', message.sender || 'Unknown')
                    .eq('message', message.text || '')
                    .maybeSingle();
                if (existingMessage) {
                    console.log(`[SMSPVA-SYNC] Message already exists, skipping: ${messageHash}`);
                    continue;
                }
                // Parse received date
                let receivedAt = new Date().toISOString();
                if (message.date) {
                    try {
                        receivedAt = new Date(message.date).toISOString();
                    }
                    catch (dateError) {
                        console.warn(`[SMSPVA-SYNC] Invalid date format: ${message.date}, using current time`);
                    }
                }
                // Insert new message
                const { error: insertError } = await supabase_1.supabase
                    .from('phone_messages')
                    .insert({
                    phone_number_id: phoneNumberId,
                    sender: message.sender || 'Unknown',
                    message: message.text || '',
                    received_at: receivedAt,
                    message_source: 'api'
                });
                if (insertError) {
                    console.error(`[SMSPVA-SYNC] Error inserting message:`, insertError);
                    continue;
                }
                newMessages++;
                console.log(`[SMSPVA-SYNC] Inserted new message from ${message.sender}: ${message.text}`);
            }
            catch (messageError) {
                console.error(`[SMSPVA-SYNC] Error processing individual message:`, messageError);
            }
        }
        // Update the phone number's last sync timestamp
        await supabase_1.supabase
            .from('phone_numbers')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', phoneNumberId);
        console.log(`[SMSPVA-SYNC] Completed sync for rent ID: ${rentId}, new messages: ${newMessages}`);
        return {
            newMessages,
            totalMessages: messages.length,
            rentId,
            phoneNumberId
        };
    }
    catch (error) {
        console.error(`[SMSPVA-SYNC] Error syncing single number ${rentId}:`, error);
        throw error;
    }
};
exports.syncSingleSmspvaNumber = syncSingleSmspvaNumber;
