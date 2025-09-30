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

export interface CompanyData {
  websiteName: string;
  companyName: string;
  websiteUrl: string;
  contact: {
    email: string;
    phone: string;
  };
  address: {
    street: string;
    zipCode: string;
    city: string;
  };
  theme: {
    primaryColor: string;
  };
  logoUrl?: string | null;
}

export interface EmailTemplateData {
  application: ApplicationEmailData;
  companyData: CompanyData;
  currentYear: number;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ResendEmailRequest {
  applicationData: ApplicationEmailData;
}

export interface ResendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
} 