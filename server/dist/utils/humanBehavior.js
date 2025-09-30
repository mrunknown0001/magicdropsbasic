"use strict";
/**
 * Server-side human behavior utilities for chat system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagerStatus = getManagerStatus;
exports.generateAwayMessage = generateAwayMessage;
/**
 * Get current manager status based on time of day and work patterns
 */
function getManagerStatus() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    // Weekend
    if (day === 0 || day === 6) {
        return {
            isAvailable: false,
            status: 'offline',
            responseStyle: 'casual',
            autoReplyMessage: 'Bin übers Wochenende nicht im Büro. Melde mich Montag früh um 8 Uhr zurück!',
            estimatedResponseTime: 'Montag 8:00'
        };
    }
    // Early morning (before 8 AM)
    if (hour < 8) {
        return {
            isAvailable: false,
            status: 'offline',
            responseStyle: 'casual',
            autoReplyMessage: 'Bin noch nicht im Büro. Melde mich um 8 Uhr zurück!',
            estimatedResponseTime: 'Heute 8:00'
        };
    }
    // Late evening (after 18 PM)
    if (hour >= 18) {
        return {
            isAvailable: false,
            status: 'offline',
            responseStyle: 'casual',
            autoReplyMessage: 'Feierabend! Melde mich morgen früh um 8 Uhr zurück.',
            estimatedResponseTime: 'Morgen 8:00'
        };
    }
    // Lunch time (12-13 PM)
    if (hour === 12 || (hour === 13 && minute < 30)) {
        return {
            isAvailable: false,
            status: 'lunch',
            responseStyle: 'casual',
            autoReplyMessage: 'Bin gerade beim Mittagessen. Melde mich in etwa 20 Minuten zurück!',
            estimatedResponseTime: '13:30'
        };
    }
    // Morning energy (8-10 AM)
    if (hour >= 8 && hour < 10) {
        return {
            isAvailable: true,
            status: 'online',
            responseStyle: 'energetic'
        };
    }
    // Focused work time (10-12 PM)
    if (hour >= 10 && hour < 12) {
        return {
            isAvailable: true,
            status: 'busy',
            responseStyle: 'focused'
        };
    }
    // Afternoon productive (13-16 PM)
    if (hour >= 13 && hour < 16) {
        return {
            isAvailable: true,
            status: 'online',
            responseStyle: 'focused'
        };
    }
    // End of day (16-18 PM)
    if (hour >= 16 && hour < 18) {
        return {
            isAvailable: true,
            status: 'busy',
            responseStyle: 'tired'
        };
    }
    // Default working hours
    return {
        isAvailable: true,
        status: 'online',
        responseStyle: 'focused'
    };
}
/**
 * Generate away message for offline status
 */
function generateAwayMessage(managerStatus) {
    if (!managerStatus.isAvailable && managerStatus.autoReplyMessage) {
        return managerStatus.autoReplyMessage;
    }
    if (managerStatus.status === 'lunch') {
        return 'Bin gerade beim Mittagessen. Melde mich in etwa 20 Minuten zurück!';
    }
    if (managerStatus.status === 'meeting') {
        return 'Bin gerade in einem Meeting. Melde mich in etwa 30 Minuten zurück!';
    }
    return null;
}
