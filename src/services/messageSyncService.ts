import { supabase } from '../lib/supabase';
import { ReceiveSmsOnlineScraper } from './receiveSmsOnlineScraper';
import type { PhoneNumber, PhoneMessage } from '../types/database';

interface SyncResult {
  success: boolean;
  phoneNumberId: string;
  newMessagesCount: number;
  error?: string;
  debugInfo?: any;
}

interface SyncStats {
  totalPhoneNumbers: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalNewMessages: number;
  errors: string[];
  serviceAccessible: boolean;
  lastSyncTime: string;
}

export class MessageSyncService {
  private static instance: MessageSyncService;
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 3 * 60 * 1000; // Increased from 2 to 3 minutes to be more gentle
  private readonly MAX_RETRIES = 1; // Reduced from 2 to 1 to avoid overwhelming
  private readonly RETRY_DELAY_MS = 2000; // Increased from 1000ms to 2000ms
  private readonly BATCH_SIZE = 3; // Reduced from 5 to 3 phone numbers concurrently
  private readonly STAGGER_DELAY_MS = 500; // Increased from 200ms to 500ms delay between batches

  // Enhanced tracking with failure patterns
  private lastSyncTimes = new Map<string, number>();
  private readonly MIN_SYNC_INTERVAL_MS = 60 * 1000; // Increased from 30s to 60s between same number syncs
  private failurePatterns = new Map<string, { count: number; lastFailure: number; reason: string }>();

  private constructor() {}

  static getInstance(): MessageSyncService {
    if (!MessageSyncService.instance) {
      MessageSyncService.instance = new MessageSyncService();
    }
    return MessageSyncService.instance;
  }

