"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const anosim_service_1 = require("../services/anosim.service");
async function testModes() {
    console.log('\n🧪 Testing Anosim Dual Modes');
    console.log('=============================');
    try {
        console.log('\n=== Testing Activation Mode ===');
        const activation = await anosim_service_1.anosimService.getDualModeServices('activation');
        console.log('✅ Activation services count:', Object.keys(activation.services).length);
        console.log('✅ Activation services:', Object.keys(activation.services).slice(0, 10));
        console.log('✅ Activation type:', activation.type);
        console.log('✅ Sample activation service:', JSON.stringify(activation.services['wa'] || activation.services[Object.keys(activation.services)[0]], null, 2));
        console.log('\n=== Testing Rental Mode ===');
        const rental = await anosim_service_1.anosimService.getDualModeServices('rental');
        console.log('✅ Rental services count:', Object.keys(rental.services).length);
        console.log('✅ Rental services:', Object.keys(rental.services).slice(0, 10));
        console.log('✅ Rental type:', rental.type);
        console.log('✅ Sample rental service:', JSON.stringify(rental.services['full'] || rental.services[Object.keys(rental.services)[0]], null, 2));
        console.log('\n=== Comparison ===');
        console.log(`Activation has ${Object.keys(activation.services).length} services`);
        console.log(`Rental has ${Object.keys(rental.services).length} services`);
        console.log('Are they different?', JSON.stringify(activation.services) !== JSON.stringify(rental.services));
    }
    catch (error) {
        console.error('❌ Error testing modes:', error);
    }
}
testModes();
