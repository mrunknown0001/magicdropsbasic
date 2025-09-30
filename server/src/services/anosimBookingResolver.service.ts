import { anosimService } from './anosim.service';
import { supabase } from '../lib/supabase';

/**
 * Anosim Booking ID Resolver Service
 * Handles the complexity of Anosim's Order ID vs Booking ID system
 */

export interface AnosimBookingInfo {
  orderId: string;
  bookingId: string;
  phoneNumber: string;
  isActive: boolean;
  endDate: string;
}

export class AnosimBookingResolver {
  
  /**
   * Resolve the correct booking ID for a phone number
   * This handles the Order ID vs Booking ID confusion
   */
  static async resolveBookingId(phoneNumber: string, storedOrderId?: string): Promise<AnosimBookingInfo | null> {
    try {
      console.log(`[ANOSIM-RESOLVER] Resolving booking ID for phone: ${phoneNumber}, stored order: ${storedOrderId}`);
      
      // Get all orders from Anosim API
      const orders = await anosimService.getOrders();
      
      if (!Array.isArray(orders)) {
        console.log('[ANOSIM-RESOLVER] No orders found in API');
        return null;
      }
      
      // Find the order that contains our phone number
      for (const order of orders) {
        if (order.orderBookings && Array.isArray(order.orderBookings)) {
          for (const booking of order.orderBookings) {
            if (booking.simCard?.phoneNumber === phoneNumber || booking.number === phoneNumber) {
              console.log(`[ANOSIM-RESOLVER] Found booking for ${phoneNumber}:`);
              console.log(`  - Order ID: ${order.id}`);
              console.log(`  - Booking ID: ${booking.id}`);
              console.log(`  - State: ${booking.state}`);
              console.log(`  - End Date: ${booking.endDate}`);
              
              return {
                orderId: order.id.toString(),
                bookingId: booking.id.toString(),
                phoneNumber: phoneNumber,
                isActive: booking.state === 'Active',
                endDate: booking.endDate
              };
            }
          }
        }
      }
      
      console.log(`[ANOSIM-RESOLVER] No booking found for phone ${phoneNumber}`);
      return null;
      
    } catch (error: any) {
      console.error('[ANOSIM-RESOLVER] Error resolving booking ID:', error.message);
      return null;
    }
  }
  
  /**
   * Update database record with correct booking information
   */
  static async updateDatabaseRecord(phoneNumberId: string, bookingInfo: AnosimBookingInfo): Promise<boolean> {
    try {
      console.log(`[ANOSIM-RESOLVER] Updating database record ${phoneNumberId} with booking info`);
      
      const { error } = await supabase
        .from('phone_numbers')
        .update({
          order_id: bookingInfo.orderId,
          order_booking_id: bookingInfo.bookingId,
          external_url: bookingInfo.bookingId, // For compatibility
          rent_id: bookingInfo.bookingId,      // For compatibility
          status: bookingInfo.isActive ? 'active' : 'expired',
          end_date: bookingInfo.endDate
        })
        .eq('id', phoneNumberId);
      
      if (error) {
        console.error('[ANOSIM-RESOLVER] Database update error:', error);
        return false;
      }
      
      console.log('[ANOSIM-RESOLVER] ✅ Database record updated successfully');
      return true;
      
    } catch (error: any) {
      console.error('[ANOSIM-RESOLVER] Error updating database:', error.message);
      return false;
    }
  }
  
  /**
   * Comprehensive sync for an Anosim phone number
   * Resolves booking ID and syncs messages
   */
  static async syncPhoneNumber(phoneNumber: string, phoneNumberId: string): Promise<{
    success: boolean;
    newMessages: number;
    bookingInfo?: AnosimBookingInfo;
    error?: string;
  }> {
    try {
      console.log(`[ANOSIM-RESOLVER] Starting comprehensive sync for ${phoneNumber}`);
      
      // Step 1: Resolve correct booking ID
      const bookingInfo = await this.resolveBookingId(phoneNumber);
      
      if (!bookingInfo) {
        return {
          success: false,
          newMessages: 0,
          error: 'Could not resolve booking ID for phone number'
        };
      }
      
      if (!bookingInfo.isActive) {
        return {
          success: false,
          newMessages: 0,
          bookingInfo,
          error: 'Booking is not active'
        };
      }
      
      // Step 2: Update database with correct booking info
      await this.updateDatabaseRecord(phoneNumberId, bookingInfo);
      
      // Step 3: Get and transform messages
      const smsResponse = await anosimService.getSms(bookingInfo.bookingId);
      const transformedMessages = anosimService.transformSmsToMessages(smsResponse);
      
      if (transformedMessages.length === 0) {
        return {
          success: true,
          newMessages: 0,
          bookingInfo,
          error: 'No messages found for this booking'
        };
      }
      
      // Step 4: Check for existing messages
      const { data: existingMessages } = await supabase
        .from('phone_messages')
        .select('sender, message, received_at')
        .eq('phone_number_id', phoneNumberId);
      
      // Step 5: Filter duplicates and insert new messages
      const newMessages = transformedMessages.filter(newMsg => {
        const isDuplicate = existingMessages?.some(existing => 
          existing.sender === newMsg.sender && 
          existing.message === newMsg.message
        );
        return !isDuplicate;
      });
      
      if (newMessages.length > 0) {
        const messagesToInsert = newMessages.map(msg => ({
          phone_number_id: phoneNumberId,
          sender: msg.sender,
          message: msg.message,
          received_at: msg.received_at,
          message_source: 'api'
        }));
        
        const { error: insertError } = await supabase
          .from('phone_messages')
          .insert(messagesToInsert);
        
        if (insertError) {
          throw new Error(`Failed to insert messages: ${insertError.message}`);
        }
        
        // Update timestamp
        await supabase
          .from('phone_numbers')
          .update({ 
            updated_at: new Date().toISOString(),
            last_message_check: new Date().toISOString()
          })
          .eq('id', phoneNumberId);
      }
      
      console.log(`[ANOSIM-RESOLVER] ✅ Sync completed: ${newMessages.length} new messages`);
      
      return {
        success: true,
        newMessages: newMessages.length,
        bookingInfo
      };
      
    } catch (error: any) {
      console.error('[ANOSIM-RESOLVER] Comprehensive sync error:', error.message);
      return {
        success: false,
        newMessages: 0,
        error: error.message
      };
    }
  }
}

// Note: getOrders method has been added to anosim.service.ts
