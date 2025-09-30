"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
async function fixAnosimBookingId() {
    console.log('🔧 Fixing Anosim database record with correct booking ID...');
    try {
        // First, check if the record exists
        const { data: existingRecord, error: checkError } = await supabase_1.supabase
            .from('phone_numbers')
            .select('*')
            .eq('phone_number', '+4915510819925')
            .eq('provider', 'anosim')
            .maybeSingle();
        if (checkError) {
            console.error('❌ Error checking existing record:', checkError);
            return;
        }
        if (!existingRecord) {
            console.log('❌ No existing record found for +4915510819925');
            // Create the record if it doesn't exist
            console.log('🔄 Creating new record...');
            const { data: newRecord, error: createError } = await supabase_1.supabase
                .from('phone_numbers')
                .insert({
                phone_number: '+4915510819925',
                provider: 'anosim',
                order_id: '4827627',
                order_booking_id: '4892693',
                external_url: '4892693',
                rent_id: '4892693',
                service: 'full_germany',
                country: 'Germany',
                status: 'active',
                end_date: '2025-08-26T17:51:11.013Z'
            })
                .select()
                .single();
            if (createError) {
                console.error('❌ Error creating record:', createError);
            }
            else {
                console.log('✅ Created new record:', newRecord);
            }
        }
        else {
            console.log('📋 Found existing record:', existingRecord);
            // Update with correct booking ID
            console.log('🔄 Updating with correct booking ID...');
            const { data: updatedRecord, error: updateError } = await supabase_1.supabase
                .from('phone_numbers')
                .update({
                order_booking_id: '4892693', // Correct booking ID from API
                order_id: '4827627', // Original order ID  
                external_url: '4892693', // Also update external_url for compatibility
                rent_id: '4892693' // Update rent_id too
            })
                .eq('id', existingRecord.id)
                .select()
                .single();
            if (updateError) {
                console.error('❌ Update error:', updateError);
            }
            else {
                console.log('✅ Updated record:', updatedRecord);
            }
        }
    }
    catch (error) {
        console.error('❌ Script error:', error.message);
    }
}
fixAnosimBookingId()
    .then(() => {
    console.log('✅ Database fix completed');
    process.exit(0);
})
    .catch(error => {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
});
