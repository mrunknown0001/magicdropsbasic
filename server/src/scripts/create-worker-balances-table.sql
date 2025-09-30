-- Create worker_balances table for Vergütung mode
-- This table tracks each worker's current balance, total earned, and total paid out

CREATE TABLE IF NOT EXISTS worker_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_balance DECIMAL(10,2) DEFAULT 0.00 CHECK (current_balance >= 0),
  total_earned DECIMAL(10,2) DEFAULT 0.00 CHECK (total_earned >= 0),
  total_paid_out DECIMAL(10,2) DEFAULT 0.00 CHECK (total_paid_out >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one balance record per worker
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_balances_worker_id_unique 
ON worker_balances(worker_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_balances_current_balance 
ON worker_balances(current_balance);

CREATE INDEX IF NOT EXISTS idx_worker_balances_updated_at 
ON worker_balances(updated_at);

-- Add comments for documentation
COMMENT ON TABLE worker_balances IS 'Tracks worker balances for task-based payment mode (Vergütung)';
COMMENT ON COLUMN worker_balances.worker_id IS 'Reference to the worker (profiles table)';
COMMENT ON COLUMN worker_balances.current_balance IS 'Current available balance for payout';
COMMENT ON COLUMN worker_balances.total_earned IS 'Total amount earned from completed tasks';
COMMENT ON COLUMN worker_balances.total_paid_out IS 'Total amount paid out to worker';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_worker_balances_updated_at
  BEFORE UPDATE ON worker_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_balances_updated_at();

-- Enable RLS
ALTER TABLE worker_balances ENABLE ROW LEVEL SECURITY;
