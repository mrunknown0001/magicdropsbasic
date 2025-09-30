-- Create payment_transactions table for tracking all balance changes
-- This table provides a complete audit trail of all payment-related transactions

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_assignment_id UUID NULL REFERENCES task_assignments(id) ON DELETE SET NULL,
  payout_request_id UUID NULL, -- Will reference payout_requests table (created next)
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('task_payment', 'payout', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount != 0), -- Can be positive (earnings) or negative (payouts)
  description TEXT NOT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_worker_id 
ON payment_transactions(worker_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_task_assignment_id 
ON payment_transactions(task_assignment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_type 
ON payment_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
ON payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_worker_created_at 
ON payment_transactions(worker_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE payment_transactions IS 'Audit trail of all payment transactions for workers';
COMMENT ON COLUMN payment_transactions.worker_id IS 'Worker who received/lost the payment';
COMMENT ON COLUMN payment_transactions.task_assignment_id IS 'Task assignment that generated this payment (for task_payment type)';
COMMENT ON COLUMN payment_transactions.payout_request_id IS 'Payout request that generated this transaction (for payout type)';
COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type: task_payment (earnings), payout (withdrawal), adjustment (manual)';
COMMENT ON COLUMN payment_transactions.amount IS 'Amount in EUR - positive for earnings, negative for payouts';
COMMENT ON COLUMN payment_transactions.description IS 'Human-readable description of the transaction';
COMMENT ON COLUMN payment_transactions.created_by IS 'Admin user who created this transaction (for manual adjustments)';

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
