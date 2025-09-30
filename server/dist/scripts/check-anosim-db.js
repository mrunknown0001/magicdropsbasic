"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
async function checkAnosimDatabase() {
    console.log('🔍 Checking Anosim phone numbers in database...');
    try {
        // Get Anosim phone numbers
        const { data: phoneNumbers, error } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('provider', 'anosim')
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) {
            console.error('❌ Database error:', error);
            return;
        }
        console.log(`📱 Found ${phoneNumbers?.length || 0} Anosim phone numbers in database:`);
        if (phoneNumbers && phoneNumbers.length > 0) {
            phoneNumbers.forEach((phone, index) => {
                console.log(`\n📞 Phone ${index + 1}:`);
                console.log(`  - Number: ${phone.phone_number}`);
                console.log(`  - Status: ${phone.status}`);
                console.log(`  - Rent ID: ${phone.rent_id}`);
                console.log(`  - Order ID: ${phone.order_id}`);
                console.log(`  - Order Booking ID: ${phone.order_booking_id}`);
                console.log(`  - Provider ID: ${phone.provider_id}`);
                console.log(`  - End Date: ${phone.end_date}`);
                console.log(`  - Created: ${phone.created_at}`);
            });
            // Check messages for these numbers
            console.log('\n💬 Checking messages for Anosim numbers...');
            for (const phone of phoneNumbers) {
                const { data: messages, error: msgError } = await supabase_1.supabase
                    .from('phone_messages')
                    .select('*')
                    .eq('phone_number_id', phone.id)
                    .order('received_at', { ascending: false })
                    .limit(5);
                if (msgError) {
                    console.error(`❌ Error getting messages for ${phone.phone_number}:`, msgError);
                }
                else {
                    console.log(`📨 ${phone.phone_number} has ${messages?.length || 0} messages in database`);
                    if (messages && messages.length > 0) {
                        messages.forEach((msg, idx) => {
                            console.log(`  ${idx + 1}. From: ${msg.sender} - "${msg.message.substring(0, 50)}..." (${msg.received_at})`);
                        });
                    }
                }
            }
        }
        else {
            console.log('❌ No Anosim phone numbers found in database');
        }
    }
    catch (error) {
        console.error('❌ Script error:', error.message);
    }
}
checkAnosimDatabase()
    .then(() => {
    console.log('\n✅ Database check completed');
    process.exit(0);
})
    .catch(error => {
    console.error('❌ Database check failed:', error);
    process.exit(1);
});
