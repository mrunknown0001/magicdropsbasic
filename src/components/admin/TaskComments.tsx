import React, { useState } from 'react';
import { useTaskComments } from '../../hooks/useTaskComments';
import TaskCommentItem from './TaskCommentItem';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Send } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const { comments, loading, error, addComment, updateComment, deleteComment } = useTaskComments(taskId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newComment.trim() === '') return;
    
    setIsSubmitting(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Kommentare</h3>
      
      {/* Add new comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Schreiben Sie einen Kommentar..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            leftIcon={<Send size={16} />}
            isLoading={isSubmitting}
            disabled={newComment.trim() === '' || isSubmitting}
          >
            Kommentar senden
          </Button>
        </div>
      </form>
      
      {/* Comments list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600 dark:text-red-400">
            Fehler beim Laden der Kommentare. Bitte versuchen Sie es später erneut.
          </div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Keine Kommentare vorhanden. Sei der Erste, der einen Kommentar hinterlässt!
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <TaskCommentItem
                  comment={comment}
                  onUpdate={updateComment}
                  onDelete={deleteComment}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskComments;
