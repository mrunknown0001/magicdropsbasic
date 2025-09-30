import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

/**
 * Utility function to fetch a user profile with retry logic and timeout handling
 * @param userId The user ID to fetch the profile for
 * @returns The user profile
 */
export const fetchProfileWithRetry = async (userId: string): Promise<Profile> => {
  console.log('Fetching profile for user:', userId);
  
  // Create a timeout promise to handle cases where the fetch hangs
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timed out')), 10000);
  });
  
  try {
    // Use Promise.race to handle potential timeouts
    const fetchPromise = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No profile found for user:', userId);
        throw new Error('No profile found');
      }
      
      return data as Profile;
    };
    
    // Try up to 3 times with exponential backoff
    let attempt = 0;
    let lastError: any;
    
    while (attempt < 3) {
      try {
        const result = await Promise.race([fetchPromise(), timeoutPromise]);
        console.log('Profile fetched successfully:', result);
        return result as Profile;
      } catch (error) {
        lastError = error;
        console.warn(`Profile fetch attempt ${attempt + 1} failed:`, error);
        attempt++;
        
        // Wait before retrying (exponential backoff)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    // If we get here, all attempts failed
    console.error('All profile fetch attempts failed:', lastError);
    throw lastError;
  } catch (error) {
    console.error('Profile fetch failed or timed out:', error);
    throw error;
  }
};
