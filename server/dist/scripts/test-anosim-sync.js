"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const anosimSync_controller_1 = require("../controllers/anosimSync.controller");
async function testAnosimSync() {
    console.log('🔄 Testing Anosim Message Sync');
    console.log('==============================\n');
    try {
        console.log('📞 Syncing booking ID 4892693 to database...');
        const syncResult = await (0, anosimSync_controller_1.syncSingleAnosimNumber)('4892693', '35925e90-460a-405c-b8c3-0ec03036374b');
        console.log('✅ Sync Result:', JSON.stringify(syncResult, null, 2));
        if (syncResult.newMessages > 0) {
            console.log(`🎉 SUCCESS! Synced ${syncResult.newMessages} new messages to database`);
        }
        else {
            console.log('ℹ️ No new messages (might already be in database)');
        }
    }
    catch (error) {
        console.error('❌ Sync error:', error.message);
        console.error('Full error:', error);
    }
}
testAnosimSync();
