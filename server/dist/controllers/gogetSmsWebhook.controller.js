"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gogetSmsWebhookHealth = exports.handleGoGetSmsWebhook = void 0;
const supabase_1 = require("../lib/supabase");
/**
 * GoGetSMS Webhook Controller
 * Handles real-time SMS notifications from GoGetSMS API
 */
/**
 * Handle incoming webhook from GoGetSMS
 * Expected payload format based on API documentation:
 * {
 *   "id": "activation_id",
 *   "phone": "phone_number",
 *   "text": "sms_message_content",
 *   "sender": "sender_phone_number",
 *   "date": "2024-01-01 12:00:00"
 * }
 */
const handleGoGetSmsWebhook = async (req, res, next) => {
    try {
        console.log('[GOGETSMS_WEBHOOK] Received webhook:', req.body);
        const { id, phone, text, sender, date } = req.body;
        // Validate required fields
        if (!id || !phone || !text) {
            console.error('[GOGETSMS_WEBHOOK] Invalid webhook payload - missing required fields');
            return res.status(400).json({
                status: 'error',
                message: 'Invalid webhook payload - missing required fields'
            });
        }
        // Find the phone number record in our database
        const { data: phoneRecord, error: phoneError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('id, phone_number, provider')
            .eq('phone_number', phone)
            .eq('provider', 'gogetsms')
            .single();
        if (phoneError) {
            console.error('[GOGETSMS_WEBHOOK] Error finding phone number:', phoneError);
            // Still return success to prevent webhook retries for unknown numbers
            return res.status(200).json({
                status: 'success',
                message: 'Phone number not found in database'
            });
        }
        if (!phoneRecord) {
            console.log('[GOGETSMS_WEBHOOK] Phone number not found in database:', phone);
            return res.status(200).json({
                status: 'success',
                message: 'Phone number not found in database'
            });
        }
        console.log('[GOGETSMS_WEBHOOK] Found phone record:', phoneRecord.id);
        // Check if message already exists to prevent duplicates
        const { data: existingMessage, error: existingError } = await supabase_1.supabase
            .from('phone_messages')
            .select('id')
            .eq('phone_number_id', phoneRecord.id)
            .eq('sender', sender || 'Unknown')
            .eq('message', text)
            .eq('received_at', new Date(date || new Date()).toISOString())
            .single();
        if (existingMessage) {
            console.log('[GOGETSMS_WEBHOOK] Message already exists, skipping duplicate');
            return res.status(200).json({
                status: 'success',
                message: 'Message already processed'
            });
        }
        // Insert the new message
        const { data: messageData, error: messageError } = await supabase_1.supabase
            .from('phone_messages')
            .insert({
            phone_number_id: phoneRecord.id,
            sender: sender || 'Unknown',
            message: text,
            message_source: 'webhook',
            received_at: new Date(date || new Date()).toISOString()
        })
            .select()
            .single();
        if (messageError) {
            console.error('[GOGETSMS_WEBHOOK] Error inserting message:', messageError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to save message to database'
            });
        }
        console.log('[GOGETSMS_WEBHOOK] Successfully saved message:', messageData.id);
        // Return success response
        res.status(200).json({
            status: 'success',
            message: 'Webhook processed successfully',
            data: {
                messageId: messageData.id,
                phoneNumberId: phoneRecord.id
            }
        });
    }
    catch (error) {
        console.error('[GOGETSMS_WEBHOOK] Unexpected error:', error);
        next(error);
    }
};
exports.handleGoGetSmsWebhook = handleGoGetSmsWebhook;
/**
 * Health check endpoint for GoGetSMS webhook
 */
const gogetSmsWebhookHealth = async (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'GoGetSMS webhook endpoint is healthy',
        timestamp: new Date().toISOString()
    });
};
exports.gogetSmsWebhookHealth = gogetSmsWebhookHealth;
