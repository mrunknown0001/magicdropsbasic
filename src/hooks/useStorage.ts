import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { retryOperation } from '../utils/apiUtils';

export interface FileObject {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  task_id?: string;
  user_id?: string;
}

export const useStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Upload file to Supabase Storage
  const uploadFile = useCallback(async (
    file: File,
    bucket: string,
    folder: string,
    metadata: Record<string, string> = {}
  ): Promise<FileObject | null> => {
    if (!file) {
      toast.error('Keine Datei zum Hochladen ausgewählt');
      return null;
    }

    try {
      setUploading(true);
      setError(null);

      // Create a unique file name to prevent collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload file to Supabase Storage with retry mechanism
      const { data, error } = await retryOperation(async () => {
        return await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
            duplex: 'half',
            metadata
          });
      });

      if (error) throw error;

      if (!data) {
        throw new Error('Upload failed: No data returned');
      }

      // Get the public URL for the file
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for file');
      }

      const fileObject: FileObject = {
        id: data.path,
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
        created_at: new Date().toISOString(),
        ...metadata
      };

      toast.success('Datei erfolgreich hochgeladen');
      return fileObject;
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Hochladen der Datei';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast.error(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  // Download file from Supabase Storage
  const downloadFile = useCallback(async (
    bucket: string,
    filePath: string
  ): Promise<void> => {
    try {
      setError(null);

      const { data, error } = await retryOperation(async () => {
        return await supabase.storage
          .from(bucket)
          .download(filePath);
      });

      if (error) throw error;

      if (!data) {
        throw new Error('Download failed: No data returned');
      }

      // Create a URL for the downloaded file
      const url = URL.createObjectURL(data);
      
      // Create an anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Datei wird heruntergeladen');
    } catch (err) {
      console.error('Error downloading file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Herunterladen der Datei';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast.error(errorMessage);
    }
  }, []);

  // Delete file from Supabase Storage
  const deleteFile = useCallback(async (
    bucket: string,
    filePath: string
  ): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await retryOperation(async () => {
        return await supabase.storage
          .from(bucket)
          .remove([filePath]);
      });

      if (error) throw error;

      toast.success('Datei erfolgreich gelöscht');
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Löschen der Datei';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast.error(errorMessage);
      return false;
    }
  }, []);

  // List files in a bucket/folder
  const listFiles = useCallback(async (
    bucket: string,
    folder: string = ''
  ): Promise<FileObject[]> => {
    try {
      setError(null);

      const { data, error } = await retryOperation(async () => {
        return await supabase.storage
          .from(bucket)
          .list(folder, {
            sortBy: { column: 'created_at', order: 'desc' }
          });
      });

      if (error) throw error;

      if (!data) {
        return [];
      }

      // Get public URLs for all files
      const fileObjects = await Promise.all(
        data
          .filter(item => !item.id.endsWith('/')) // Filter out folders
          .map(async (item) => {
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(folder ? `${folder}/${item.name}` : item.name);

            return {
              id: item.id,
              name: item.name,
              size: item.metadata?.size || 0,
              type: item.metadata?.mimetype || '',
              url: urlData.publicUrl,
              created_at: item.created_at
            } as FileObject;
          })
      );

      return fileObjects;
    } catch (err) {
      console.error('Error listing files:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Auflisten der Dateien';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast.error(errorMessage);
      return [];
    }
  }, []);

  return {
    uploading,
    error,
    uploadFile,
    downloadFile,
    deleteFile,
    listFiles
  };
};
