import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { createClient } from '@supabase/supabase-js';
import { 
  ApplicationEmailData, 
  EmailTemplateData, 
  EmailResponse, 
  CompanyData,
  ResendEmailOptions 
} from '../types/email.types';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Template cache to avoid reading files repeatedly
const templateCache = new Map<string, Handlebars.TemplateDelegate>();

// Clear template cache when settings change
export function clearTemplateCache() {
  templateCache.clear();
  console.log('Template cache cleared');
}

/**
 * Fetch company settings from Supabase
 */
async function getCompanySettings(): Promise<CompanyData> {
  try {
    console.log('Fetching company settings from database...');
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      throw new Error('Failed to fetch company settings');
    }

    if (!data) {
      console.warn('No settings found in database, using defaults');
      throw new Error('No settings found');
    }

    console.log('Settings fetched successfully:', {
      company_name: data.company_name,
      website_name: data.website_name,
      contact_email: data.contact_email,
      logo_url: data.logo_url
    });
    
    return {
      websiteName: data.website_name || 'Padeno',
      companyName: data.company_name || 'Padeno GmbH',
      websiteUrl: data.website_url || 'https://example.com',
      contact: {
        email: data.contact_email || 'info@magicdrops.com',
        phone: data.contact_phone || '+49 123 456789'
      },
      address: {
        street: data.company_address || 'Musterstraße 123',
        zipCode: data.postal_code || '12345',
        city: data.city || 'Musterstadt'
      },
      theme: {
        primaryColor: data.primary_color || '#ee1d3c'
      },
      logoUrl: data.logo_url || null
    };
  } catch (error) {
    console.error('Error in getCompanySettings:', error);
    // Return default values if settings fetch fails
    console.log('Using default company settings');
    return {
      websiteName: 'Padeno',
      companyName: 'Padeno GmbH',
      websiteUrl: 'https://example.com',
      contact: {
        email: 'info@magicdrops.com',
        phone: '+49 123 456789'
      },
      address: {
        street: 'Musterstraße 123',
        zipCode: '12345',
        city: 'Musterstadt'
      },
      theme: {
        primaryColor: '#ee1d3c'
      },
      logoUrl: null
    };
  }
}

/**
 * Load and compile email template
 */
async function loadTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
  // In development, always reload templates to pick up changes
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Check if template is already cached (skip cache in development)
  if (!isDevelopment && templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  try {
    // Determine the template path - use absolute path from project root
    // Find the project root by going up from current directory until we find package.json
    let currentDir = __dirname;
    let projectRoot = '';
    
    // Go up directories until we find the server's package.json
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        projectRoot = currentDir;
        break;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // If we're in the server directory, the templates are in src/templates
    const templatePath = path.join(projectRoot, 'src', 'templates', `${templateName}.html`);
    
    console.log(`Loading template from: ${templatePath}`);
    console.log(`Template exists: ${fs.existsSync(templatePath)}`);
    
    // Read the template file
    let templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Get company settings for branding color
    const companyData = await getCompanySettings();
    
    // Replace the hardcoded color with branding color
    templateContent = templateContent.replace(/#c1121f/g, companyData.theme.primaryColor);
    
    // Compile the template
    const template = Handlebars.compile(templateContent);
    
    // Cache the template
    templateCache.set(templateName, template);
    
    return template;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Failed to load email template: ${templateName}`);
  }
}

/**
 * Send application confirmation email
 */
export async function sendApplicationConfirmationEmail(
  applicationData: ApplicationEmailData
): Promise<EmailResponse> {
  try {
    console.log('Starting email send process for:', applicationData.email);

    // Get company settings
    const companyData = await getCompanySettings();
    
    // Prepare template data
    const templateData: EmailTemplateData = {
      application: applicationData,
      companyData,
      currentYear: new Date().getFullYear()
    };

    // Load and compile template
    const template = await loadTemplate('application_submitted');
    const htmlContent = template(templateData);

    // Prepare email options
    const emailOptions: ResendEmailOptions = {
      from: `${process.env.RESEND_FROM_NAME || 'Padeno'} <${process.env.RESEND_FROM_EMAIL}>`,
      to: applicationData.email,
      subject: `Bewerbung erfolgreich - Willkommen im Team! - ${companyData.websiteName}`,
      html: htmlContent
    };

    console.log('Sending email with options:', {
      from: emailOptions.from,
      to: emailOptions.to,
      subject: emailOptions.subject
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend API error:', error);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`
      };
    }

    console.log('Email sent successfully:', data);

    return {
      success: true,
      messageId: data?.id
    };

  } catch (error: any) {
    console.error('Error sending application confirmation email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Send application rejection email
 */
export async function sendApplicationRejectionEmail(
  applicationData: ApplicationEmailData
): Promise<EmailResponse> {
  try {
    console.log('Starting rejection email send process for:', applicationData.email);

    // Get company settings
    const companyData = await getCompanySettings();
    
    // Prepare template data
    const templateData: EmailTemplateData = {
      application: applicationData,
      companyData,
      currentYear: new Date().getFullYear()
    };

    // Load and compile template
    const template = await loadTemplate('application_rejected');
    const htmlContent = template(templateData);

    // Prepare email options
    const emailOptions: ResendEmailOptions = {
      from: `${process.env.RESEND_FROM_NAME || 'Padeno'} <${process.env.RESEND_FROM_EMAIL}>`,
      to: applicationData.email,
      subject: `Bewerbung - Entscheidung - ${companyData.websiteName}`,
      html: htmlContent
    };

    console.log('Sending rejection email with options:', {
      from: emailOptions.from,
      to: emailOptions.to,
      subject: emailOptions.subject
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend API error:', error);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`
      };
    }

    console.log('Rejection email sent successfully:', data);

    return {
      success: true,
      messageId: data?.id
    };

  } catch (error: any) {
    console.error('Error sending application rejection email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Test email service configuration
 */
export async function testEmailService(): Promise<EmailResponse> {
  try {
    // Test with dummy data
    const testData: ApplicationEmailData = {
      first_name: 'Test',
      last_name: 'User',
      email: 'delivered@resend.dev',
      phone: '+49 123 456789',
      date_of_birth: '1990-01-01',
      street: 'Teststraße 123',
      postal_code: '12345',
      city: 'Teststadt',
      country: 'Deutschland',
      nationality: 'Deutsch',
      motivation_text: 'Test motivation',
      experience_text: 'Test experience'
    };

    return await sendApplicationConfirmationEmail(testData);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Test failed'
    };
  }
} 