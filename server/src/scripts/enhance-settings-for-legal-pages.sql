-- Migration: Enhance settings table for better legal page integration
-- Description: Adds new fields for improved legal page customization and GDPR compliance

-- Add new settings fields for enhanced legal page integration
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS data_protection_officer VARCHAR(255),
ADD COLUMN IF NOT EXISTS privacy_contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_legal_form VARCHAR(50) DEFAULT 'GmbH',
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'vertragsbasis',
ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10,2) DEFAULT 15.00;

-- Update existing settings to ensure email delay fields are properly set
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS email_delay_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_delay_hours INTEGER DEFAULT 24;

-- Add comments for documentation
COMMENT ON COLUMN settings.data_protection_officer IS 'Name of the data protection officer for GDPR compliance';
COMMENT ON COLUMN settings.privacy_contact_email IS 'Dedicated email for data protection and privacy inquiries';
COMMENT ON COLUMN settings.company_legal_form IS 'Legal form of the company (GmbH, AG, UG, etc.)';
COMMENT ON COLUMN settings.email_delay_enabled IS 'Whether to enable delayed email sending';
COMMENT ON COLUMN settings.email_delay_hours IS 'Number of hours to delay email sending';
COMMENT ON COLUMN settings.payment_mode IS 'Payment mode: vertragsbasis (contract-based) or verguetung (task-based)';
COMMENT ON COLUMN settings.default_hourly_rate IS 'Default hourly rate for task-based payment mode';
