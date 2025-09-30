// Email API service for frontend
export interface ApplicationEmailData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  nationality: string;
  motivation_text: string;
  experience_text: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailApiConfig {
  baseUrl: string;
  apiKey: string;
}

// Get API configuration from environment variables
const getApiConfig = (): EmailApiConfig => {
  const baseUrl = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001/api/email';
  const apiKey = 'magic-drops-api-key-2025'; // Same as server API key
  
  return { baseUrl, apiKey };
};

/**
 * Send application confirmation email
 */
export async function sendApplicationConfirmationEmail(
  applicationData: ApplicationEmailData
): Promise<EmailResponse> {
  try {
    const config = getApiConfig();
    
    console.log('Sending email API request to:', `${config.baseUrl}/application-confirmation`);
    
    const response = await fetch(`${config.baseUrl}/application-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify({
        applicationData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result: EmailResponse = await response.json();
    console.log('Email API response:', result);
    
    return result;

  } catch (error: any) {
    console.error('Error sending application confirmation email:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to send confirmation email'
    };
  }
}

/**
 * Test email service
 */
export async function testEmailService(): Promise<EmailResponse> {
  try {
    const config = getApiConfig();
    
    console.log('Testing email service...');
    
    const response = await fetch(`${config.baseUrl}/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Email test response:', result);
    
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error
    };

  } catch (error: any) {
    console.error('Error testing email service:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to test email service'
    };
  }
}

/**
 * Check email service health
 */
export async function checkEmailServiceHealth(): Promise<{
  status: string;
  checks?: any;
  error?: string;
}> {
  try {
    const config = getApiConfig();
    
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('Error checking email service health:', error);
    
    return {
      status: 'error',
      error: error.message || 'Failed to check email service health'
    };
  }
} 