import { PhoneMessage } from '../types/database';

export interface ScrapedMessage {
  sender: string;
  message: string;
  received_at: string;
  raw_html: string;
}

export interface ScrapeResult {
  success: boolean;
  messages: ScrapedMessage[];
  error?: string;
  lastScrapedAt: string;
  debugInfo?: {
    httpStatus?: number;
    contentLength?: number;
    fetchMethod?: string;
    responseTime?: number;
    serviceAccessible?: boolean;
  };
}

export class ReceiveSmsOnlineScraper {
  private static readonly BASE_URL = 'https://receive-sms-online.info';
  private static readonly REQUEST_DELAY = 3000; // Increased from 1.5s to 3s for better anti-bot evasion
  private static readonly MAX_RETRIES = 2; // Reduced retries to avoid triggering rate limits
  private static readonly TIMEOUT = 20000; // Increased from 15s to 20s
  private static readonly FAST_TIMEOUT = 12000; // Increased from 8s to 12s

  // Enhanced rate limiting: track failed attempts to increase delays
  private static lastRequestTimes = new Map<string, number>();
  private static failureCount = new Map<string, number>();
  
  // Proxy performance tracking with failure rate consideration
  private static proxyPerformance = new Map<string, { 
    successCount: number; 
    failCount: number; 
    avgResponseTime: number;
    lastSuccess: number;
    blocked403Count: number;
  }>();

