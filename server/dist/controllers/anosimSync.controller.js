"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSingleAnosimNumber = exports.syncSingleAnosimNumberEndpoint = exports.syncAnosimMessages = void 0;
const anosim_service_1 = require("../services/anosim.service");
const supabase_1 = require("../lib/supabase");
const anosimBookingResolver_service_1 = require("../services/anosimBookingResolver.service");
/**
 * Sync messages from all active Anosim phone numbers
 * Similar to SMSPVA sync controller but for Anosim
 */
const syncAnosimMessages = async (req, res, next) => {
    try {
        console.log('[ANOSIM-SYNC] Starting sync for all active Anosim numbers');
        // Get all active Anosim phone numbers from database
        const { data: phoneNumbers, error: fetchError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('provider', 'anosim')
            .eq('status', 'active');
        if (fetchError) {
            console.error('[ANOSIM-SYNC] Error fetching phone numbers:', fetchError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch Anosim phone numbers'
            });
        }
        if (!phoneNumbers || phoneNumbers.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No active Anosim phone numbers to sync',
                synced: 0
            });
        }
        console.log(`[ANOSIM-SYNC] Found ${phoneNumbers.length} active Anosim numbers to sync`);
        let totalSynced = 0;
        let errors = [];
        // Sync messages for each phone number
        for (const phoneNumber of phoneNumbers) {
            try {
                const bookingId = phoneNumber.order_booking_id || phoneNumber.external_url || phoneNumber.rent_id;
                const syncResult = await (0, exports.syncSingleAnosimNumber)(bookingId, phoneNumber.id);
                totalSynced += syncResult.newMessages;
                console.log(`[ANOSIM-SYNC] Synced ${syncResult.newMessages} new messages for ${phoneNumber.phone_number}`);
            }
            catch (error) {
                console.error(`[ANOSIM-SYNC] Error syncing ${phoneNumber.phone_number}:`, error);
                errors.push({
                    phoneNumber: phoneNumber.phone_number,
                    error: error.message
                });
            }
        }
        res.status(200).json({
            status: 'success',
            message: `Synced messages from ${phoneNumbers.length} Anosim numbers`,
            totalNumbers: phoneNumbers.length,
            totalNewMessages: totalSynced,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        console.error('[ANOSIM-SYNC] Error in bulk sync:', error);
        next(error);
    }
};
exports.syncAnosimMessages = syncAnosimMessages;
/**
 * Sync messages from a specific Anosim phone number
 */
const syncSingleAnosimNumberEndpoint = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                status: 'error',
                message: 'Booking ID is required'
            });
        }
        // Get the phone number record from database
        const { data: phoneNumber, error: fetchError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .or(`order_booking_id.eq.${bookingId},external_url.eq.${bookingId},rent_id.eq.${bookingId}`)
            .eq('provider', 'anosim')
            .maybeSingle();
        if (fetchError) {
            console.error('[ANOSIM-SYNC] Error fetching phone number:', fetchError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch phone number'
            });
        }
        if (!phoneNumber) {
            return res.status(404).json({
                status: 'error',
                message: 'Anosim phone number not found'
            });
        }
        const result = await (0, exports.syncSingleAnosimNumber)(bookingId, phoneNumber.id);
        res.status(200).json({
            status: 'success',
            message: `Synced ${result.newMessages} new messages`,
            data: result
        });
    }
    catch (error) {
        console.error('[ANOSIM-SYNC] Error in single sync:', error);
        next(error);
    }
};
exports.syncSingleAnosimNumberEndpoint = syncSingleAnosimNumberEndpoint;
/**
 * Internal function to sync messages from a single Anosim number
 * Enhanced with booking ID resolution
 */
