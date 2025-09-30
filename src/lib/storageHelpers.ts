import { supabase } from './supabase';

/**
 * Ensures that a directory exists in a Supabase Storage bucket
 * @param bucket The bucket name
 * @param path The directory path
 */
export const ensureDirectoryExists = async (bucket: string, path: string): Promise<void> => {
  try {
    // Try to directly upload a .keep file to create the directory without checking first
    // This approach bypasses the need to list the directory which requires additional permissions
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(`${path}/.keep`, new Blob([''], { type: 'text/plain' }), {
        upsert: true // Use upsert to avoid conflicts if file already exists
      });
    
    if (uploadError && uploadError.message !== 'The resource already exists') {
      console.error(`Error creating directory ${path} in bucket ${bucket}:`, uploadError);
      // We'll log the error but continue execution - don't throw
      console.log(`Proceeding despite directory creation error`);
    } else {
      console.log(`Ensured directory ${path} exists in bucket ${bucket}`);
    }
  } catch (error) {
    console.error('Error in ensureDirectoryExists:', error);
    // Log error but don't throw - allow operation to continue
  }
};

/**
 * Ensures that the KYC documents directory exists for the current user
 * @param userId The user ID
 */
export const ensureKycDirectoryExists = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    await ensureDirectoryExists('kyc_documents', userId);
  } catch (error) {
    console.error('Error ensuring KYC directory exists:', error);
    // Continue anyway - we'll attempt to upload even if directory creation fails
  }
}; 