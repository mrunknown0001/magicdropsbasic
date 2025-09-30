import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Get Supabase URL and key from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://irawjdstgtrkqwxymvfy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyYXdqZHN0Z3Rya3F3eHltdmZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njc0Njk3MywiZXhwIjoyMDYyMzIyOTczfQ.Ej94Gy6BlXP6VsVYGvNR4r2Am9IHhKArgxsyHNrY5w4';

// Validate Supabase credentials are present
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Supabase credentials are not set in environment variables');
} else {
  console.log(`Supabase client configured with URL: ${SUPABASE_URL}`);
}

// Create a Supabase client with the service role key for admin access
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test the connection
export const testSupabaseConnection = async () => {
  try {
    // Just check if we can access the phone_numbers table
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (error: any) {
    console.error('Supabase connection test failed:', error);
    return { success: false, error: error.message };
  }
};

// Run the test on module import
testSupabaseConnection()
  .then(result => {
    if (!result.success) {
      console.error('Failed to connect to Supabase on startup');
    }
  })
  .catch(error => {
    console.error('Unexpected error testing Supabase connection:', error);
  });
