#!/usr/bin/env node

/**
 * Apply Legal Pages Enhancement Migration
 * 
 * This script applies the database migration to enhance settings
 * for better legal page integration and GDPR compliance.
 */

import { supabase } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🚀 Starting Legal Pages Enhancement Migration...');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'enhance-settings-for-legal-pages.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying database migration...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Database migration applied successfully!');
    
    // Verify the new columns exist
    console.log('🔍 Verifying new settings fields...');
    
    const { data: settings, error: selectError } = await supabase
      .from('settings')
      .select('data_protection_officer, privacy_contact_email, company_legal_form, email_delay_enabled, email_delay_hours')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Verification failed:', selectError);
      process.exit(1);
    }
    
    console.log('✅ New settings fields verified successfully!');
    console.log('📊 Available fields:', Object.keys(settings?.[0] || {}));
    
    console.log('\n🎉 Legal Pages Enhancement Migration completed successfully!');
    console.log('\n📋 What was added:');
    console.log('   • data_protection_officer - For GDPR compliance');
    console.log('   • privacy_contact_email - Separate privacy contact');
    console.log('   • company_legal_form - Legal form (GmbH, AG, etc.)');
    console.log('   • email_delay_enabled - Email delay feature toggle');
    console.log('   • email_delay_hours - Email delay duration');
    console.log('\n🔧 Next steps:');
    console.log('   1. Update your admin settings with the new fields');
    console.log('   2. Configure legal page content as needed');
    console.log('   3. Test the legal pages to ensure proper rendering');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
