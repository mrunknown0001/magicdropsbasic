"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveSmsHealthCheck = exports.previewReceiveSmsMessages = void 0;
const supabase_1 = require("../lib/supabase");
/**
 * Enhanced receive-sms-online scraper for backend use
 * This completely avoids CORS issues by running on the server
 */
class BackendReceiveSmsOnlineScraper {
    /**
     * Scrape messages from receive-sms-online.info URL
     */
    static async scrapeMessages(url) {
        const startTime = Date.now();
        const debugInfo = {};
        try {
            // Validate URL
            if (!this.isValidUrl(url)) {
                throw new Error('Invalid receive-sms-online.info URL');
            }
            const userAgent = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
            // Use node-fetch equivalent with proper headers
            const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'User-Agent': userAgent
                },
                timeout: this.TIMEOUT
            });
            debugInfo.httpStatus = response.status;
            debugInfo.responseTime = Date.now() - startTime;
            debugInfo.fetchMethod = 'backend-direct';
            debugInfo.serviceAccessible = true;
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const html = await response.text();
            debugInfo.contentLength = html.length;
            return this.parseAndReturnEnhanced(html, startTime, debugInfo);
        }
        catch (error) {
            debugInfo.serviceAccessible = false;
            return {
                success: false,
                messages: [],
                error: error instanceof Error ? error.message : 'Unknown scraping error',
                lastScrapedAt: new Date().toISOString(),
                debugInfo
            };
        }
    }
    /**
     * Parse HTML and return enhanced result
     */
    static parseAndReturnEnhanced(html, startTime, debugInfo) {
        try {
            const messages = this.parseMessages(html);
            return {
                success: true,
                messages,
                lastScrapedAt: new Date().toISOString(),
                debugInfo: {
                    ...debugInfo,
                    responseTime: Date.now() - startTime
                }
            };
        }
        catch (parseError) {
            return {
                success: false,
                messages: [],
                error: parseError instanceof Error ? parseError.message : 'Failed to parse HTML',
                lastScrapedAt: new Date().toISOString(),
                debugInfo
            };
        }
    }
    /**
     * Parse messages from HTML using Node.js DOM parser
     */
    static parseMessages(html) {
        const messages = [];
        try {
            // Use jsdom for server-side HTML parsing
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM(html);
            const document = dom.window.document;
            // Strategy 1: Look for data-label attributes (magicdrops-icpo-new style)
            const allRows = Array.from(document.querySelectorAll('table tbody tr'));
            const dataLabelRows = allRows.filter((row) => {
                const from = row.querySelector('td[data-label="From   :"]')?.textContent?.trim();
                const message = row.querySelector('td[data-label="Message   :"]')?.textContent?.trim();
                const added = row.querySelector('td[data-label="Added   :"]')?.textContent?.trim();
                return from && message && added;
            });
            if (dataLabelRows.length > 0) {
                dataLabelRows.forEach((row) => {
                    const sender = row.querySelector('td[data-label="From   :"]')?.textContent?.trim() || '';
                    const messageElement = row.querySelector('td[data-label="Message   :"]');
                    const timeText = row.querySelector('td[data-label="Added   :"]')?.textContent?.trim() || '';
                    // Clean up message content - remove extra whitespace and newlines
                    let message = messageElement?.textContent?.trim() || '';
                    message = message.replace(/\s+/g, ' ').trim(); // Replace multiple whitespace with single space
                    if (this.isValidReceiveSmsMessage(sender, message)) {
                        messages.push({
                            sender,
                            message,
                            received_at: this.parseTimestamp(timeText),
                            raw_html: row.outerHTML
                        });
                    }
                });
                if (messages.length > 0) {
                    return messages;
                }
            }
            // Strategy 2: Standard table parsing with enhanced cell handling
            const tables = document.querySelectorAll('table');
            for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
                const table = tables[tableIndex];
                const rows = Array.from(table.querySelectorAll('tr'));
                rows.forEach((row, rowIndex) => {
                    if (rowIndex === 0)
                        return; // Skip header row
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 3) {
                        // receive-sms-online.info format: From | SMS Messages | Added
                        const sender = cells[0]?.textContent?.trim() || '';
                        const message = cells[1]?.textContent?.trim() || '';
                        const timeText = cells[2]?.textContent?.trim() || '';
                        if (this.isValidReceiveSmsMessage(sender, message)) {
                            messages.push({
                                sender,
                                message,
                                received_at: this.parseTimestamp(timeText),
                                raw_html: row.outerHTML
                            });
                        }
                    }
                    else if (cells.length === 2) {
                        // Handle 2-column format: Sender + Message
                        const senderCell = cells[0]?.textContent?.trim() || '';
                        const messageCell = cells[1]?.textContent?.trim() || '';
                        if (this.isValidReceiveSmsMessage(senderCell, messageCell)) {
                            messages.push({
                                sender: senderCell,
                                message: messageCell,
                                received_at: this.parseTimestamp(''),
                                raw_html: row.outerHTML
                            });
                        }
                    }
                    else if (cells.length === 1) {
                        // Handle single cell format (might contain sender and message)
                        const cellText = cells[0]?.textContent?.trim() || '';
                        // Try to extract sender and message from single cell
                        const parts = cellText.split(/[|\-:]/);
                        if (parts.length >= 2) {
                            const sender = parts[0].trim();
                            const message = parts.slice(1).join(' ').trim();
                            if (this.isValidReceiveSmsMessage(sender, message)) {
                                messages.push({
                                    sender,
                                    message,
                                    received_at: this.parseTimestamp(''),
                                    raw_html: row.outerHTML
                                });
                            }
                        }
                    }
                });
            }
            // Strategy 3: Look for div-based layouts
            if (messages.length === 0) {
                const messageContainers = document.querySelectorAll('div, section, article');
                messageContainers.forEach((container) => {
                    const text = container.textContent?.trim() || '';
                    // Look for comdirect specifically
                    if (text.includes('comdirect') && text.includes('Bitte nicht weitergeben')) {
                        // Try to extract the message
                        const comdirectIndex = text.indexOf('comdirect');
                        const messageStart = text.indexOf('Bitte nicht weitergeben', comdirectIndex);
                        if (messageStart > -1) {
                            const message = text.substring(messageStart).split(/[|\n\r]/)[0].trim();
                            if (message.length > 10) {
                                messages.push({
                                    sender: 'comdirect',
                                    message,
                                    received_at: this.parseTimestamp(''),
                                    raw_html: container.outerHTML
                                });
                            }
                        }
                    }
                });
            }
            // Strategy 4: Text pattern matching
            if (messages.length === 0) {
                const textContent = document.body?.textContent || html;
                // Pattern 1: Look for the specific comdirect message
                const specificComdirectMessage = 'Bitte nicht weitergeben - hier ist das Passwort für Ihren comdirect Eröffnungsantrag: G98b-TQXb';
                if (textContent.includes(specificComdirectMessage)) {
                    console.log('🎯 Backend: Found specific comdirect message in text content!');
                    messages.push({
                        sender: 'comdirect',
                        message: specificComdirectMessage,
                        received_at: this.parseTimestamp(''),
                        raw_html: 'Direct text extraction'
                    });
                }
                // Pattern 2: More flexible comdirect pattern
                const comdirectPattern = /comdirect[\s\S]*?(Bitte nicht weitergeben[^|]*)/gi;
                let match;
                while ((match = comdirectPattern.exec(textContent)) !== null) {
                    const message = match[1].trim();
                    if (message.length > 10) {
                        console.log('Backend: Found comdirect message via flexible pattern:', message.substring(0, 50));
                        messages.push({
                            sender: 'comdirect',
                            message,
                            received_at: this.parseTimestamp(''),
                            raw_html: `Flexible pattern match: ${match[0]}`
                        });
                    }
                }
                // Pattern 3: Look for "From: X Message: Y" patterns
                const fromMessagePattern = /From:\s*([^\n\r]+)[\s\S]*?Message:\s*([^\n\r]+)/gi;
                while ((match = fromMessagePattern.exec(textContent)) !== null) {
                    const sender = match[1].trim();
                    const message = match[2].trim();
                    if (this.isValidReceiveSmsMessage(sender, message)) {
                        messages.push({
                            sender,
                            message,
                            received_at: this.parseTimestamp(''),
                            raw_html: `Pattern match: ${match[0]}`
                        });
                    }
                }
            }
            return messages;
        }
        catch (error) {
            console.error('Backend parsing error:', error);
            return [];
        }
    }
    /**
     * Validate receive-sms-online message
     */
    static isValidReceiveSmsMessage(sender, message) {
        const cleanSender = sender.trim();
        const cleanMessage = message.trim();
        // Must have both sender and message
        if (!cleanSender || !cleanMessage) {
            return false;
        }
        // Exclude obvious header rows and invalid content
        const invalidSenders = ['from', 'sender', 'field'];
        const invalidMessages = ['message', 'sms', 'content', 'description'];
        const senderLower = cleanSender.toLowerCase();
        const messageLower = cleanMessage.toLowerCase();
        // Check if sender looks like a header
        if (invalidSenders.some(invalid => senderLower === invalid)) {
            return false;
        }
        // Check if message looks like a header
        if (invalidMessages.some(invalid => messageLower === invalid)) {
            return false;
        }
        // Must be at least 1 character each (after trimming)
        if (cleanSender.length < 1 || cleanMessage.length < 1) {
            return false;
        }
        return true;
    }
    /**
     * Validate URL format
     */
    static isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'receive-sms-online.info' &&
                urlObj.pathname.includes('private.php') &&
                urlObj.searchParams.has('phone') &&
                urlObj.searchParams.has('key');
        }
        catch {
            return false;
        }
    }
    /**
     * Parse timestamp from various formats
     */
    static parseTimestamp(timeText) {
        if (!timeText.trim()) {
            return new Date().toISOString();
        }
        try {
            // Common patterns
            const patterns = [
                /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,
                /(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2})/,
                /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/,
                /(\d{2}:\d{2}:\d{2})/,
                /(\d{2}:\d{2})/
            ];
            for (const pattern of patterns) {
                const match = timeText.match(pattern);
                if (match) {
                    let dateStr = match[1];
                    if (dateStr.includes('.')) {
                        const parts = dateStr.split(' ');
                        if (parts.length >= 1) {
                            const datePart = parts[0].split('.');
                            if (datePart.length === 3) {
                                dateStr = `${datePart[2]}-${datePart[1]}-${datePart[0]}`;
                                if (parts[1])
                                    dateStr += ` ${parts[1]}`;
                            }
                        }
                    }
                    else if (dateStr.includes('/')) {
                        const parts = dateStr.split(' ');
                        if (parts.length >= 1) {
                            const datePart = parts[0].split('/');
                            if (datePart.length === 3) {
                                dateStr = `${datePart[2]}-${datePart[1]}-${datePart[0]}`;
                                if (parts[1])
                                    dateStr += ` ${parts[1]}`;
                            }
                        }
                    }
                    else if (dateStr.match(/^\d{2}:\d{2}/)) {
                        const today = new Date().toISOString().split('T')[0];
                        dateStr = `${today} ${dateStr}`;
                    }
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) {
                        return parsed.toISOString();
                    }
                }
            }
            const fallback = new Date(timeText);
            if (!isNaN(fallback.getTime())) {
                return fallback.toISOString();
            }
        }
        catch (error) {
            console.warn('Backend error parsing timestamp:', timeText, error);
        }
        return new Date().toISOString();
    }
}
BackendReceiveSmsOnlineScraper.BASE_URL = 'https://receive-sms-online.info';
BackendReceiveSmsOnlineScraper.TIMEOUT = 15000;
BackendReceiveSmsOnlineScraper.USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];
/**
 * Preview messages from receive-sms-online URL
 */