const syncSingleAnosimNumber = async (bookingId, phoneNumberId) => {
    try {
        console.log(`[ANOSIM-SYNC] Starting sync for booking ID: ${bookingId}`);
        // First, get the phone number from database to resolve correct booking ID
        const { data: phoneRecord, error: phoneError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('id', phoneNumberId)
            .single();
        if (phoneError || !phoneRecord) {
            throw new Error(`Phone record not found: ${phoneError?.message}`);
        }
        console.log(`[ANOSIM-SYNC] Phone record:`, phoneRecord);
        // Try to resolve the correct booking ID if needed
        let actualBookingId = bookingId;
        // If the booking ID doesn't work, try to resolve it
        try {
            const testSms = await anosim_service_1.anosimService.getSms(bookingId);
            if (!Array.isArray(testSms) || testSms.length === 0) {
                console.log(`[ANOSIM-SYNC] No messages with booking ID ${bookingId}, attempting to resolve correct ID`);
                const resolvedInfo = await anosimBookingResolver_service_1.AnosimBookingResolver.resolveBookingId(phoneRecord.phone_number);
                if (resolvedInfo && resolvedInfo.isActive) {
                    console.log(`[ANOSIM-SYNC] Resolved correct booking ID: ${resolvedInfo.bookingId}`);
                    actualBookingId = resolvedInfo.bookingId;
                    // Update database with correct info
                    await anosimBookingResolver_service_1.AnosimBookingResolver.updateDatabaseRecord(phoneNumberId, resolvedInfo);
                }
            }
        }
        catch (resolveError) {
            console.log(`[ANOSIM-SYNC] Could not resolve booking ID, continuing with: ${bookingId}`);
        }
        // Get messages from Anosim API with correct booking ID
        const smsResponse = await anosim_service_1.anosimService.getSms(actualBookingId);
        console.log(`[ANOSIM-SYNC] Raw SMS response for ${actualBookingId}:`, JSON.stringify(smsResponse, null, 2));
        // Handle different response formats from Anosim
        let messages = [];
        if (Array.isArray(smsResponse)) {
            // Direct array of messages
            messages = smsResponse;
            console.log(`[ANOSIM-SYNC] Processing direct array with ${messages.length} messages`);
        }
        else if (smsResponse && Array.isArray(smsResponse.data)) {
            // Wrapped in data property
            messages = smsResponse.data;
            console.log(`[ANOSIM-SYNC] Processing wrapped array with ${messages.length} messages`);
        }
        else if (smsResponse && smsResponse.messages && Array.isArray(smsResponse.messages)) {
            // Wrapped in messages property
            messages = smsResponse.messages;
            console.log(`[ANOSIM-SYNC] Processing messages array with ${messages.length} messages`);
        }
        else {
            console.log(`[ANOSIM-SYNC] No messages found or unexpected format for booking ID: ${bookingId}`);
            console.log(`[ANOSIM-SYNC] Response type: ${typeof smsResponse}, keys:`, Object.keys(smsResponse || {}));
            return { newMessages: 0, totalMessages: 0 };
        }
        if (messages.length === 0) {
            console.log(`[ANOSIM-SYNC] No messages to sync for booking ID: ${bookingId}`);
            return { newMessages: 0, totalMessages: 0 };
        }
        console.log(`[ANOSIM-SYNC] Found ${messages.length} messages from API for booking ID: ${bookingId}`);
        let newMessages = 0;
        // Process each message
        for (const message of messages) {
            try {
                // Extract message data using CORRECT Anosim API field names
                const sender = message.messageSender || message.from || message.sender || 'Unknown';
                const messageText = message.messageText || message.message || message.text || '';
                const receivedAt = message.messageDate || message.receivedAt || message.date || message.received_at || new Date().toISOString();
                console.log(`[ANOSIM-SYNC] Processing message: sender="${sender}", text="${messageText?.substring(0, 50)}...", date="${receivedAt}"`);
                if (!messageText) {
                    console.log(`[ANOSIM-SYNC] Skipping message with no text content:`, message);
                    continue;
                }
                // Check if message already exists (prevent duplicates)
                const { data: existingMessage } = await supabase_1.supabase
                    .from('phone_messages')
                    .select('id')
                    .eq('phone_number_id', phoneNumberId)
                    .eq('sender', sender)
                    .eq('message', messageText)
                    .maybeSingle();
                if (existingMessage) {
                    console.log(`[ANOSIM-SYNC] Message already exists, skipping: ${sender} - ${messageText.substring(0, 50)}`);
                    continue;
                }
                // Parse received date
                let parsedReceivedAt = new Date().toISOString();
                if (receivedAt) {
                    try {
                        // Handle different date formats from Anosim
                        if (typeof receivedAt === 'string') {
                            parsedReceivedAt = new Date(receivedAt).toISOString();
                        }
                        else if (typeof receivedAt === 'number') {
                            // Unix timestamp
                            parsedReceivedAt = new Date(receivedAt * 1000).toISOString();
                        }
                    }
                    catch (dateError) {
                        console.warn(`[ANOSIM-SYNC] Invalid date format: ${receivedAt}, using current time`);
                    }
                }
                // Insert new message
                const { error: insertError } = await supabase_1.supabase
                    .from('phone_messages')
                    .insert({
                    phone_number_id: phoneNumberId,
                    sender: sender,
                    message: messageText,
                    received_at: parsedReceivedAt,
                    message_source: 'api'
                });
                if (insertError) {
                    console.error(`[ANOSIM-SYNC] Error inserting message:`, insertError);
                    continue;
                }
                newMessages++;
                console.log(`[ANOSIM-SYNC] Inserted new message from ${sender}: ${messageText.substring(0, 50)}...`);
            }
            catch (messageError) {
                console.error(`[ANOSIM-SYNC] Error processing individual message:`, messageError);
            }
        }
        // Update the phone number's last sync timestamp
        await supabase_1.supabase
            .from('phone_numbers')
            .update({
            updated_at: new Date().toISOString(),
            last_message_check: new Date().toISOString()
        })
            .eq('id', phoneNumberId);
        console.log(`[ANOSIM-SYNC] Completed sync for booking ID: ${bookingId}, new messages: ${newMessages}`);
        return {
            newMessages,
            totalMessages: messages.length,
            bookingId,
            phoneNumberId
        };
    }
    catch (error) {
        console.error(`[ANOSIM-SYNC] Error syncing single number ${bookingId}:`, error);
        throw error;
    }
};
exports.syncSingleAnosimNumber = syncSingleAnosimNumber;
