import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResult {
  success: boolean;
  file_path?: string;
  public_url?: string;
  error?: string;
  file_size?: number;
  file_type?: string;
}

export class ChatFileUploader {
  private static readonly BUCKET_NAME = 'chat-attachments';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    // Images
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4'
  ];

  // Validate file before upload
  static validateFile(file: File): { isValid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `Datei ist zu groß. Maximum: ${this.formatFileSize(this.MAX_FILE_SIZE)}` 
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Dateityp wird nicht unterstützt' 
      };
    }

    return { isValid: true };
  }

  // Upload file to Supabase Storage
  static async uploadFile(
    file: File, 
    conversationId: string, 
    userId: string
  ): Promise<FileUploadResult> {
    try {
      // Validate file first
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generate unique file path
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${conversationId}/${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        return { 
          success: false, 
          error: 'Upload fehlgeschlagen: ' + error.message 
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      // Generate thumbnail for images
      let thumbnailPath: string | undefined;
      if (file.type.startsWith('image/')) {
        thumbnailPath = await this.generateThumbnail(file, filePath, conversationId, userId);
      }

      return {
        success: true,
        file_path: filePath,
        public_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        ...(thumbnailPath && { thumbnail_path: thumbnailPath })
      };

    } catch (error) {
      console.error('File upload error:', error);
      return { 
        success: false, 
        error: 'Unerwarteter Fehler beim Upload' 
      };
    }
  }

  // Generate thumbnail for images
  private static async generateThumbnail(
    file: File, 
    originalPath: string, 
    conversationId: string, 
    userId: string
  ): Promise<string | undefined> {
    try {
      // Create canvas for thumbnail generation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;

      // Create image element
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);

      return new Promise((resolve) => {
        img.onload = async () => {
          // Calculate thumbnail dimensions (max 200x200)
          const maxSize = 200;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          // Set canvas size and draw thumbnail
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              resolve(undefined);
              return;
            }

            // Upload thumbnail
            const thumbnailPath = originalPath.replace(/\.[^/.]+$/, '_thumb.jpg');
            
            const { error } = await supabase.storage
              .from(this.BUCKET_NAME)
              .upload(thumbnailPath, blob, {
                cacheControl: '3600',
                upsert: false
              });

            if (error) {
              console.error('Thumbnail upload error:', error);
              resolve(undefined);
            } else {
              resolve(thumbnailPath);
            }
          }, 'image/jpeg', 0.8);

          // Clean up
          URL.revokeObjectURL(imageUrl);
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          resolve(undefined);
        };

        img.src = imageUrl;
      });

    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return undefined;
    }
  }

  // Delete file from storage
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('File deletion error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  // Get signed URL for private files
  static async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Signed URL error:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL error:', error);
      return null;
    }
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file type icon
  static getFileTypeIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType === 'text/plain') return '📃';
    return '📎';
  }

  // Check if file type is previewable
  static isPreviewable(fileType: string): boolean {
    return (
      fileType.startsWith('image/') ||
      fileType === 'application/pdf' ||
      fileType === 'text/plain'
    );
  }

  // Create file preview URL
  static async createPreviewUrl(filePath: string, fileType: string): Promise<string | null> {
    if (!this.isPreviewable(fileType)) return null;

    try {
      // For images, we can use the public URL directly
      if (fileType.startsWith('image/')) {
        const { data } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(filePath);
        return data.publicUrl;
      }

      // For other file types, use signed URL
      return await this.getSignedUrl(filePath);
    } catch (error) {
      console.error('Preview URL error:', error);
      return null;
    }
  }

  // Ensure storage bucket exists
  static async ensureBucketExists(): Promise<boolean> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false, // Private bucket for security
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });

        if (error) {
          console.error('Bucket creation error:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Bucket check error:', error);
      return false;
    }
  }
}