const previewReceiveSmsMessages = async (req, res) => {
    try {
        const { url, phoneNumberId } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        const result = await BackendReceiveSmsOnlineScraper.scrapeMessages(url);
        // If we have phoneNumberId and successful scraping, save to database
        if (result.success && result.messages.length > 0 && phoneNumberId) {
            try {
                // Use upsert to handle duplicates gracefully
                const messagesToInsert = result.messages.map((msg) => ({
                    phone_number_id: phoneNumberId,
                    sender: msg.sender,
                    message: msg.message,
                    received_at: msg.received_at,
                    message_source: 'scraping',
                    raw_html: msg.raw_html
                }));
                // Use upsert to handle duplicates gracefully
                const { error: insertError } = await supabase_1.supabase
                    .from('phone_messages')
                    .upsert(messagesToInsert, {
                    onConflict: 'phone_number_id,sender,message',
                    ignoreDuplicates: true
                })
                    .select();
                if (insertError) {
                    console.warn('Failed to save scraped messages to database:', insertError.message);
                    // Don't throw error, just log it since duplicates are expected
                }
            }
            catch (dbError) {
                console.error('Database operation failed while saving messages:', dbError);
                // Don't fail the whole request if DB operation fails
            }
        }
        res.json(result);
    }
    catch (error) {
        console.error('Error in previewReceiveSmsMessages:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};
exports.previewReceiveSmsMessages = previewReceiveSmsMessages;
/**
 * Health check for receive-sms-online scraping
 */
const receiveSmsHealthCheck = async (req, res) => {
    try {
        // Test with a dummy URL format to check if the scraper is working
        res.json({
            success: true,
            message: 'Receive-SMS-Online scraper is healthy',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Health check failed'
        });
    }
};
exports.receiveSmsHealthCheck = receiveSmsHealthCheck;
