"use strict";
/**
 * @deprecated This email scheduler service has been replaced by the manual approval system.
 *
 * IMPORTANT: This file is kept for reference and potential rollback purposes only.
 * The new system uses manual approval/rejection endpoints that send emails immediately:
 * - POST /api/email/approve-application
 * - POST /api/email/reject-application
 *
 * This scheduler-based approach is no longer used as of 2025-01-27.
 *
 * Migration Notes:
 * - Email queue table may still exist but is not actively used
 * - Email delay settings are no longer relevant
 * - All email sending is now triggered by admin actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailScheduler = exports.EmailSchedulerService = void 0;
const supabase_1 = require("../lib/supabase");
const resend_service_1 = require("./resend.service");
class EmailSchedulerService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
    }
    /**
     * Get email delay settings from the database
     */
    static async getEmailDelaySettings() {
        try {
            const { data, error } = await supabase_1.supabase
                .from('settings')
                .select('email_delay_enabled, email_delay_hours')
                .limit(1)
                .single();
            if (error) {
                console.warn('Error fetching email delay settings, using defaults:', error);
                return { delayEnabled: true, delayHours: 2.0 };
            }
            return {
                delayEnabled: data.email_delay_enabled ?? true,
                delayHours: data.email_delay_hours ?? 2.0
            };
        }
        catch (error) {
            console.warn('Error fetching email delay settings, using defaults:', error);
            return { delayEnabled: true, delayHours: 2.0 };
        }
    }
    /**
     * Start the email scheduler with specified interval
     * @param intervalMinutes - How often to check for due emails (default: 5 minutes)
     */
    start(intervalMinutes = 5) {
        if (this.isRunning) {
            console.log('Email scheduler is already running');
            return;
        }
        console.log(`Starting email scheduler with ${intervalMinutes} minute interval`);
        this.isRunning = true;
        // Run immediately on start
        this.processEmailQueue();
        // Set up recurring interval
        this.intervalId = setInterval(() => {
            this.processEmailQueue();
        }, intervalMinutes * 60 * 1000);
    }
    /**
     * Stop the email scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.log('Email scheduler is not running');
            return;
        }
        console.log('Stopping email scheduler');
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    /**
     * Process the email queue - check for due emails and send them
     */
    async processEmailQueue() {
        const stats = {
            processed: 0,
            sent: 0,
            failed: 0,
            skipped: 0
        };
        try {
            console.log('Processing email queue...');
            // Get all pending emails that are due to be sent
            const { data: emailQueue, error } = await supabase_1.supabase
                .from('email_queue')
                .select(`
          *,
          job_applications (
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            street,
            postal_code,
            city,
            country,
            nationality,
            motivation_text,
            experience_text
          )
        `)
                .eq('status', 'pending')
                .lte('scheduled_at', new Date().toISOString())
                .order('scheduled_at', { ascending: true });
            if (error) {
                console.error('Error fetching email queue:', error);
                return stats;
            }
            if (!emailQueue || emailQueue.length === 0) {
                console.log('No emails due for sending');
                return stats;
            }
            console.log(`Found ${emailQueue.length} emails due for sending`);
            // Process each email
            for (const emailItem of emailQueue) {
                stats.processed++;
                try {
                    await this.processEmailItem(emailItem);
                    stats.sent++;
                }
                catch (error) {
                    console.error(`Failed to process email ${emailItem.id}:`, error);
                    stats.failed++;
                    // Update retry count and status
                    await this.handleEmailFailure(emailItem, error);
                }
            }
            console.log(`Email queue processing complete:`, stats);
            return stats;
        }
        catch (error) {
            console.error('Error processing email queue:', error);
            return stats;
        }
    }
    /**
     * Process a single email item
     */
    async processEmailItem(emailItem) {
        console.log(`Processing email ${emailItem.id} for ${emailItem.recipient_email}`);
        // Check if we have application data
        if (!emailItem.job_applications) {
            throw new Error('Missing application data for email');
        }
        const applicationData = emailItem.job_applications;
        // Send the email based on type
        let result;
        switch (emailItem.email_type) {
            case 'application_confirmation':
                result = await (0, resend_service_1.sendApplicationConfirmationEmail)(applicationData);
                break;
            default:
                throw new Error(`Unknown email type: ${emailItem.email_type}`);
        }
        if (!result.success) {
            throw new Error(result.error || 'Email sending failed');
        }
        // Update email queue status to sent
        const { error: updateError } = await supabase_1.supabase
            .from('email_queue')
            .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', emailItem.id);
        if (updateError) {
            console.error('Error updating email queue status:', updateError);
            // Don't throw here as the email was sent successfully
        }
        // Update job application email status
        const { error: appUpdateError } = await supabase_1.supabase
            .from('job_applications')
            .update({
            email_status: 'sent',
            email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', emailItem.application_id);
        if (appUpdateError) {
            console.error('Error updating application email status:', appUpdateError);
        }
        console.log(`Email ${emailItem.id} sent successfully with message ID: ${result.messageId}`);
    }
    /**
     * Handle email sending failure
     */
    async handleEmailFailure(emailItem, error) {
        const newRetryCount = emailItem.retry_count + 1;
        const maxRetries = emailItem.max_retries || 3;
        let status = 'pending';
        let nextScheduledAt = emailItem.scheduled_at;
        // If we've exceeded max retries, mark as failed
        if (newRetryCount >= maxRetries) {
            status = 'failed';
            console.log(`Email ${emailItem.id} failed permanently after ${newRetryCount} attempts`);
        }
        else {
            // Schedule retry with exponential backoff (5 minutes * 2^retry_count)
            const retryDelayMinutes = 5 * Math.pow(2, newRetryCount - 1);
            const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
            nextScheduledAt = nextRetry.toISOString();
            console.log(`Email ${emailItem.id} will be retried in ${retryDelayMinutes} minutes (attempt ${newRetryCount}/${maxRetries})`);
        }
        // Update email queue with retry info
        const { error: updateError } = await supabase_1.supabase
            .from('email_queue')
            .update({
            status,
            retry_count: newRetryCount,
            scheduled_at: nextScheduledAt,
            error_message: error?.message || 'Unknown error',
            updated_at: new Date().toISOString()
        })
            .eq('id', emailItem.id);
        if (updateError) {
            console.error('Error updating email queue retry info:', updateError);
        }
        // Update job application status if permanently failed
        if (status === 'failed') {
            const { error: appUpdateError } = await supabase_1.supabase
                .from('job_applications')
                .update({
                email_status: 'failed',
                updated_at: new Date().toISOString()
            })
                .eq('id', emailItem.application_id);
            if (appUpdateError) {
                console.error('Error updating application email status to failed:', appUpdateError);
            }
        }
    }
    /**
     * Schedule an email to be sent later
     */
    static async scheduleEmail(applicationId, emailType, recipientEmail, scheduledAt, maxRetries = 3) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('email_queue')
                .insert({
                application_id: applicationId,
                email_type: emailType,
                recipient_email: recipientEmail,
                scheduled_at: scheduledAt.toISOString(),
                max_retries: maxRetries,
                status: 'pending'
            })
                .select('id')
                .single();
            if (error) {
                console.error('Error scheduling email:', error);
                return { success: false, error: error.message };
            }
            console.log(`Email scheduled successfully: ${data.id} for ${recipientEmail} at ${scheduledAt.toISOString()}`);
            return { success: true, queueId: data.id };
        }
        catch (error) {
            console.error('Error scheduling email:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Schedule or send application confirmation email based on settings
     */
    static async handleApplicationEmail(applicationId, applicationData) {
        try {
            // Get current email delay settings
            const settings = await this.getEmailDelaySettings();
            if (!settings.delayEnabled) {
                // Send email immediately
                console.log('Email delay disabled - sending email immediately');
                const result = await (0, resend_service_1.sendApplicationConfirmationEmail)(applicationData);
                if (result.success) {
                    // Update application status to sent
                    await supabase_1.supabase
                        .from('job_applications')
                        .update({
                        email_status: 'sent',
                        email_sent_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', applicationId);
                }
                return {
                    success: result.success,
                    error: result.error,
                    messageId: result.messageId,
                    immediate: true
                };
            }
            else {
                // Schedule email with delay
                console.log(`Email delay enabled - scheduling email for ${settings.delayHours} hours from now`);
                const scheduledAt = new Date(Date.now() + settings.delayHours * 60 * 60 * 1000);
                const result = await this.scheduleEmail(applicationId, 'application_confirmation', applicationData.email, scheduledAt);
                if (result.success) {
                    // Update application with scheduled time
                    await supabase_1.supabase
                        .from('job_applications')
                        .update({
                        email_status: 'pending',
                        email_scheduled_at: scheduledAt.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', applicationId);
                }
                return {
                    success: result.success,
                    error: result.error,
                    queueId: result.queueId,
                    immediate: false
                };
            }
        }
        catch (error) {
            console.error('Error handling application email:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get email queue statistics
     */
    static async getQueueStats() {
        try {
            const { data, error } = await supabase_1.supabase
                .from('email_queue')
                .select('status');
            if (error) {
                console.error('Error getting queue stats:', error);
                return { pending: 0, sent: 0, failed: 0, total: 0 };
            }
            const stats = {
                pending: 0,
                sent: 0,
                failed: 0,
                total: data.length
            };
            data.forEach(item => {
                switch (item.status) {
                    case 'pending':
                        stats.pending++;
                        break;
                    case 'sent':
                        stats.sent++;
                        break;
                    case 'failed':
                        stats.failed++;
                        break;
                }
            });
            return stats;
        }
        catch (error) {
            console.error('Error getting queue stats:', error);
            return { pending: 0, sent: 0, failed: 0, total: 0 };
        }
    }
}
exports.EmailSchedulerService = EmailSchedulerService;
// Create and export a singleton instance
exports.emailScheduler = new EmailSchedulerService();
