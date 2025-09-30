#!/usr/bin/env node
"use strict";
/**
 * Apply Legal Pages Enhancement Migration
 *
 * This script applies the database migration to enhance settings
 * for better legal page integration and GDPR compliance.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function applyMigration() {
    console.log('🚀 Starting Legal Pages Enhancement Migration...');
    try {
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'enhance-settings-for-legal-pages.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Applying database migration...');
        // Execute the migration
        const { error } = await supabase_1.supabase.rpc('exec_sql', {
            sql: migrationSQL
        });
        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
        console.log('✅ Database migration applied successfully!');
        // Verify the new columns exist
        console.log('🔍 Verifying new settings fields...');
        const { data: settings, error: selectError } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    }
}
// Run the migration
applyMigration();
