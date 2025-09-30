import React, { useState } from 'react';
import { MessageSquare, Edit2, Trash2, Send, X, Save } from 'lucide-react';
import { TaskComment } from '../../types/database';
import Button from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

interface TaskCommentsListProps {
  comments: TaskComment[];
  onAddComment: (content: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
}

const TaskCommentsList: React.FC<TaskCommentsListProps> = ({
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  isLoading = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (comment: TaskComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    
    try {
      setSubmitting(true);
      await onUpdateComment(commentId, editContent.trim());
      setEditingId(null);
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Kommentar löschen möchten?')) {
      try {
        await onDeleteComment(commentId);
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      console.error('Invalid date format:', dateString);
      return dateString;
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-pulse flex justify-center">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <p className="mt-2">Kommentare werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment form */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Kommentar hinzufügen..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!newComment.trim() || submitting}
        >
          <Send size={16} />
        </Button>
      </form>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="py-4 text-center text-gray-500 dark:text-gray-400">
          <MessageSquare size={24} className="mx-auto text-gray-400 mb-2" />
          <p>Keine Kommentare vorhanden</p>
        </div>
      ) : (
        <motion.div 
          className="space-y-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div 
                key={comment.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                variants={item}
                layout
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
                      {comment.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {comment.user_name || 'Unbekannter Benutzer'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {user?.id === comment.user_id && (
                    <div className="flex space-x-1">
                      {editingId !== comment.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(comment)}
                            title="Bearbeiten"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comment.id)}
                            title="Löschen"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {editingId === comment.id ? (
                  <div className="mt-2">
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      disabled={submitting}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        <X size={14} className="mr-1" />
                        Abbrechen
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editContent.trim() || submitting}
                      >
                        <Save size={14} className="mr-1" />
                        Speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default TaskCommentsList;
