"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const anosim_service_1 = require("../services/anosim.service");
const supabase_1 = require("../lib/supabase");
/**
 * Comprehensive Anosim diagnostic script
 * This will help identify why Anosim messages aren't showing up
 */
async function runAnosimDiagnostic() {
    console.log('🔬 ANOSIM DIAGNOSTIC TOOL');
    console.log('==========================\n');
    try {
        // Step 1: Check API key and balance
        console.log('📋 Step 1: API Key & Balance Check');
        console.log('-----------------------------------');
        const keyTest = await anosim_service_1.anosimService.testApiKey();
        console.log('✓ API Key Valid:', keyTest.valid);
        if (keyTest.valid && keyTest.balance) {
            console.log('✓ Account Balance:', `$${keyTest.balance.accountBalanceInUSD}`);
        }
        else {
            console.log('❌ API Key Issue:', keyTest.error);
            return;
        }
        // Step 2: Check current order bookings
        console.log('\n📋 Step 2: Current Order Bookings');
        console.log('----------------------------------');
        try {
            const orderBookings = await anosim_service_1.anosimService.getCurrentOrderBookings();
            console.log('✓ Active Bookings Found:', orderBookings.length);
            if (orderBookings.length > 0) {
                orderBookings.forEach((booking, index) => {
                    console.log(`\n📞 Booking ${index + 1}:`);
                    console.log(`  - ID: ${booking.id}`);
                    console.log(`  - Phone: ${booking.simCard?.phoneNumber || 'N/A'}`);
                    console.log(`  - State: ${booking.state}`);
                    console.log(`  - Product: ${booking.productName}`);
                    console.log(`  - End Time: ${booking.endTime}`);
                    console.log(`  - Auto Renewal: ${booking.autoRenewal}`);
                });
            }
            else {
                console.log('ℹ️ No active order bookings found in Anosim account');
                console.log('💡 This means either:');
                console.log('   - No numbers are currently rented');
                console.log('   - Numbers have expired');
                console.log('   - Numbers were cancelled');
            }
        }
        catch (bookingError) {
            if (bookingError.message.includes('No OrderBooking found')) {
                console.log('ℹ️ No active order bookings (this is normal if no numbers are rented)');
            }
            else {
                console.log('❌ Error getting bookings:', bookingError.message);
            }
        }
        // Step 3: Check database records
        console.log('\n📋 Step 3: Database Records Check');
        console.log('----------------------------------');
        const { data: dbPhoneNumbers, error: dbError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('provider', 'anosim')
            .order('created_at', { ascending: false });
        if (dbError) {
            console.log('❌ Database Error:', dbError.message);
        }
        else {
            console.log('✓ Anosim Numbers in Database:', dbPhoneNumbers?.length || 0);
            if (dbPhoneNumbers && dbPhoneNumbers.length > 0) {
                dbPhoneNumbers.forEach((phone, index) => {
                    console.log(`\n💾 DB Record ${index + 1}:`);
                    console.log(`  - Number: ${phone.phone_number}`);
                    console.log(`  - Status: ${phone.status}`);
                    console.log(`  - Order Booking ID: ${phone.order_booking_id}`);
                    console.log(`  - End Date: ${phone.end_date}`);
                    console.log(`  - Created: ${phone.created_at}`);
                });
            }
        }
        // Step 4: Check for any messages
        console.log('\n📋 Step 4: Message Records Check');
        console.log('---------------------------------');
        // Try to get messages for Anosim numbers (if any exist)
        let anosimMessages = null;
        let msgError = null;
        if (dbPhoneNumbers && dbPhoneNumbers.length > 0) {
            const anosimPhoneIds = dbPhoneNumbers.map(p => p.id);
            const result = await supabase_1.supabase
                .from('phone_messages')
                .select('*')
                .in('phone_number_id', anosimPhoneIds)
                .order('received_at', { ascending: false })
                .limit(10);
            anosimMessages = result.data;
            msgError = result.error;
        }
        if (msgError) {
            console.log('❌ Message Query Error:', msgError.message);
            // Try simpler query
            const { data: allMessages, error: allMsgError } = await supabase_1.supabase
                .from('phone_messages')
                .select('*')
                .order('received_at', { ascending: false })
                .limit(5);
            if (!allMsgError) {
                console.log('✓ Total Messages in Database:', allMessages?.length || 0);
            }
        }
        else {
            console.log('✓ Anosim Messages in Database:', anosimMessages?.length || 0);
        }
        // Step 5: Recommendations
        console.log('\n📋 Step 5: Recommendations');
        console.log('---------------------------');
        if (!dbPhoneNumbers || dbPhoneNumbers.length === 0) {
            console.log('💡 NEXT STEPS:');
            console.log('1. 📱 Rent an Anosim number through the admin interface');
            console.log('2. 🔍 Verify the number appears in the database');
            console.log('3. 💬 Check if messages sync automatically');
            console.log('\n🎯 TO RENT A NUMBER:');
            console.log('1. Go to Admin → Phone Numbers');
            console.log('2. Click "🇩🇪 Anosim" button');
            console.log('3. Select a service and country');
            console.log('4. Click "Rent Number"');
        }
        else {
            console.log('💡 TROUBLESHOOTING:');
            console.log('1. 🔄 Try the new "Sync All Anosim" button in the admin interface');
            console.log('2. 🔍 Check if the booking IDs in the database match active Anosim bookings');
            console.log('3. 💬 Manually fetch messages using the "Fetch Messages" button');
        }
    }
    catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        console.error('Stack:', error.stack);
    }
}
runAnosimDiagnostic();
