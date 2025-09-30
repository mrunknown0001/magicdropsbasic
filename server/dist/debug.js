"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("./lib/supabase");
async function testDatabaseInsert() {
    console.log('Starting database insertion test...');
    // Test phone number record
    const testPhoneRecord = {
        phone_number: `+15551234${Math.floor(Math.random() * 1000)}`, // Random suffix to avoid duplicates
        rent_id: `test_${Date.now()}`,
        service: 'telegram',
        country: '0',
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // 4 hours from now
        status: 'active'
    };
    console.log('Attempting to insert test record:', testPhoneRecord);
    try {
        // First check RLS policies
        console.log('Checking row-level security policies...');
        const { data: policies, error: policyError } = await supabase_1.supabase.rpc('get_policies_for_table', {
            table_name: 'phone_numbers'
        });
        if (policyError) {
            console.error('Error fetching policies:', policyError);
        }
        else {
            console.log('Policies for phone_numbers table:', policies);
        }
        // Try direct insert
        console.log('Attempting direct insert...');
        const { data: insertedData, error: insertError } = await supabase_1.supabase
            .from('phone_numbers')
            .insert(testPhoneRecord)
            .select()
            .single();
        if (insertError) {
            console.error('Insert error:', insertError);
            // Check for permissions issues
            if (insertError.code === '42501') {
                console.error('This is a permissions issue. The service role cannot insert records.');
            }
            // Check for unique constraint violations
            if (insertError.code === '23505') {
                console.error('This is a unique constraint violation. The phone number or rent ID already exists.');
            }
        }
        else {
            console.log('Successfully inserted record:', insertedData);
        }
        // Try to read the phone_numbers table
        console.log('Checking existing records in phone_numbers table...');
        const { data: phoneNumbers, error: selectError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .limit(10);
        if (selectError) {
            console.error('Error reading phone_numbers table:', selectError);
        }
        else {
            console.log(`Found ${phoneNumbers.length} existing phone numbers:`, phoneNumbers);
        }
    }
    catch (error) {
        console.error('Unexpected error during test:', error);
    }
}
// Run the test
testDatabaseInsert()
    .then(() => {
    console.log('Test completed');
    process.exit(0);
})
    .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
