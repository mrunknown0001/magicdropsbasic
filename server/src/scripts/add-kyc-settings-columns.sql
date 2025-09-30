-- Add KYC-related columns to settings table
-- This migration adds support for KYC requirement settings

-- Add kyc_required_for_tasks column (defaults to true for security)
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS kyc_required_for_tasks BOOLEAN DEFAULT true;

-- Add kyc_requirement_message column for custom messages
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS kyc_requirement_message TEXT DEFAULT 'KYC-Verifizierung erforderlich für den Zugriff auf Aufgaben.';

-- Update the updated_at timestamp for any existing settings records
UPDATE settings 
SET updated_at = NOW() 
WHERE kyc_required_for_tasks IS NULL;

-- Add a comment to document these columns
COMMENT ON COLUMN settings.kyc_required_for_tasks IS 'Whether KYC verification is required for employees to access tasks';
COMMENT ON COLUMN settings.kyc_requirement_message IS 'Custom message shown when KYC verification is required'; 