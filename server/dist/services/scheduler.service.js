"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const followUp_service_1 = require("./followUp.service");
class SchedulerService {
    /**
     * Start the follow-up scheduler
     */
    static startFollowUpScheduler() {
        if (this.isRunning) {
            console.log('📅 Follow-up scheduler already running');
            return;
        }
        console.log('🚀 Starting follow-up scheduler...');
        this.isRunning = true;
        // Process immediately on startup
        this.processFollowUps();
        // Then check every minute
        this.intervalId = setInterval(async () => {
            try {
                await this.processFollowUps();
            }
            catch (error) {
                console.error('❌ Follow-up scheduler error:', error);
            }
        }, 60000); // 1 minute interval
        console.log('✅ Follow-up scheduler started (checking every minute)');
    }
    /**
     * Stop the follow-up scheduler
     */
    static stopFollowUpScheduler() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️ Follow-up scheduler stopped');
    }
    /**
     * Process all pending follow-ups
     */
    static async processFollowUps() {
        try {
            const pendingFollowUps = await followUp_service_1.FollowUpService.getPendingFollowUps();
            if (pendingFollowUps.length === 0) {
                // Only log during business hours to avoid spam
                const hour = new Date().getHours();
                if (hour >= 8 && hour <= 18) {
                    console.log('📅 No pending follow-ups to process');
                }
                return;
            }
            console.log(`📬 Processing ${pendingFollowUps.length} pending follow-ups...`);
            // Process follow-ups in parallel for efficiency
            const results = await Promise.allSettled(pendingFollowUps.map(followUp => followUp_service_1.FollowUpService.sendFollowUpMessage(followUp.id)));
            // Count results
            const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            const failed = results.length - successful;
            if (successful > 0) {
                console.log(`✅ Sent ${successful} follow-up messages successfully`);
            }
            if (failed > 0) {
                console.log(`❌ Failed to send ${failed} follow-up messages`);
            }
        }
        catch (error) {
            console.error('❌ Error processing follow-ups:', error);
        }
    }
    /**
     * Get next working hours for scheduling
     */
    static getNextWorkingHours() {
        const now = new Date();
        const nextWorkingDay = new Date(now);
        // If it's currently working hours (8-18, Mon-Fri)
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
        // If it's weekend
        if (currentDay === 0) { // Sunday
            nextWorkingDay.setDate(now.getDate() + 1); // Monday
            nextWorkingDay.setHours(8, 0, 0, 0);
            return nextWorkingDay;
        }
        else if (currentDay === 6) { // Saturday
            nextWorkingDay.setDate(now.getDate() + 2); // Monday
            nextWorkingDay.setHours(8, 0, 0, 0);
            return nextWorkingDay;
        }
        // If it's a weekday
        if (currentHour < 8) {
            // Before work hours - return today at 8 AM
            nextWorkingDay.setHours(8, 0, 0, 0);
            return nextWorkingDay;
        }
        else if (currentHour >= 18) {
            // After work hours - return next day at 8 AM
            if (currentDay === 5) { // Friday
                nextWorkingDay.setDate(now.getDate() + 3); // Monday
            }
            else {
                nextWorkingDay.setDate(now.getDate() + 1); // Next day
            }
            nextWorkingDay.setHours(8, 0, 0, 0);
            return nextWorkingDay;
        }
        else if (currentHour >= 12 && currentHour < 13) {
            // Lunch time - return at 13:30
            nextWorkingDay.setHours(13, 30, 0, 0);
            return nextWorkingDay;
        }
        // Currently working hours - return in 1 hour
        nextWorkingDay.setHours(currentHour + 1, 0, 0, 0);
        return nextWorkingDay;
    }
    /**
     * Calculate specific return time based on current status
     */
    static calculateReturnTime(managerStatus) {
        const now = new Date();
        switch (managerStatus.status) {
            case 'offline':
                if (now.getDay() === 5 && now.getHours() >= 18) {
                    // Friday evening -> Monday 8 AM
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + 3);
                    monday.setHours(8, 0, 0, 0);
                    return monday;
                }
                else if (now.getDay() === 6) {
                    // Saturday -> Monday 8 AM
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + 2);
                    monday.setHours(8, 0, 0, 0);
                    return monday;
                }
                else if (now.getDay() === 0) {
                    // Sunday -> Monday 8 AM
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + 1);
                    monday.setHours(8, 0, 0, 0);
                    return monday;
                }
                else if (now.getHours() >= 18) {
                    // Weekday evening -> Next day 8 AM
                    const nextDay = new Date(now);
                    nextDay.setDate(now.getDate() + 1);
                    nextDay.setHours(8, 0, 0, 0);
                    return nextDay;
                }
                else if (now.getHours() < 8) {
                    // Early morning -> Today 8 AM
                    const today = new Date(now);
                    today.setHours(8, 0, 0, 0);
                    return today;
                }
                break;
            case 'lunch':
                // Lunch -> 13:30 same day
                const afterLunch = new Date(now);
                afterLunch.setHours(13, 30, 0, 0);
                return afterLunch;
            default:
                // Default: next working hour
                return this.getNextWorkingHours();
        }
        return this.getNextWorkingHours();
    }
    /**
     * Get scheduler status for admin monitoring
     */
    static getSchedulerStatus() {
        return {
            isRunning: this.isRunning,
            nextCheck: new Date(Date.now() + 60000), // Next minute
            uptime: this.isRunning ? Date.now() : 0
        };
    }
    /**
     * Manual trigger for testing (admin use)
     */
    static async triggerFollowUpProcessing() {
        console.log('🔧 Manual follow-up processing triggered');
        const pendingFollowUps = await followUp_service_1.FollowUpService.getPendingFollowUps();
        const results = await Promise.allSettled(pendingFollowUps.map(followUp => followUp_service_1.FollowUpService.sendFollowUpMessage(followUp.id)));
        const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        const failed = results.length - successful;
        return {
            processed: pendingFollowUps.length,
            successful,
            failed
        };
    }
}
exports.SchedulerService = SchedulerService;
SchedulerService.isRunning = false;
SchedulerService.intervalId = null;
