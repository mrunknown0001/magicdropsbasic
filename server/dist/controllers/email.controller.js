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
exports.rejectApplication = exports.approveApplication = exports.resendApplicationEmail = exports.updateEmailDelaySettings = exports.getEmailDelaySettings = exports.handleApplicationEmail = exports.processEmailQueue = exports.getEmailQueueStats = exports.scheduleEmail = void 0;
exports.sendApplicationConfirmation = sendApplicationConfirmation;
exports.testEmail = testEmail;
exports.emailHealthCheck = emailHealthCheck;
const resend_service_1 = require("../services/resend.service");
const email_scheduler_service_1 = require("../services/email-scheduler.service");
/**
 * Validate application data
 */
function validateApplicationData(data) {
    const requiredFields = [
        'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
        'street', 'postal_code', 'city', 'country', 'nationality',
        'motivation_text'
    ];
    for (const field of requiredFields) {
        if (!data[field] || typeof data[field] !== 'string') {
            return false;
        }
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return false;
    }
    return true;
}
/**
 * Send application confirmation email
 * POST /api/email/application-confirmation
 */
async function sendApplicationConfirmation(req, res, next) {
    try {
        console.log('Received application confirmation request:', req.body);
        const { applicationData } = req.body;
        // Validate request body
        if (!applicationData) {
            res.status(400).json({
                success: false,
                error: 'Missing applicationData in request body'
            });
            return;
        }
        // Validate application data
        if (!validateApplicationData(applicationData)) {
            res.status(400).json({
                success: false,
                error: 'Invalid application data. Please check all required fields.'
            });
            return;
        }
        console.log('Sending confirmation email to:', applicationData.email);
        // Send email
        const result = await (0, resend_service_1.sendApplicationConfirmationEmail)(applicationData);
        if (result.success) {
            console.log('Email sent successfully:', result.messageId);
            res.status(200).json(result);
        }
        else {
            console.error('Email sending failed:', result.error);
            res.status(500).json(result);
        }
    }
    catch (error) {
        console.error('Error in sendApplicationConfirmation:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while sending email'
        });
    }
}
/**
 * Test email service
 * GET /api/email/test
 */
async function testEmail(req, res, next) {
    try {
        console.log('Testing email service...');
        const result = await (0, resend_service_1.testEmailService)();
        if (result.success) {
            console.log('Email test successful');
            res.status(200).json({
                success: true,
                message: 'Email service is working correctly',
                messageId: result.messageId
            });
        }
        else {
            console.error('Email test failed:', result.error);
            res.status(500).json({
                success: false,
                message: 'Email service test failed',
                error: result.error
            });
        }
    }
    catch (error) {
        console.error('Error in testEmail:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during email test',
            error: error.message
        });
    }
}
/**
 * Health check for email service
 * GET /api/email/health
 */
