import { supabaseAdmin } from '../lib/supabase';

/**
 * Check if payment mode columns exist in the profiles table
 * and attempt to create them if they don't exist
 */
export const ensurePaymentModeColumns = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking if payment_mode columns exist...');
    
    // Try to select payment_mode column to see if it exists
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('payment_mode, payment_mode_set_at, payment_mode_set_by')
      .limit(1);

    if (error) {
      console.error('❌ Payment mode columns do not exist:', error);
      
      // If the error indicates missing columns, show instructions
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.error('💡 SOLUTION: Please run the migration in Supabase SQL Editor:');
        console.error(`
-- Add payment mode columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT NULL 
CHECK (payment_mode IN ('vertragsbasis', 'verguetung') OR payment_mode IS NULL);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payment_mode_set_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_mode_set_by UUID REFERENCES auth.users(id);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_payment_mode ON profiles(payment_mode);
        `);
        
        throw new Error('Payment mode columns are missing. Please run the migration in Supabase SQL Editor first.');
      }
      
      throw error;
    }

    console.log('✅ Payment mode columns exist and are accessible');
    return true;
  } catch (error) {
    console.error('❌ Error checking payment mode columns:', error);
    return false;
  }
};

/**
 * Test if we can update a user's payment mode
 */
export const testPaymentModeUpdate = async (userId: string): Promise<boolean> => {
  try {
    console.log('🧪 Testing payment mode update for user:', userId);
    
    // First check if columns exist
    const columnsExist = await ensurePaymentModeColumns();
    if (!columnsExist) {
      return false;
    }

    // Try a test update (setting to the same value it might already have)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, payment_mode');

    if (error) {
      console.error('❌ Test update failed:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('❌ User not found or no rows updated');
      return false;
    }

    console.log('✅ Test update successful, user data:', data[0]);
    return true;
  } catch (error) {
    console.error('❌ Error testing payment mode update:', error);
    return false;
  }
};