  /**
   * Start automatic message syncing with enhanced logging
   */
  startAutoSync(): void {
    if (this.isRunning) {
      console.log('Enhanced message sync is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting enhanced automatic message sync...');

    // Run initial sync with delay to allow system to stabilize
    setTimeout(() => {
      this.syncAllPhoneNumbers().catch(error => {
        console.error('Initial enhanced sync failed:', error);
      });
    }, 5000);

    // Set up interval for regular syncing
    this.syncInterval = setInterval(() => {
      this.syncAllPhoneNumbers().catch(error => {
        console.error('Scheduled enhanced sync failed:', error);
      });
    }, this.SYNC_INTERVAL_MS);

    console.log(`Enhanced auto-sync started with ${this.SYNC_INTERVAL_MS / 1000}s interval`);
  }

  /**
   * Stop automatic message syncing
   */
  stopAutoSync(): void {
    if (!this.isRunning) {
      console.log('Message sync is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    console.log('Stopped automatic message sync');
  }

  /**
   * Check if auto sync is running
   */
  isAutoSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Enhanced sync with better error tracking and debugging
   */
  async syncAllPhoneNumbers(): Promise<SyncStats> {
    console.log('Starting enhanced sync of all receive-sms-online.info phone numbers...');

    const stats: SyncStats = {
      totalPhoneNumbers: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalNewMessages: 0,
      errors: [],
      serviceAccessible: true,
      lastSyncTime: new Date().toISOString()
    };

    try {
      // Get all receive-sms-online.info phone numbers
      const { data: phoneNumbers, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('provider', 'receive_sms_online')
        .eq('status', 'active')
        .not('external_url', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch phone numbers: ${error.message}`);
      }

      if (!phoneNumbers || phoneNumbers.length === 0) {
        console.log('No receive-sms-online.info phone numbers found for syncing');
        return stats;
      }

      // Enhanced filtering with failure pattern consideration
      const now = Date.now();
      const phoneNumbersToSync = phoneNumbers.filter(phone => {
        const lastSync = this.lastSyncTimes.get(phone.id);
        const failurePattern = this.failurePatterns.get(phone.id);
        
        // Skip if synced recently
        if (lastSync && (now - lastSync) < this.MIN_SYNC_INTERVAL_MS) {
          console.log(`Skipping ${phone.phone_number} - synced ${Math.round((now - lastSync) / 1000)}s ago`);
          return false;
        }
        
        // Skip if repeated failures with exponential backoff
        if (failurePattern && failurePattern.count > 3) {
          const backoffTime = Math.min(failurePattern.count * 60 * 1000, 30 * 60 * 1000); // Max 30 min
          if ((now - failurePattern.lastFailure) < backoffTime) {
            console.log(`Skipping ${phone.phone_number} - in failure backoff (${failurePattern.count} failures)`);
            return false;
          }
        }
        
        return true;
      });

      stats.totalPhoneNumbers = phoneNumbers.length;
      console.log(`Found ${phoneNumbers.length} phone numbers, ${phoneNumbersToSync.length} will be synced`);

      if (phoneNumbersToSync.length === 0) {
        console.log('All phone numbers are in cooldown or backoff periods');
        return stats;
      }

      // Process phone numbers in smaller batches with enhanced monitoring
      const batches = this.createBatches(phoneNumbersToSync, this.BATCH_SIZE);
      console.log(`Processing ${phoneNumbersToSync.length} phone numbers in ${batches.length} batches of ${this.BATCH_SIZE}`);

      let firstBatchServiceCheck = true;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing enhanced batch ${i + 1}/${batches.length} with ${batch.length} phone numbers`);

        // Mark all as being synced
        batch.forEach(phone => this.lastSyncTimes.set(phone.id, now));

        // Process batch in parallel with enhanced error tracking
        const batchPromises = batch.map(phone => this.syncPhoneNumberMessages(phone));
        const batchResults = await Promise.allSettled(batchPromises);

        // Analyze batch results for service accessibility
        batchResults.forEach((result, index) => {
          const phone = batch[index];
          
          if (result.status === 'fulfilled') {
            const syncResult = result.value;
            if (syncResult.success) {
              stats.successfulSyncs++;
              stats.totalNewMessages += syncResult.newMessagesCount;
              // Clear failure pattern on success
              this.failurePatterns.delete(phone.id);
              console.log(`✓ ${phone.phone_number}: ${syncResult.newMessagesCount} new messages`);
            } else {
              stats.failedSyncs++;
              const errorMsg = `${phone.phone_number}: ${syncResult.error}`;
              stats.errors.push(errorMsg);
              
              // Track failure patterns
              this.trackFailure(phone.id, syncResult.error || 'Unknown error');
              
              // Check if it's a service accessibility issue
              if (syncResult.debugInfo && !syncResult.debugInfo.serviceAccessible) {
                stats.serviceAccessible = false;
                if (firstBatchServiceCheck) {
                  console.warn('⚠️ Service accessibility issue detected - may affect all numbers');
                  firstBatchServiceCheck = false;
                }
              }
              
              console.log(`✗ ${errorMsg}`);
            }
          } else {
            stats.failedSyncs++;
            const errorMsg = `${phone.phone_number}: ${result.reason}`;
            stats.errors.push(errorMsg);
            this.trackFailure(phone.id, String(result.reason));
            console.log(`✗ ${errorMsg}`);
          }
        });

        // Enhanced stagger delay between batches
        if (i < batches.length - 1) {
          const delayTime = stats.serviceAccessible ? this.STAGGER_DELAY_MS : this.STAGGER_DELAY_MS * 2;
          console.log(`Waiting ${delayTime}ms before next batch...`);
          await this.delay(delayTime);
        }
      }

      // Log comprehensive results
      console.log('Enhanced sync completed:');
      console.log(`- Total numbers: ${stats.totalPhoneNumbers}`);
      console.log(`- Successful syncs: ${stats.successfulSyncs}`);
      console.log(`- Failed syncs: ${stats.failedSyncs}`);
      console.log(`- New messages: ${stats.totalNewMessages}`);
      console.log(`- Service accessible: ${stats.serviceAccessible}`);
      
      if (stats.errors.length > 0) {
        console.log('Errors encountered:');
        stats.errors.forEach(error => console.log(`  - ${error}`));
      }

      return stats;

    } catch (error) {
      console.error('Error during enhanced sync:', error);
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      stats.serviceAccessible = false;
      return stats;
    }
  }

  /**
   * Create batches from an array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Enhanced phone number sync with detailed debugging
   */
  async syncPhoneNumberMessages(phoneNumber: PhoneNumber): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      phoneNumberId: phoneNumber.id,
      newMessagesCount: 0
    };

    try {
      if (!phoneNumber.external_url) {
        throw new Error('No external URL configured for phone number');
      }

      console.log(`Syncing messages for ${phoneNumber.phone_number}...`);
      
      // Use enhanced scraper
      const scrapeResult = await this.scrapeWithRetry(phoneNumber.external_url, this.MAX_RETRIES);
      
      result.debugInfo = scrapeResult.debugInfo;
      
      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error || 'Scraping failed');
      }

      if (scrapeResult.messages.length === 0) {
        console.log(`No messages found for ${phoneNumber.phone_number}`);
        result.success = true;
        return result;
      }

      // Get existing messages to avoid duplicates
      const { data: existingMessages, error: fetchError } = await supabase
        .from('phone_messages')
        .select('sender, message, received_at')
        .eq('phone_number_id', phoneNumber.id);

      if (fetchError) {
        throw new Error(`Failed to fetch existing messages: ${fetchError.message}`);
      }

      // Filter out duplicates with enhanced matching
      const newMessages = scrapeResult.messages.filter(scraped => {
        return !existingMessages?.some(existing => 
          existing.sender === scraped.sender && 
          existing.message === scraped.message &&
          Math.abs(new Date(existing.received_at).getTime() - new Date(scraped.received_at).getTime()) < 60000 // Within 1 minute
        );
      });

      if (newMessages.length === 0) {
        console.log(`No new messages for ${phoneNumber.phone_number} (${scrapeResult.messages.length} scraped, all duplicates)`);
        result.success = true;
        return result;
      }

      // Insert new messages
      const messagesToInsert = newMessages.map(msg => ({
        phone_number_id: phoneNumber.id,
        sender: msg.sender,
        message: msg.message,
        received_at: msg.received_at,
        message_source: 'scraping' as const,
        raw_html: msg.raw_html
      }));

      const { error: insertError } = await supabase
        .from('phone_messages')
        .insert(messagesToInsert);

      if (insertError) {
        throw new Error(`Failed to insert messages: ${insertError.message}`);
      }

      // Update phone number last scraped time
      const { error: updateError } = await supabase
        .from('phone_numbers')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', phoneNumber.id);

      if (updateError) {
        console.warn(`Failed to update last_scraped_at for ${phoneNumber.phone_number}:`, updateError);
      }

      console.log(`✓ Successfully synced ${newMessages.length} new messages for ${phoneNumber.phone_number}`);
      
      result.success = true;
      result.newMessagesCount = newMessages.length;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to sync messages for ${phoneNumber.phone_number}:`, errorMessage);
      
      result.error = errorMessage;
      return result;
    }
  }

  /**
   * Track failure patterns for exponential backoff
   */
  private trackFailure(phoneId: string, reason: string): void {
    const current = this.failurePatterns.get(phoneId) || { count: 0, lastFailure: 0, reason: '' };
    current.count++;
    current.lastFailure = Date.now();
    current.reason = reason;
    this.failurePatterns.set(phoneId, current);
  }

  /**
   * Enhanced scraping with retry logic
   */
  private async scrapeWithRetry(url: string, retries = this.MAX_RETRIES): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`Scraping attempt ${attempt}/${retries + 1} for URL`);
        const result = await ReceiveSmsOnlineScraper.scrapeMessages(url);
        
        if (result.success) {
          if (attempt > 1) {
            console.log(`Scraping succeeded on attempt ${attempt}`);
          }
          return result;
        } else {
          throw new Error(result.error || 'Scraping returned unsuccessful result');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Scraping attempt ${attempt} failed:`, lastError.message);
        
        if (attempt <= retries) {
          const delay = this.RETRY_DELAY_MS * attempt; // Linear backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics
   */
  getSyncInfo(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.SYNC_INTERVAL_MS
    };
  }

  /**
   * Manually sync a specific phone number by ID
   */
  async syncPhoneNumberById(phoneNumberId: string): Promise<SyncResult> {
    try {
      const { data: phoneNumber, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('id', phoneNumberId)
        .eq('provider', 'receive_sms_online')
        .single();

      if (error) {
        throw new Error(`Failed to fetch phone number: ${error.message}`);
      }

      if (!phoneNumber) {
        throw new Error('Phone number not found or not a receive-sms-online.info number');
      }

      return await this.syncPhoneNumberMessages(phoneNumber);

    } catch (error) {
      return {
        success: false,
        phoneNumberId,
        newMessagesCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

  // Export singleton instance
  export const messageSyncService = MessageSyncService.getInstance(); 