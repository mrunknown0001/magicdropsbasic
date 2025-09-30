-- Enhance task_assignments table for per-task payment tracking
-- This migration adds payment-related fields to support Vergütung mode

-- Add custom payment amount (overrides template payment_amount if set)
ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS custom_payment_amount DECIMAL(10,2) NULL
CHECK (custom_payment_amount IS NULL OR custom_payment_amount >= 0);

-- Add payment status tracking
ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'approved', 'paid'));

-- Add payment approval timestamp
ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS payment_approved_at TIMESTAMP WITH TIME ZONE NULL;

-- Add payment approval admin reference
ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS payment_approved_by UUID NULL 
REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN task_assignments.custom_payment_amount IS 'Custom payment amount for this specific task assignment (overrides template amount)';
COMMENT ON COLUMN task_assignments.payment_status IS 'Payment status: pending, approved, or paid';
COMMENT ON COLUMN task_assignments.payment_approved_at IS 'Timestamp when payment was approved by admin';
COMMENT ON COLUMN task_assignments.payment_approved_by IS 'Admin user who approved the payment';

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_task_assignments_payment_status 
ON task_assignments(payment_status);

-- Create index for payment approval queries
CREATE INDEX IF NOT EXISTS idx_task_assignments_payment_approved_by 
ON task_assignments(payment_approved_by);

-- Create index for assignee payment queries
CREATE INDEX IF NOT EXISTS idx_task_assignments_assignee_payment_status 
ON task_assignments(assignee_id, payment_status);