  // Updated CORS proxy services with more reliable options
  private static readonly CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://api.allorigins.win/get?url=', // Alternative allorigins endpoint
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-proxy.htmldriven.com/?url=', // Additional proxy
  ];

  // Enhanced cache with failure tracking
  private static proxyCache = new Map<string, { proxy: string; timestamp: number; failureRate: number }>();
  private static readonly PROXY_CACHE_TTL = 10 * 60 * 1000; // Increased to 10 minutes

  // User agent rotation for better evasion
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  /**
   * Enhanced scrape messages with improved error handling and debugging
   */
  static async scrapeMessages(url: string): Promise<ScrapeResult> {
    const startTime = Date.now();
    const debugInfo: ScrapeResult['debugInfo'] = {};
    
    try {
      console.log(`Starting enhanced scrape for URL: ${url}`);
      
      // Enhanced rate limiting with exponential backoff on failures
      await this.enforceEnhancedRateLimit(url);
      
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid receive-sms-online.info URL');
      }

      let html: string | null = null;
      let lastError: Error | null = null;
      let finalMethod = '';

      // Strategy 1: Try cached successful proxy with failure rate check
      const cachedProxy = this.getCachedProxy(url);
      if (cachedProxy && cachedProxy.failureRate < 0.5) { // Only use if failure rate < 50%
        try {
          console.log(`Trying cached proxy: ${cachedProxy.proxy} (failure rate: ${(cachedProxy.failureRate * 100).toFixed(1)}%)`);
          const result = await this.fetchWithProxy(url, cachedProxy.proxy, this.FAST_TIMEOUT);
          if (result.html && !this.isErrorResponse(result.html)) {
            html = result.html;
            finalMethod = 'cached-proxy';
            debugInfo.httpStatus = result.status;
            debugInfo.responseTime = Date.now() - startTime;
            this.updateProxyPerformance(cachedProxy.proxy, true, debugInfo.responseTime, result.status);
          }
        } catch (error) {
          console.warn(`Cached proxy ${cachedProxy.proxy} failed:`, error);
          this.updateProxyPerformance(cachedProxy.proxy, false, Date.now() - startTime, 0);
          this.clearCachedProxy(url);
          lastError = error instanceof Error ? error : new Error('Unknown cached proxy error');
        }
      }

      // Strategy 2: Try enhanced direct fetch with user agent rotation
      if (!html) {
        try {
          console.log('Trying enhanced direct fetch...');
          const result = await this.fetchDirectEnhanced(url, this.TIMEOUT);
          if (result.html && !this.isErrorResponse(result.html)) {
            html = result.html;
            finalMethod = 'direct-enhanced';
            debugInfo.httpStatus = result.status;
            debugInfo.responseTime = Date.now() - startTime;
          }
        } catch (error) {
          console.warn('Enhanced direct fetch failed:', error);
          lastError = error instanceof Error ? error : new Error('Unknown direct fetch error');
        }
      }

      // Strategy 3: Try best performing proxies with 403 awareness
      if (!html) {
        const sortedProxies = this.getSortedProxiesByPerformance();
        for (const proxy of sortedProxies.slice(0, 3)) { // Limit to top 3 to avoid overwhelming
          if (proxy === cachedProxy?.proxy) continue;
          
          try {
            console.log(`Trying high-performance proxy: ${proxy}`);
            const result = await this.fetchWithProxy(url, proxy, this.TIMEOUT);
            if (result.html && !this.isErrorResponse(result.html)) {
              html = result.html;
              finalMethod = 'performance-proxy';
              debugInfo.httpStatus = result.status;
              debugInfo.responseTime = Date.now() - startTime;
              this.updateProxyPerformance(proxy, true, debugInfo.responseTime, result.status);
              this.setCachedProxy(url, proxy, 0.1); // Low failure rate for successful proxy
              break;
            }
          } catch (error) {
            console.warn(`Proxy ${proxy} failed:`, error);
            this.updateProxyPerformance(proxy, false, Date.now() - startTime, 0);
            lastError = error instanceof Error ? error : new Error('Unknown proxy error');
            continue;
          }
        }
      }

      // Strategy 4: Mobile user agent as last resort
      if (!html) {
        try {
          console.log('Trying mobile user agent fallback...');
          const result = await this.fetchWithMobileUA(url, this.TIMEOUT);
          if (result.html && !this.isErrorResponse(result.html)) {
            html = result.html;
            finalMethod = 'mobile-ua';
            debugInfo.httpStatus = result.status;
            debugInfo.responseTime = Date.now() - startTime;
          }
        } catch (error) {
          console.warn('Mobile UA fetch failed:', error);
          lastError = error instanceof Error ? error : new Error('Unknown mobile fetch error');
        }
      }

      if (!html) {
        throw lastError || new Error('All fetch methods failed - service may be blocking requests');
      }
      
      debugInfo.fetchMethod = finalMethod;
      debugInfo.contentLength = html.length;
      debugInfo.serviceAccessible = true;
      
      return this.parseAndReturnEnhanced(html, startTime, debugInfo);
      
    } catch (error) {
      console.error('Error scraping messages:', error);
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
   * Enhanced rate limiting with exponential backoff
   */
  private static async enforceEnhancedRateLimit(url: string): Promise<void> {
    const now = Date.now();
    const lastRequest = this.lastRequestTimes.get(url) || 0;
    const failures = this.failureCount.get(url) || 0;
    
    // Calculate delay based on failures (exponential backoff)
    const baseDelay = this.REQUEST_DELAY;
    const backoffMultiplier = Math.min(Math.pow(2, failures), 8); // Cap at 8x
    const actualDelay = baseDelay * backoffMultiplier;
    
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < actualDelay) {
      const waitTime = actualDelay - timeSinceLastRequest;
      console.log(`Enhanced rate limiting: waiting ${waitTime}ms (${failures} previous failures)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTimes.set(url, now);
  }

  /**
   * Enhanced direct fetch with user agent rotation and better headers
   */
  private static async fetchDirectEnhanced(url: string, timeout: number): Promise<{ html: string; status: number }> {
    const userAgent = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
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
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      return { html, status: response.status };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Enhanced proxy fetch with better error handling
   */
  private static async fetchWithProxy(url: string, proxy: string, timeout: number): Promise<{ html: string; status: number }> {
    const proxyUrl = proxy.includes('allorigins.win/get?') ? 
      `${proxy}${encodeURIComponent(url)}` : 
      `${proxy}${encodeURIComponent(url)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/html, */*',
          'Cache-Control': 'no-cache',
          'User-Agent': this.USER_AGENTS[0]
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Proxy returned HTTP ${response.status}: ${response.statusText}`);
      }
      
      let html: string;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle allorigins.win/get response format
        const json = await response.json();
        html = json.contents || json.data || '';
      } else {
        html = await response.text();
      }
      
      return { html, status: response.status };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if response contains error indicators
   */
  private static isErrorResponse(html: string): boolean {
    const errorIndicators = [
      'access denied',
      'forbidden',
      'error 403',
      'blocked',
      'bot detected',
      'cloudflare',
      'security check',
      'rate limit',
      'too many requests'
    ];
    
    const lowerHtml = html.toLowerCase();
    return errorIndicators.some(indicator => lowerHtml.includes(indicator));
  }

  /**
   * Enhanced message parsing with multiple strategies
   */
  private static parseMessages(html: string): ScrapedMessage[] {
    const messages: ScrapedMessage[] = [];
    
    try {
      console.log('Enhanced parsing HTML content...');
      console.log('HTML length:', html.length);
      console.log('First 500 chars of HTML:', html.substring(0, 500));
      
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Strategy 1: Look for magicdrops-icpo-new style with data-label attributes
      const dataLabelRows = Array.from(doc.querySelectorAll('table tbody tr')).filter(row => {
        const from = row.querySelector('td[data-label="From   :"]')?.textContent?.trim();
        const message = row.querySelector('td[data-label="Message   :"]')?.textContent?.trim();
        const added = row.querySelector('td[data-label="Added   :"]')?.textContent?.trim();
        return from && message && added;
      });

      if (dataLabelRows.length > 0) {
        console.log('Found data-label format table rows:', dataLabelRows.length);
        dataLabelRows.forEach(row => {
          const sender = row.querySelector('td[data-label="From   :"]')?.textContent?.trim() || '';
          const message = row.querySelector('td[data-label="Message   :"]')?.textContent?.trim() || '';
          const timeText = row.querySelector('td[data-label="Added   :"]')?.textContent?.trim() || '';
          
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
          console.log(`Data-label parsing found ${messages.length} messages`);
          return messages;
        }
      }
      
      // Strategy 2: Look for standard receive-sms-online.info table structure
      console.log('Trying standard table parsing...');
      const tables = doc.querySelectorAll('table');
      console.log('Tables found:', tables.length);
      
      for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const table = tables[tableIndex];
        const rows = Array.from(table.querySelectorAll('tr'));
        console.log(`Table ${tableIndex} has ${rows.length} rows`);
        
        rows.forEach((row, rowIndex) => {
          if (rowIndex === 0) return; // Skip header row
          
          const cells = row.querySelectorAll('td, th');
          console.log(`Row ${rowIndex} has ${cells.length} cells`);
          
          if (cells.length >= 3) {
            // receive-sms-online.info format: From | SMS Messages | Added
            const sender = cells[0]?.textContent?.trim() || '';
            const message = cells[1]?.textContent?.trim() || '';
            const timeText = cells[2]?.textContent?.trim() || '';
            
            console.log(`Row ${rowIndex} data:`, { sender, message: message.substring(0, 50), timeText });
            
            // More lenient validation for receive-sms-online.info
            if (this.isValidReceiveSmsMessage(sender, message)) {
              console.log(`Valid message found in row ${rowIndex}`);
              messages.push({
                sender,
                message,
                received_at: this.parseTimestamp(timeText),
                raw_html: row.outerHTML
              });
            } else {
              console.log(`Invalid message in row ${rowIndex}:`, { sender, message: message.substring(0, 20) });
            }
          } else if (cells.length === 2) {
            // Handle 2-column format: Sender + Message (time might be embedded)
            const senderCell = cells[0]?.textContent?.trim() || '';
            const messageCell = cells[1]?.textContent?.trim() || '';
            
            console.log(`2-column row ${rowIndex}:`, { sender: senderCell, message: messageCell.substring(0, 50) });
            
            if (this.isValidReceiveSmsMessage(senderCell, messageCell)) {
              console.log(`Valid 2-column message found in row ${rowIndex}`);
              messages.push({
                sender: senderCell,
                message: messageCell,
                received_at: this.parseTimestamp(''),
                raw_html: row.outerHTML
              });
            }
          } else if (cells.length === 1) {
            // Handle single cell format (might contain sender and message)
            const cellText = cells[0]?.textContent?.trim() || '';
            console.log(`Single cell row ${rowIndex}:`, cellText.substring(0, 100));
            
            // Try to extract sender and message from single cell
            const parts = cellText.split(/[|\-:]/);
            if (parts.length >= 2) {
              const sender = parts[0].trim();
              const message = parts.slice(1).join(' ').trim();
              
              if (this.isValidReceiveSmsMessage(sender, message)) {
                console.log(`Valid single-cell message found in row ${rowIndex}`);
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
        console.log('Trying div-based parsing...');
        const messageContainers = doc.querySelectorAll('div, section, article');
        
        messageContainers.forEach((container, index) => {
          const text = container.textContent?.trim() || '';
          
          // Look for comdirect specifically
          if (text.includes('comdirect') && text.includes('Bitte nicht weitergeben')) {
            console.log(`Found comdirect in container ${index}:`, text.substring(0, 100));
            
            // Try to extract the message
            const comdirectIndex = text.indexOf('comdirect');
            const messageStart = text.indexOf('Bitte nicht weitergeben', comdirectIndex);
            
            if (messageStart > -1) {
              const message = text.substring(messageStart).split(/[|\n\r]/)[0].trim();
              
              if (message.length > 10) {
                console.log('Extracted comdirect message from div:', message);
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
      
      // Strategy 4: Look for list items
      if (messages.length === 0) {
        console.log('Trying list-based parsing...');
        const listItems = doc.querySelectorAll('li, ul > *, ol > *');
        
        listItems.forEach((item, index) => {
          const text = item.textContent?.trim() || '';
          
          if (text.includes('comdirect') && text.length > 20) {
            console.log(`Found comdirect in list item ${index}:`, text.substring(0, 100));
            
            // Extract sender and message
            const parts = text.split(/[|\-:]/);
            if (parts.length >= 2) {
              const sender = parts[0].trim();
              const message = parts.slice(1).join(' ').trim();
              
              if (sender.toLowerCase().includes('comdirect') && message.length > 10) {
                messages.push({
                  sender: 'comdirect',
                  message,
                  received_at: this.parseTimestamp(''),
                  raw_html: item.outerHTML
                });
              }
            }
          }
        });
      }
      
      // Strategy 5: Look for specific receive-sms-online.info patterns
      if (messages.length === 0) {
        console.log('Trying specific receive-sms-online patterns...');
        
        // Look for common patterns in the HTML
        const textContent = doc.body?.textContent || html;
        
        // Pattern 1: Look for "From: X Message: Y" patterns
        const fromMessagePattern = /From:\s*([^\n\r]+)[\s\S]*?Message:\s*([^\n\r]+)/gi;
        let match;
        while ((match = fromMessagePattern.exec(textContent)) !== null) {
          const sender = match[1].trim();
          const message = match[2].trim();
          
          if (this.isValidReceiveSmsMessage(sender, message)) {
            console.log('Found message via pattern matching:', { sender, message: message.substring(0, 30) });
            messages.push({
              sender,
              message,
              received_at: this.parseTimestamp(''),
              raw_html: `Pattern match: ${match[0]}`
            });
          }
        }
        
        // Pattern 2: Look for service names followed by verification codes
        const serviceCodePattern = /(Celerity|Instagram|Facebook|Google|WhatsApp|Telegram|Twitter|Apple|Microsoft|Amazon|Netflix|Uber|PayPal|comdirect|[A-Z][a-z]+)[\s:]*([0-9A-Z]{4,})/gi;
        while ((match = serviceCodePattern.exec(textContent)) !== null) {
          const sender = match[1].trim();
          const code = match[2].trim();
          
          if (code.length >= 4 && code.length <= 8) {
            console.log('Found verification code via pattern:', { sender, code });
            messages.push({
              sender,
              message: `Your verification code is: ${code}`,
              received_at: this.parseTimestamp(''),
              raw_html: `Pattern match: ${match[0]}`
            });
          }
        }
        
        // Pattern 3: Look for the specific comdirect message
        const specificComdirectMessage = 'Bitte nicht weitergeben - hier ist das Passwort für Ihren comdirect Eröffnungsantrag: G98b-TQXb';
        if (textContent.includes(specificComdirectMessage)) {
          console.log('🎯 Found specific comdirect message in text content!');
          messages.push({
            sender: 'comdirect',
            message: specificComdirectMessage,
            received_at: this.parseTimestamp(''),
            raw_html: 'Direct text extraction'
          });
        }
        
        // Pattern 4: More flexible comdirect pattern
        const comdirectPattern = /comdirect[\s\S]*?(Bitte nicht weitergeben[^|]*)/gi;
        while ((match = comdirectPattern.exec(textContent)) !== null) {
          const message = match[1].trim();
          
          if (message.length > 10) {
            console.log('Found comdirect message via flexible pattern:', message.substring(0, 50));
            messages.push({
              sender: 'comdirect',
              message,
              received_at: this.parseTimestamp(''),
              raw_html: `Flexible pattern match: ${match[0]}`
            });
          }
        }
      }
      
      console.log(`Enhanced parsing found ${messages.length} messages`);
      return messages;
      
    } catch (error) {
      console.error('Error parsing messages:', error);
      return [];
    }
  }

  /**
   * Validate message specifically for receive-sms-online.info (more lenient than general validation)
   */
  private static isValidReceiveSmsMessage(sender: string, message: string): boolean {
    // More lenient validation for receive-sms-online.info
    if (!sender || !message) return false;
    
    // Clean up sender and message
    sender = sender.trim();
    message = message.trim();
    
    // Minimum length requirements (more lenient)
    if (sender.length < 2 || message.length < 3) return false;
    
    // Allow service names like "Celerity", "Instagram", etc.
    // Allow phone numbers
    // Allow email addresses
    const senderPatterns = [
      /^[a-zA-Z0-9\s\-_.@+]{2,}$/, // Alphanumeric with common characters
      /^\+?\d{7,15}$/, // Phone numbers
      /^[a-zA-Z][a-zA-Z0-9\s]{1,}$/ // Service names starting with letter
    ];
    
    const isValidSender = senderPatterns.some(pattern => pattern.test(sender));
    if (!isValidSender) return false;
    
    // Message should contain actual content (not just numbers or symbols)
    if (message.length < 5) return false;
    
    // Exclude obvious non-messages
    const excludePatterns = [
      /^[\s\-_=+]*$/, // Only whitespace or symbols
      /^test\s*$/i, // Just "test"
      /^example/i, // Example text
      /^lorem\s+ipsum/i // Lorem ipsum
    ];
    
    const shouldExclude = excludePatterns.some(pattern => pattern.test(message));
    if (shouldExclude) return false;
    
    return true;
  }

  /**
   * Validate if sender and message look legitimate (stricter validation)
   */
  private static isValidMessage(sender: string, message: string): boolean {
    if (!sender || !message) return false;
    
    // Check sender format (should be phone number or service name)
    const hasValidSender = /(\+?\d{8,15}|[a-zA-Z]{2,})/.test(sender);
    
    // Check message content (should have some meaningful content)
    const hasValidMessage = message.length > 3 && !/^[\s\-_.*]+$/.test(message);
    
    return hasValidSender && hasValidMessage;
  }

  /**
   * Update proxy performance with 403 tracking
   */
  private static updateProxyPerformance(proxy: string, success: boolean, responseTime: number, httpStatus: number): void {
    const current = this.proxyPerformance.get(proxy) || { 
      successCount: 0, 
      failCount: 0, 
      avgResponseTime: 0,
      lastSuccess: 0,
      blocked403Count: 0
    };
    
    if (success) {
      current.successCount++;
      current.avgResponseTime = (current.avgResponseTime + responseTime) / 2;
      current.lastSuccess = Date.now();
    } else {
      current.failCount++;
      if (httpStatus === 403) {
        current.blocked403Count++;
      }
    }
    
    this.proxyPerformance.set(proxy, current);
  }

  /**
   * Enhanced cache management with failure rate tracking
   */
  private static setCachedProxy(url: string, proxy: string, failureRate: number): void {
    this.proxyCache.set(url, {
      proxy,
      timestamp: Date.now(),
      failureRate
    });
  }

  /**
   * Enhanced parsing and return with debug info
   */
  private static parseAndReturnEnhanced(html: string, startTime: number, debugInfo: ScrapeResult['debugInfo']): ScrapeResult {
    const messages = this.parseMessages(html);
    const totalTime = Date.now() - startTime;
    
    console.log(`Enhanced scraping completed. Found ${messages.length} messages in ${totalTime}ms using ${debugInfo?.fetchMethod}`);
    
    debugInfo!.responseTime = totalTime;
    
    return {
      success: true,
      messages,
      lastScrapedAt: new Date().toISOString(),
      debugInfo
    };
  }

  /**
   * Validate receive-sms-online.info URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === 'receive-sms-online.info' &&
        urlObj.pathname === '/private.php' &&
        urlObj.searchParams.has('phone') &&
        urlObj.searchParams.has('key')
      );
    } catch {
      return false;
    }
  }

  /**
   * Get cached proxy for a URL
   */
  private static getCachedProxy(url: string): { proxy: string; failureRate: number } | null {
    const cached = this.proxyCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < this.PROXY_CACHE_TTL) {
      return {
        proxy: cached.proxy,
        failureRate: cached.failureRate
      };
    }
    if (cached) {
      this.proxyCache.delete(url); // Remove expired cache
    }
    return null;
  }

  /**
   * Clear cached proxy for a URL
   */
  private static clearCachedProxy(url: string): void {
    this.proxyCache.delete(url);
  }

  /**
   * Get proxies sorted by performance (success rate and response time)
   */
  private static getSortedProxiesByPerformance(): string[] {
    return [...this.CORS_PROXIES].sort((a, b) => {
      const perfA = this.proxyPerformance.get(a);
      const perfB = this.proxyPerformance.get(b);
      
      // If no performance data, use original order
      if (!perfA && !perfB) return 0;
      if (!perfA) return 1;
      if (!perfB) return -1;
      
      // Calculate success rate
      const successRateA = perfA.successCount / (perfA.successCount + perfA.failCount);
      const successRateB = perfB.successCount / (perfB.successCount + perfB.failCount);
      
      // Sort by success rate first, then by response time
      if (successRateA !== successRateB) {
        return successRateB - successRateA; // Higher success rate first
      }
      
      return perfA.avgResponseTime - perfB.avgResponseTime; // Lower response time first
    });
  }

  /**
   * Fetch with mobile user agent as fallback
   */
  private static async fetchWithMobileUA(url: string, timeout: number): Promise<{ html: string; status: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      return { html, status: response.status };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse timestamp from various formats
   */
  private static parseTimestamp(timeText: string): string {
    if (!timeText.trim()) {
      return new Date().toISOString();
    }

    try {
      // Common patterns in receive-sms-online.info timestamps
      const patterns = [
        // "2024-01-15 14:30:25"
        /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,
        // "15.01.2024 14:30"
        /(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2})/,
        // "Jan 15, 2024 2:30 PM"
        /([A-Za-z]{3} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M)/,
        // "15/01/2024 14:30"
        /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/,
        // Just time "14:30:25"
        /(\d{2}:\d{2}:\d{2})/,
        // Just time "14:30"
        /(\d{2}:\d{2})/
      ];

      for (const pattern of patterns) {
        const match = timeText.match(pattern);
        if (match) {
          let dateStr = match[1];
          
          // Handle different formats
          if (dateStr.includes('.')) {
            // Convert "15.01.2024 14:30" to "2024-01-15 14:30"
            const parts = dateStr.split(' ');
            if (parts.length >= 1) {
              const datePart = parts[0].split('.');
              if (datePart.length === 3) {
                dateStr = `${datePart[2]}-${datePart[1]}-${datePart[0]}`;
                if (parts[1]) dateStr += ` ${parts[1]}`;
              }
            }
          } else if (dateStr.includes('/')) {
            // Convert "15/01/2024 14:30" to "2024-01-15 14:30"
            const parts = dateStr.split(' ');
            if (parts.length >= 1) {
              const datePart = parts[0].split('/');
              if (datePart.length === 3) {
                dateStr = `${datePart[2]}-${datePart[1]}-${datePart[0]}`;
                if (parts[1]) dateStr += ` ${parts[1]}`;
              }
            }
          } else if (dateStr.match(/^\d{2}:\d{2}/)) {
            // Just time, add today's date
            const today = new Date().toISOString().split('T')[0];
            dateStr = `${today} ${dateStr}`;
          }

          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        }
      }

      // Fallback: try to parse as-is
      const fallback = new Date(timeText);
      if (!isNaN(fallback.getTime())) {
        return fallback.toISOString();
      }

    } catch (error) {
      console.warn('Error parsing timestamp:', timeText, error);
    }

    // Ultimate fallback: current time
    return new Date().toISOString();
  }
} 