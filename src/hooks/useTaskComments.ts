import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskComment } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useTaskComments = (taskId: string) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Fetch comments for a specific task
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('task_comments')
          .select(`
            *,
            profiles:user_id (
              name,
              email
            )
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Transform the data to include user_name and user_email
        const transformedData = data.map((comment: any) => ({
          ...comment,
          user_name: comment.profiles ? `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim() : '',
          user_email: comment.profiles?.email || '',
          profiles: undefined // Remove the profiles object
        }));

        setComments(transformedData);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError(error as Error);
        toast.error('Fehler beim Laden der Kommentare');
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchComments();

      // Set up real-time subscription
      const subscription = supabase
        .channel(`task_comments:${taskId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        }, (payload: any) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the user data for the new comment
            const fetchUserData = async () => {
              const { data: userData } = await supabase
                .from('profiles')
                .select('name, email')
                .eq('id', payload.new.user_id)
                .single();

              const newComment = {
                ...payload.new,
                user_name: userData?.name || '',
                user_email: userData?.email || ''
              } as TaskComment;

              setComments(prev => [newComment, ...prev]);
            };
            fetchUserData();
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => 
              prev.map(comment => 
                comment.id === payload.new.id 
                  ? { ...comment, ...payload.new } 
                  : comment
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => 
              prev.filter(comment => comment.id !== payload.old.id)
            );
          }
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [taskId]);

  // Add a new comment
  const addComment = async (content: string) => {
    if (!user) {
      toast.error('Sie müssen angemeldet sein, um Kommentare hinzuzufügen');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // The new comment will be added via the real-time subscription
      toast.success('Kommentar hinzugefügt');
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Fehler beim Hinzufügen des Kommentars');
      throw error;
    }
  };

  // Update a comment
  const updateComment = async (commentId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .update({ content })
        .eq('id', commentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // The comment will be updated via the real-time subscription
      toast.success('Kommentar aktualisiert');
      return data;
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Fehler beim Aktualisieren des Kommentars');
      throw error;
    }
  };

  // Delete a comment
  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        throw error;
      }

      // The comment will be removed via the real-time subscription
      toast.success('Kommentar gelöscht');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Fehler beim Löschen des Kommentars');
      throw error;
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment
  };
};
