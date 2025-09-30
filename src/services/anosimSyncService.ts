import { supabase } from '../lib/supabase';
import type { PhoneNumber, PhoneMessage } from '../types/database';

interface AnosimSyncResult {
  success: boolean;
  phoneNumberId: string;
  newMessagesCount: number;
  error?: string;
  debugInfo?: any;
}

interface AnosimSyncStats {
  totalPhoneNumbers: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalNewMessages: number;
  errors: string[];
  serviceAccessible: boolean;
  lastSyncTime: string;
}

export class AnosimSyncService {
  private static instance: AnosimSyncService;
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes for API-based sync
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly BATCH_SIZE = 5; // Can handle more since it's API-based
  private readonly STAGGER_DELAY_MS = 200; // Shorter delay for API calls

  // Enhanced tracking
  private lastSyncTimes = new Map<string, number>();
  private readonly MIN_SYNC_INTERVAL_MS = 30 * 1000; // 30s between same number syncs
  private failurePatterns = new Map<string, { count: number; lastFailure: number; reason: string }>();

  private constructor() {}

  static getInstance(): AnosimSyncService {
    if (!AnosimSyncService.instance) {
      AnosimSyncService.instance = new AnosimSyncService();
    }
    return AnosimSyncService.instance;
  }

  /**
   * Start automatic Anosim message syncing
   */
  startAutoSync(): void {
    if (this.isRunning) {
      console.log('[ANOSIM-SYNC] Anosim message sync is already running');
      return;
    }

    this.isRunning = true;
    console.log('[ANOSIM-SYNC] Starting automatic Anosim message sync...');

    // Run initial sync with delay
    setTimeout(() => {
      this.syncAllAnosimNumbers().catch(error => {
        console.error('[ANOSIM-SYNC] Initial sync failed:', error);
      });
    }, 3000);

    // Set up interval for regular syncing
    this.syncInterval = setInterval(() => {
      this.syncAllAnosimNumbers().catch(error => {
        console.error('[ANOSIM-SYNC] Scheduled sync failed:', error);
      });
    }, this.SYNC_INTERVAL_MS);

    console.log(`[ANOSIM-SYNC] Auto-sync started with ${this.SYNC_INTERVAL_MS / 1000}s interval`);
  }

