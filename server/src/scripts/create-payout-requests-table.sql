-- Create payout_requests table for worker payout management
-- This table handles worker requests for balance payouts

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  rejection_reason TEXT NULL,
  payment_method JSONB NULL, -- Store IBAN, PayPal, etc.
  admin_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_worker_id 
ON payout_requests(worker_id);

CREATE INDEX IF NOT EXISTS idx_payout_requests_status 
ON payout_requests(status);

CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at 
ON payout_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_payout_requests_reviewed_by 
ON payout_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_payout_requests_worker_status 
ON payout_requests(worker_id, status);

-- Add comments for documentation
COMMENT ON TABLE payout_requests IS 'Worker requests for balance payouts in Vergütung mode';
COMMENT ON COLUMN payout_requests.worker_id IS 'Worker requesting the payout';
COMMENT ON COLUMN payout_requests.amount IS 'Requested payout amount in EUR';
COMMENT ON COLUMN payout_requests.status IS 'Request status: pending, approved, rejected, or paid';
COMMENT ON COLUMN payout_requests.requested_at IS 'When the payout was requested';
COMMENT ON COLUMN payout_requests.reviewed_by IS 'Admin who reviewed the request';
COMMENT ON COLUMN payout_requests.reviewed_at IS 'When the request was reviewed';
COMMENT ON COLUMN payout_requests.rejection_reason IS 'Reason for rejection (if applicable)';
COMMENT ON COLUMN payout_requests.payment_method IS 'JSON containing payment method details (IBAN, etc.)';
COMMENT ON COLUMN payout_requests.admin_notes IS 'Internal admin notes about the payout';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payout_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_requests_updated_at();

-- Enable RLS
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Now add the foreign key constraint to payment_transactions
ALTER TABLE payment_transactions 
ADD CONSTRAINT fk_payment_transactions_payout_request_id 
FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE SET NULL;
