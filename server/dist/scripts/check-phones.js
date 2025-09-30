"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
async function checkPhoneNumbers() {
    console.log('Checking phone_numbers table...');
    try {
        // Check if the table exists
        const { data: tablesData, error: tablesError } = await supabase_1.supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', 'public')
            .eq('tablename', 'phone_numbers');
        if (tablesError) {
            console.error('Error checking if table exists:', tablesError);
        }
        else {
            console.log('Table exists check:', tablesData);
        }
        // Direct query for phone numbers
        const { data: phonesData, error: phonesError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*');
        if (phonesError) {
            console.error('Error querying phone_numbers:', phonesError);
        }
        else {
            console.log(`Found ${phonesData.length} phone numbers:`);
            console.log(JSON.stringify(phonesData, null, 2));
        }
        // Manual SQL query as a fallback
        console.log('Executing fallback SQL query...');
        const { data: sqlData, error: sqlError } = await supabase_1.supabase.rpc('execute_sql', {
            query: 'SELECT * FROM phone_numbers'
        });
        if (sqlError) {
            console.error('SQL query error:', sqlError);
        }
        else {
            console.log('SQL query results:', sqlData);
        }
        // Check policies
        console.log('Checking table policies...');
        const { data: policiesData, error: policiesError } = await supabase_1.supabase.rpc('execute_sql', {
            query: "SELECT * FROM pg_policies WHERE tablename = 'phone_numbers'"
        });
        if (policiesError) {
            console.error('Policy query error:', policiesError);
        }
        else {
            console.log('Policies on phone_numbers table:', policiesData);
        }
    }
    catch (error) {
        console.error('Unexpected error during check:', error);
    }
}
// Run the check
checkPhoneNumbers()
    .then(() => console.log('Check completed'))
    .catch(error => console.error('Check failed:', error))
    .finally(() => process.exit(0));