  /**
   * Stop automatic message syncing
   */
  stopAutoSync(): void {
    if (!this.isRunning) {
      console.log('[ANOSIM-SYNC] Anosim message sync is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    console.log('[ANOSIM-SYNC] Stopped automatic Anosim message sync');
  }

  /**
   * Check if auto sync is running
   */
  isAutoSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Sync all Anosim phone numbers
   */
  async syncAllAnosimNumbers(): Promise<AnosimSyncStats> {
    console.log('[ANOSIM-SYNC] Starting sync of all Anosim phone numbers...');

    const stats: AnosimSyncStats = {
      totalPhoneNumbers: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalNewMessages: 0,
      errors: [],
      serviceAccessible: true,
      lastSyncTime: new Date().toISOString()
    };

    try {
      // Get all Anosim phone numbers
      const { data: phoneNumbers, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('provider', 'anosim')
        .eq('status', 'active')
        .not('order_booking_id', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch Anosim phone numbers: ${error.message}`);
      }

      if (!phoneNumbers || phoneNumbers.length === 0) {
        console.log('[ANOSIM-SYNC] No Anosim phone numbers found for syncing');
        return stats;
      }

      // Enhanced filtering with failure pattern consideration
      const now = Date.now();
      const phoneNumbersToSync = phoneNumbers.filter(phone => {
        const lastSync = this.lastSyncTimes.get(phone.id);
        const failurePattern = this.failurePatterns.get(phone.id);
        
        // Skip if synced recently
        if (lastSync && (now - lastSync) < this.MIN_SYNC_INTERVAL_MS) {
          console.log(`[ANOSIM-SYNC] Skipping ${phone.phone_number} - synced ${Math.round((now - lastSync) / 1000)}s ago`);
          return false;
        }
        
        // Skip if repeated failures with exponential backoff
        if (failurePattern && failurePattern.count > 3) {
          const backoffTime = Math.min(failurePattern.count * 60 * 1000, 15 * 60 * 1000); // Max 15 min for API
          if ((now - failurePattern.lastFailure) < backoffTime) {
            console.log(`[ANOSIM-SYNC] Skipping ${phone.phone_number} - in failure backoff (${failurePattern.count} failures)`);
            return false;
          }
        }
        
        return true;
      });

      stats.totalPhoneNumbers = phoneNumbers.length;
      console.log(`[ANOSIM-SYNC] Found ${phoneNumbers.length} Anosim numbers, ${phoneNumbersToSync.length} will be synced`);

      if (phoneNumbersToSync.length === 0) {
        console.log('[ANOSIM-SYNC] All Anosim numbers are in cooldown or backoff periods');
        return stats;
      }

      // Process phone numbers in batches
      const batches = this.createBatches(phoneNumbersToSync, this.BATCH_SIZE);
      console.log(`[ANOSIM-SYNC] Processing ${phoneNumbersToSync.length} Anosim numbers in ${batches.length} batches of ${this.BATCH_SIZE}`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[ANOSIM-SYNC] Processing batch ${i + 1}/${batches.length} with ${batch.length} phone numbers`);

        // Mark all as being synced
        batch.forEach(phone => this.lastSyncTimes.set(phone.id, now));

        // Process batch in parallel
        const batchPromises = batch.map(phone => this.syncAnosimPhoneNumber(phone));
        const batchResults = await Promise.allSettled(batchPromises);

        // Analyze batch results
        batchResults.forEach((result, index) => {
          const phone = batch[index];
          
          if (result.status === 'fulfilled') {
            const syncResult = result.value;
            if (syncResult.success) {
              stats.successfulSyncs++;
              stats.totalNewMessages += syncResult.newMessagesCount;
              // Clear failure pattern on success
              this.failurePatterns.delete(phone.id);
              console.log(`[ANOSIM-SYNC] ✓ ${phone.phone_number}: ${syncResult.newMessagesCount} new messages`);
            } else {
              stats.failedSyncs++;
              const errorMsg = `${phone.phone_number}: ${syncResult.error}`;
              stats.errors.push(errorMsg);
              
              // Track failure patterns
              this.trackFailure(phone.id, syncResult.error || 'Unknown error');
              console.log(`[ANOSIM-SYNC] ✗ ${errorMsg}`);
            }
          } else {
            stats.failedSyncs++;
            const errorMsg = `${phone.phone_number}: ${result.reason}`;
            stats.errors.push(errorMsg);
            this.trackFailure(phone.id, String(result.reason));
            console.log(`[ANOSIM-SYNC] ✗ ${errorMsg}`);
          }
        });

        // Stagger delay between batches
        if (i < batches.length - 1) {
          console.log(`[ANOSIM-SYNC] Waiting ${this.STAGGER_DELAY_MS}ms before next batch...`);
          await this.delay(this.STAGGER_DELAY_MS);
        }
      }

      // Log comprehensive results
      console.log('[ANOSIM-SYNC] Sync completed:');
      console.log(`- Total Anosim numbers: ${stats.totalPhoneNumbers}`);
      console.log(`- Successful syncs: ${stats.successfulSyncs}`);
      console.log(`- Failed syncs: ${stats.failedSyncs}`);
      console.log(`- New messages: ${stats.totalNewMessages}`);
      
      if (stats.errors.length > 0) {
        console.log('Errors encountered:');
        stats.errors.forEach(error => console.log(`  - ${error}`));
      }

      return stats;

    } catch (error) {
      console.error('[ANOSIM-SYNC] Error during sync:', error);
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      stats.serviceAccessible = false;
      return stats;
    }
  }

  /**
   * Sync individual Anosim phone number
   */
  async syncAnosimPhoneNumber(phoneNumber: PhoneNumber): Promise<AnosimSyncResult> {
    const result: AnosimSyncResult = {
      success: false,
      phoneNumberId: phoneNumber.id,
      newMessagesCount: 0
    };

    try {
      const bookingId = phoneNumber.order_booking_id || phoneNumber.rent_id;
      
      if (!bookingId) {
        throw new Error('No booking ID available for Anosim phone number');
      }

      console.log(`[ANOSIM-SYNC] Syncing messages for ${phoneNumber.phone_number} (booking: ${bookingId})`);
      
      // Call the backend sync endpoint
      const response = await fetch(`/api/phone/sync/anosim/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Sync API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        result.success = true;
        result.newMessagesCount = data.data?.newMessages || 0;
        console.log(`[ANOSIM-SYNC] ✓ Successfully synced ${result.newMessagesCount} messages for ${phoneNumber.phone_number}`);
      } else {
        throw new Error(data.message || 'Sync failed');
      }
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ANOSIM-SYNC] ✗ Failed to sync messages for ${phoneNumber.phone_number}:`, errorMessage);
      
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
   * Manually sync a specific Anosim phone number by ID
   */
  async syncAnosimPhoneNumberById(phoneNumberId: string): Promise<AnosimSyncResult> {
    try {
      const { data: phoneNumber, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('id', phoneNumberId)
        .eq('provider', 'anosim')
        .single();

      if (error) {
        throw new Error(`Failed to fetch Anosim phone number: ${error.message}`);
      }

      if (!phoneNumber) {
        throw new Error('Anosim phone number not found');
      }

      return await this.syncAnosimPhoneNumber(phoneNumber);

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
export const anosimSyncService = AnosimSyncService.getInstance();
