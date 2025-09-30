-- Simple time_entries table creation
-- Copy and paste this into Supabase SQL Editor

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  approved_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON time_entries(entry_date);

-- Prevent duplicate time entries for same task
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_task_assignment_unique 
ON time_entries(task_assignment_id);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own time entries
CREATE POLICY IF NOT EXISTS "Users can view own time entries" ON time_entries
FOR SELECT USING (employee_id = auth.uid());

-- Allow admins to view and manage all time entries
CREATE POLICY IF NOT EXISTS "Admins can manage time entries" ON time_entries
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
); 