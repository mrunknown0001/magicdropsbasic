import { Request, Response, NextFunction } from 'express';
import { sendApplicationConfirmationEmail, sendApplicationRejectionEmail, testEmailService } from '../services/resend.service';
import { ApplicationEmailData, ResendEmailRequest } from '../types/email.types';
import { EmailSchedulerService } from '../services/email-scheduler.service';

/**
 * Validate application data
 */
function validateApplicationData(data: any): data is ApplicationEmailData {
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
export async function sendApplicationConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('Received application confirmation request:', req.body);

    const { applicationData }: ResendEmailRequest = req.body;

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
    const result = await sendApplicationConfirmationEmail(applicationData);

    if (result.success) {
      console.log('Email sent successfully:', result.messageId);
      res.status(200).json(result);
    } else {
      console.error('Email sending failed:', result.error);
      res.status(500).json(result);
    }

  } catch (error: any) {
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
export async function testEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('Testing email service...');

    const result = await testEmailService();

    if (result.success) {
      console.log('Email test successful');
      res.status(200).json({
        success: true,
        message: 'Email service is working correctly',
        messageId: result.messageId
      });
    } else {
      console.error('Email test failed:', result.error);
      res.status(500).json({
        success: false,
        message: 'Email service test failed',
        error: result.error
      });
    }

  } catch (error: any) {
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
export async function emailHealthCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  } catch (error: any) {
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
export const scheduleEmail = async (req: Request, res: Response) => {
  res.status(410).json({
    status: 'deprecated',
    message: 'Email scheduling is deprecated. Use manual approval system instead.',
    redirect: '/api/email/approve-application or /api/email/reject-application'
  });
};

/**
 * @deprecated Use manual approval system instead
 * Get email queue statistics
 */
export const getEmailQueueStats = async (req: Request, res: Response) => {
  res.status(410).json({
    status: 'deprecated',
    message: 'Email queue is deprecated. Use manual approval system instead.'
  });
};

/**
 * @deprecated Use manual approval system instead
 * Manually trigger email queue processing
 */
export const processEmailQueue = async (req: Request, res: Response) => {
  res.status(410).json({
    status: 'deprecated',
    message: 'Email queue processing is deprecated. Use manual approval system instead.'
  });
};

/**
 * @deprecated Use manual approval system instead
 * Handle application email based on settings (immediate or delayed)
 */
export const handleApplicationEmail = async (req: Request, res: Response) => {
  res.status(410).json({
    status: 'deprecated',
    message: 'Automatic email handling is deprecated. Use manual approval system instead.',
    redirect: '/api/email/approve-application or /api/email/reject-application'
  });
};

/**
 * @deprecated Get email delay settings - NO LONGER USED
 * This endpoint is deprecated as of 2025-01-27. The email system now uses manual approval.
 */
export const getEmailDelaySettings = async (req: Request, res: Response) => {
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

/**
 * @deprecated Update email delay settings - NO LONGER USED
 * This endpoint is deprecated as of 2025-01-27. The email system now uses manual approval.
 */
export const updateEmailDelaySettings = async (req: Request, res: Response) => {
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

/**
 * Resend application confirmation email
 */
export const resendApplicationEmail = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Application ID is required'
      });
    }

    // Import supabase
    const { supabase } = await import('../lib/supabase');

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
    const settings = await EmailSchedulerService.getEmailDelaySettings();

    let result;
    if (!settings.delayEnabled) {
      // Send email immediately
      console.log(`Resending email immediately for application ${applicationId}`);
      result = await sendApplicationConfirmationEmail(application);
      
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
    } else {
      // Schedule email with delay
      console.log(`Rescheduling email for application ${applicationId} with ${settings.delayHours} hour delay`);
      
      // Cancel any existing pending emails for this application
      await supabase
        .from('email_queue')
        .update({ status: 'cancelled' })
        .eq('application_id', applicationId)
        .eq('status', 'pending');

      const scheduledAt = new Date(Date.now() + settings.delayHours * 60 * 60 * 1000);
      result = await EmailSchedulerService.scheduleEmail(
        applicationId,
        'application_confirmation',
        application.email,
        scheduledAt
      );

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
  } catch (error: any) {
    console.error('Error in resendApplicationEmail:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Manual approval - send approval email for job application
 * POST /api/email/approve-application
 */
export const approveApplication = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Application ID is required'
      });
    }

    // Import supabase
    const { supabase } = await import('../lib/supabase');

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
    const emailResult = await sendApplicationConfirmationEmail(application);

    if (emailResult.success) {
      // Update application with email info (and status if not already approved)
      const updateData: any = {
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
    } else {
      console.error('Failed to send approval email:', emailResult.error);
      res.status(500).json({
        success: false,
        error: emailResult.error,
        message: 'Failed to send approval email'
      });
    }
  } catch (error: any) {
    console.error('Error in approveApplication:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Manual rejection - send rejection email for job application
 * POST /api/email/reject-application
 */
export const rejectApplication = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Application ID is required'
      });
    }

    // Import supabase
    const { supabase } = await import('../lib/supabase');

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
    const emailResult = await sendApplicationRejectionEmail(application);

    if (emailResult.success) {
      // Update application with email info (and status if not already rejected)
      const updateData: any = {
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
    } else {
      console.error('Failed to send rejection email:', emailResult.error);
      res.status(500).json({
        success: false,
        error: emailResult.error,
        message: 'Failed to send rejection email'
      });
    }
  } catch (error: any) {
    console.error('Error in rejectApplication:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
}; 