async function emailHealthCheck(req, res, next) {
    try {
        const hasApiKey = !!process.env.RESEND_API_KEY;
        const hasFromEmail = !!process.env.RESEND_FROM_EMAIL;
        const hasSupabaseConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
        const isHealthy = hasApiKey && hasFromEmail && hasSupabaseConfig;
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            checks: {
                resendApiKey: hasApiKey,
                fromEmail: hasFromEmail,
                supabaseConfig: hasSupabaseConfig
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error in emailHealthCheck:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
// DEPRECATED: Email scheduling endpoints - replaced with manual approval system
// These endpoints are kept for backward compatibility but are no longer used
/**
 * @deprecated Use manual approval system instead
 * Schedule an email to be sent after a delay
 */
const scheduleEmail = async (req, res) => {
    res.status(410).json({
        status: 'deprecated',
        message: 'Email scheduling is deprecated. Use manual approval system instead.',
        redirect: '/api/email/approve-application or /api/email/reject-application'
    });
};
exports.scheduleEmail = scheduleEmail;
/**
 * @deprecated Use manual approval system instead
 * Get email queue statistics
 */
const getEmailQueueStats = async (req, res) => {
    res.status(410).json({
        status: 'deprecated',
        message: 'Email queue is deprecated. Use manual approval system instead.'
    });
};
exports.getEmailQueueStats = getEmailQueueStats;
/**
 * @deprecated Use manual approval system instead
 * Manually trigger email queue processing
 */
const processEmailQueue = async (req, res) => {
    res.status(410).json({
        status: 'deprecated',
        message: 'Email queue processing is deprecated. Use manual approval system instead.'
    });
};
exports.processEmailQueue = processEmailQueue;
/**
 * @deprecated Use manual approval system instead
 * Handle application email based on settings (immediate or delayed)
 */
const handleApplicationEmail = async (req, res) => {
    res.status(410).json({
        status: 'deprecated',
        message: 'Automatic email handling is deprecated. Use manual approval system instead.',
        redirect: '/api/email/approve-application or /api/email/reject-application'
    });
};
exports.handleApplicationEmail = handleApplicationEmail;
/**
 * @deprecated Get email delay settings - NO LONGER USED
 * This endpoint is deprecated as of 2025-01-27. The email system now uses manual approval.
 */
const getEmailDelaySettings = async (req, res) => {
    res.status(410).json({
        status: 'deprecated',
        message: 'Email delay settings are no longer used. The system now uses manual approval for emails.',
        migration: {
            reason: 'Replaced by manual approval system',
            newEndpoints: [
                'POST /api/email/approve-application',
                'POST /api/email/reject-application'
            ],
            adminInterface: 'Use the Job Applications admin page to approve/reject applications'
        },
        timestamp: new Date().toISOString()
    });
};
exports.getEmailDelaySettings = getEmailDelaySettings;
/**
 * @deprecated Update email delay settings - NO LONGER USED
 * This endpoint is deprecated as of 2025-01-27. The email system now uses manual approval.
 */
const updateEmailDelaySettings = async (req, res) => {
    res.status(410).json({
        status: 'deprecated',
        message: 'Email delay settings are no longer used. The system now uses manual approval for emails.',
        migration: {
            reason: 'Replaced by manual approval system',
            newEndpoints: [
                'POST /api/email/approve-application',
                'POST /api/email/reject-application'
            ],
            adminInterface: 'Use the Job Applications admin page to approve/reject applications'
        },
        timestamp: new Date().toISOString()
    });
};
exports.updateEmailDelaySettings = updateEmailDelaySettings;
/**
 * Resend application confirmation email
 */
const resendApplicationEmail = async (req, res) => {
    try {
        const { applicationId } = req.body;
        if (!applicationId) {
            return res.status(400).json({
                status: 'error',
                message: 'Application ID is required'
            });
        }
        // Import supabase
        const { supabase } = await Promise.resolve().then(() => __importStar(require('../lib/supabase')));
        // Get application data
        const { data: application, error: fetchError } = await supabase
            .from('job_applications')
            .select('*')
            .eq('id', applicationId)
            .single();
        if (fetchError || !application) {
            return res.status(404).json({
                status: 'error',
                message: 'Application not found'
            });
        }
        // Check current email delay settings
        const settings = await email_scheduler_service_1.EmailSchedulerService.getEmailDelaySettings();
        let result;
        if (!settings.delayEnabled) {
            // Send email immediately
            console.log(`Resending email immediately for application ${applicationId}`);
            result = await (0, resend_service_1.sendApplicationConfirmationEmail)(application);
            if (result.success) {
                // Update application status to sent
                await supabase
                    .from('job_applications')
                    .update({
                    email_status: 'sent',
                    email_sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .eq('id', applicationId);
                // Also clear any pending queue entries for this application
                await supabase
                    .from('email_queue')
                    .update({ status: 'cancelled' })
                    .eq('application_id', applicationId)
                    .eq('status', 'pending');
            }
            res.status(200).json({
                success: result.success,
                immediate: true,
                messageId: result.messageId,
                error: result.error,
                message: result.success ? 'Email resent immediately' : 'Failed to resend email'
            });
        }
        else {
            // Schedule email with delay
            console.log(`Rescheduling email for application ${applicationId} with ${settings.delayHours} hour delay`);
            // Cancel any existing pending emails for this application
            await supabase
                .from('email_queue')
                .update({ status: 'cancelled' })
                .eq('application_id', applicationId)
                .eq('status', 'pending');
            const scheduledAt = new Date(Date.now() + settings.delayHours * 60 * 60 * 1000);
            result = await email_scheduler_service_1.EmailSchedulerService.scheduleEmail(applicationId, 'application_confirmation', application.email, scheduledAt);
            if (result.success) {
                // Update application with new scheduled time
                await supabase
                    .from('job_applications')
                    .update({
                    email_status: 'pending',
                    email_scheduled_at: scheduledAt.toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .eq('id', applicationId);
            }
            res.status(200).json({
                success: result.success,
                immediate: false,
                queueId: result.queueId,
                scheduledAt: scheduledAt.toISOString(),
                error: result.error,
                message: result.success
                    ? `Email rescheduled for ${settings.delayHours} hours from now`
                    : 'Failed to reschedule email'
            });
        }
    }
    catch (error) {
        console.error('Error in resendApplicationEmail:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};
exports.resendApplicationEmail = resendApplicationEmail;
/**
 * Manual approval - send approval email for job application
 * POST /api/email/approve-application
 */
const approveApplication = async (req, res) => {
    try {
        const { applicationId } = req.body;
        if (!applicationId) {
            return res.status(400).json({
                status: 'error',
                message: 'Application ID is required'
            });
        }
        // Import supabase
        const { supabase } = await Promise.resolve().then(() => __importStar(require('../lib/supabase')));
        // Get application data
        const { data: application, error: fetchError } = await supabase
            .from('job_applications')
            .select('*')
            .eq('id', applicationId)
            .single();
        if (fetchError || !application) {
            return res.status(404).json({
                status: 'error',
                message: 'Application not found'
            });
        }
        // Allow sending emails to already processed applications for manual email management
        console.log(`Application status: ${application.status} - proceeding with approval email send`);
        console.log(`Manually approving application ${applicationId} for ${application.email}`);
        // Send approval email
        const emailResult = await (0, resend_service_1.sendApplicationConfirmationEmail)(application);
        if (emailResult.success) {
            // Update application with email info (and status if not already approved)
            const updateData = {
                email_status: 'sent',
                email_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            // Only update status and approved_at if not already approved
            if (application.status !== 'approved') {
                updateData.status = 'approved';
                updateData.approved_at = new Date().toISOString();
            }
            const { error: updateError } = await supabase
                .from('job_applications')
                .update(updateData)
                .eq('id', applicationId);
            if (updateError) {
                console.error('Error updating application status:', updateError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Email sent but failed to update application status',
                    error: updateError.message
                });
            }
            // Cancel any pending scheduled emails for this application
            await supabase
                .from('email_queue')
                .update({ status: 'cancelled' })
                .eq('application_id', applicationId)
                .eq('status', 'pending');
            res.status(200).json({
                success: true,
                messageId: emailResult.messageId,
                message: 'Application approved and confirmation email sent successfully'
            });
        }
        else {
            console.error('Failed to send approval email:', emailResult.error);
            res.status(500).json({
                success: false,
                error: emailResult.error,
                message: 'Failed to send approval email'
            });
        }
    }
    catch (error) {
        console.error('Error in approveApplication:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};
exports.approveApplication = approveApplication;
/**
 * Manual rejection - send rejection email for job application
 * POST /api/email/reject-application
 */
const rejectApplication = async (req, res) => {
    try {
        const { applicationId } = req.body;
        if (!applicationId) {
            return res.status(400).json({
                status: 'error',
                message: 'Application ID is required'
            });
        }
        // Import supabase
        const { supabase } = await Promise.resolve().then(() => __importStar(require('../lib/supabase')));
        // Get application data
        const { data: application, error: fetchError } = await supabase
            .from('job_applications')
            .select('*')
            .eq('id', applicationId)
            .single();
        if (fetchError || !application) {
            return res.status(404).json({
                status: 'error',
                message: 'Application not found'
            });
        }
        // Allow sending emails to already processed applications for manual email management
        console.log(`Application status: ${application.status} - proceeding with rejection email send`);
        console.log(`Manually rejecting application ${applicationId} for ${application.email}`);
        // Send rejection email
        const emailResult = await (0, resend_service_1.sendApplicationRejectionEmail)(application);
        if (emailResult.success) {
            // Update application with email info (and status if not already rejected)
            const updateData = {
                email_status: 'sent',
                email_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            // Only update status and rejected_at if not already rejected
            if (application.status !== 'rejected') {
                updateData.status = 'rejected';
                updateData.rejected_at = new Date().toISOString();
            }
            const { error: updateError } = await supabase
                .from('job_applications')
                .update(updateData)
                .eq('id', applicationId);
            if (updateError) {
                console.error('Error updating application status:', updateError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Email sent but failed to update application status',
                    error: updateError.message
                });
            }
            // Cancel any pending scheduled emails for this application
            await supabase
                .from('email_queue')
                .update({ status: 'cancelled' })
                .eq('application_id', applicationId)
                .eq('status', 'pending');
            res.status(200).json({
                success: true,
                messageId: emailResult.messageId,
                message: 'Application rejected and notification email sent successfully'
            });
        }
        else {
            console.error('Failed to send rejection email:', emailResult.error);
            res.status(500).json({
                success: false,
                error: emailResult.error,
                message: 'Failed to send rejection email'
            });
        }
    }
    catch (error) {
        console.error('Error in rejectApplication:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};
exports.rejectApplication = rejectApplication;
