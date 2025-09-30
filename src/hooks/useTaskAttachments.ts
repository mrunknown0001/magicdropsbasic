import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStorage } from './useStorage';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { retryOperation } from '../utils/apiUtils';

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  storage_bucket: string;
  public_url: string;
  created_at: string;
  updated_at: string;
  attachment_type?: string;
}

export const useTaskAttachments = (taskId?: string) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { uploadFile, downloadFile, deleteFile } = useStorage();

  const BUCKET_NAME = 'task-attachments';

  // Fetch attachments for a specific task
  const fetchAttachments = useCallback(async (id?: string) => {
    const targetTaskId = id || taskId;
    if (!targetTaskId) {
      console.error('No task ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First get the task_id from task_assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('id', targetTaskId)
        .single();

      if (assignmentError) throw assignmentError;
      if (!assignmentData?.task_id) throw new Error('Task ID not found in assignment');

      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('task_attachments')
          .select('*')
          .eq('task_id', assignmentData.task_id)
          .order('created_at', { ascending: false });
      });

      if (error) throw error;
      setAttachments(data as TaskAttachment[]);
    } catch (err) {
      console.error('Error fetching task attachments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch attachments'));
      toast.error('Fehler beim Laden der Anhänge');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Upload a file and create an attachment record
  const uploadTaskAttachment = useCallback(async (file: File, assignmentId: string, attachmentType?: string) => {
    if (!user) {
      toast.error('Sie müssen angemeldet sein, um Dateien hochzuladen');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // First get the actual task_id from the task_assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) {
        console.error('Error getting task assignment:', assignmentError);
        throw new Error('Fehler beim Abrufen der Aufgabenzuweisung');
      }

      if (!assignmentData || !assignmentData.task_id) {
        throw new Error('Aufgabe nicht gefunden');
      }

      const actualTaskId = assignmentData.task_id;

      // Create folder structure: user_id/task_id/
      const folder = `${user.id}/${assignmentId}`;

      // Upload file to storage
      const fileObject = await uploadFile(file, BUCKET_NAME, folder, {
        task_id: actualTaskId,
        user_id: user.id
      });

      if (!fileObject) {
        throw new Error('Datei konnte nicht hochgeladen werden');
      }

      // Create metadata record in the database - use the actual task_id from the assignment
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('task_attachments')
          .insert([{
            task_id: actualTaskId, // Use the actual task_id here, not the assignment_id
            user_id: user.id,
            file_name: file.name,
            file_path: fileObject.id,
            file_type: file.type,
            file_size: file.size,
            storage_bucket: BUCKET_NAME,
            public_url: fileObject.url
          }])
          .select()
          .single();
      });

      if (error) throw error;

      // Add the attachment type to the returned object for UI purposes
      const resultWithType = {...data, attachment_type: attachmentType} as TaskAttachment;

      // Refresh the attachments list
      await fetchAttachments(assignmentId);

      return resultWithType;
    } catch (err) {
      console.error('Error uploading task attachment:', err);
      setError(err instanceof Error ? err : new Error('Failed to upload attachment'));
      toast.error('Fehler beim Hochladen des Anhangs');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, uploadFile, fetchAttachments]);

  // Download an attachment
  const downloadTaskAttachment = useCallback(async (attachment: TaskAttachment) => {
    try {
      await downloadFile(BUCKET_NAME, attachment.file_path);
    } catch (err) {
      console.error('Error downloading task attachment:', err);
      toast.error('Fehler beim Herunterladen des Anhangs');
    }
  }, [downloadFile]);

  // Delete an attachment
  const deleteTaskAttachment = useCallback(async (attachment: TaskAttachment) => {
    try {
      setLoading(true);
      setError(null);

      // Delete file from storage
      const deleted = await deleteFile(BUCKET_NAME, attachment.file_path);
      if (!deleted) {
        throw new Error('Datei konnte nicht gelöscht werden');
      }

      // Delete metadata record from database
      const { error } = await retryOperation(async () => {
        return await supabase
          .from('task_attachments')
          .delete()
          .eq('id', attachment.id);
      });

      if (error) throw error;

      // Refresh the attachments list
      await fetchAttachments(taskId);
      toast.success('Anhang erfolgreich gelöscht');
      return true;
    } catch (err) {
      console.error('Error deleting task attachment:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete attachment'));
      toast.error('Fehler beim Löschen des Anhangs');
      return false;
    } finally {
      setLoading(false);
    }
  }, [deleteFile, fetchAttachments, taskId]);

  // Initialize by fetching attachments if taskId is provided
  useState(() => {
    if (taskId) {
      fetchAttachments();
    }
  });

  return {
    attachments,
    loading,
    error,
    fetchAttachments,
    uploadTaskAttachment,
    downloadTaskAttachment,
    deleteTaskAttachment
  };
};
