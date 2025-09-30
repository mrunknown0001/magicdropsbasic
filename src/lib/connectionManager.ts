/**
 * Enhanced ConnectionManager
 * 
 * This is a minimized version with additional functions to handle Supabase reconnections
 * which helps solve the loading state issues when switching between views
 */
class ConnectionManager {
  private static instance: ConnectionManager;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private knownChannels: Set<string> = new Set();
  private lastActivity: number = Date.now();
  
  private constructor() {
    console.log('ConnectionManager initialized - minimized version to prevent loading states');
    
    // Listen for visibility changes to improve reconnection handling
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Record when user is active
    window.addEventListener('mousemove', this.updateActivity);
    window.addEventListener('keydown', this.updateActivity);
    window.addEventListener('click', this.updateActivity);
    window.addEventListener('touchstart', this.updateActivity);
  }
  
  /**
   * Get the ConnectionManager instance (Singleton pattern)
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }
  
  // No-op methods that the app might be calling
  public checkConnectivity(): boolean {
    this.updateActivity();
    return navigator.onLine;
  }
  
  public triggerDataRefresh = (): void => {
    this.updateActivity();
    // Dispatch a visibility refresh event
    window.dispatchEvent(new CustomEvent('visibility-change-refresh'));
  };
  
  // New method to handle scheduled reconnects for channels
  public scheduleReconnect(channelId: string, delay: number = 5000): void {
    this.updateActivity();
    
    // Record this channel
    this.knownChannels.add(channelId);
    
    // Clear any existing timer for this channel
    if (this.reconnectTimers.has(channelId)) {
      clearTimeout(this.reconnectTimers.get(channelId)!);
    }
    
    console.log(`Scheduling reconnect for channel ${channelId} in ${delay}ms`);
    
    // Create a new timer
    const timer = setTimeout(() => {
      console.log(`Triggering reconnect for channel ${channelId}`);
      this.triggerReconnect(channelId);
      this.reconnectTimers.delete(channelId);
    }, delay);
    
    this.reconnectTimers.set(channelId, timer);
  }
  
  // Method to trigger a reconnect
  private triggerReconnect(channelId?: string): void {
    if (channelId) {
      // Trigger reconnect for a specific channel
      window.dispatchEvent(new CustomEvent('supabase-reconnect', { 
        detail: { channelId } 
      }));
    } else {
      // Trigger reconnect for all channels
      window.dispatchEvent(new CustomEvent('supabase-reconnect'));
    }
  }
  
  // Handler for visibility changes
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      // If tab was inactive for more than 1 minute
      if (timeSinceLastActivity > 60000) {
        console.log('Tab became visible after inactivity, triggering reconnect');
        
        // Trigger reconnect with a slight delay to allow tab to fully activate
        setTimeout(() => {
          // Reconnect all known channels
          this.knownChannels.forEach(channelId => {
            this.triggerReconnect(channelId);
          });
          
          // Also trigger a general data refresh
          this.triggerDataRefresh();
        }, 500);
      }
      
      this.updateActivity();
    }
  };
  
  // Update last activity timestamp
  private updateActivity = (): void => {
    this.lastActivity = Date.now();
  };
  
  public cleanup(): void {
    // Clean up all reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('mousemove', this.updateActivity);
    window.removeEventListener('keydown', this.updateActivity);
    window.removeEventListener('click', this.updateActivity);
    window.removeEventListener('touchstart', this.updateActivity);
  }
}

// Export singleton instance
export const connectionManager = ConnectionManager.getInstance();

export default connectionManager;
