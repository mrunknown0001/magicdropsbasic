"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKycSettingsMigration = runKycSettingsMigration;
const supabase_1 = require("../lib/supabase");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runKycSettingsMigration() {
    try {
        console.log('Running KYC settings migration...');
        // Read the SQL migration file
        const sqlFilePath = path_1.default.join(__dirname, 'add-kyc-settings-columns.sql');
        const sqlContent = fs_1.default.readFileSync(sqlFilePath, 'utf8');
        // Execute the migration using Supabase's execute_sql function
        const { data, error } = await supabase_1.supabase.rpc('execute_sql', {
            query: sqlContent
        });
        if (error) {
            console.error('Migration failed:', error);
            throw error;
        }
        console.log('Migration completed successfully!');
        console.log('Result:', data);
        // Verify the columns were added by checking the settings table
        const { data: settingsData, error: settingsError } = await supabase_1.supabase
            .from('settings')
            .select('kyc_required_for_tasks, kyc_requirement_message')
            .limit(1);
        if (settingsError) {
            console.warn('Could not verify migration - this is normal if no settings record exists yet');
        }
        else {
            console.log('Migration verified - columns are accessible!');
        }
    }
    catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}
// Run the migration if this script is executed directly
if (require.main === module) {
    runKycSettingsMigration()
        .then(() => {
        console.log('Migration script completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}
