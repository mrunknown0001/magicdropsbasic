import React, { useState } from 'react';
import { TaskComment } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { Edit, Trash2, Save, X } from 'lucide-react';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TaskCommentItemProps {
  comment: TaskComment;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TaskCommentItem: React.FC<TaskCommentItemProps> = ({
  comment,
  onUpdate,
  onDelete
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isLoading, setIsLoading] = useState(false);
  
  const isOwner = user?.id === comment.user_id;
  
  const handleUpdate = async () => {
    if (editContent.trim() === '') return;
    
    setIsLoading(true);
    try {
      await onUpdate(comment.id, editContent);
      setIsEditing(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Kommentar löschen möchten?')) {
      setIsLoading(true);
      try {
        await onDelete(comment.id);
      } catch (error) {
        // Error is handled in the hook
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4 last:border-0">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-medium text-gray-900 dark:text-white">
            {comment.user_name || comment.user_email || 'Unbekannter Benutzer'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {format(new Date(comment.created_at), 'dd.MM.yyyy, HH:mm', { locale: de })}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 italic">
              (bearbeitet)
            </span>
          )}
        </div>
        {isOwner && !isEditing && (
          <div className="flex space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              disabled={isLoading}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<X size={16} />}
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save size={16} />}
              onClick={handleUpdate}
              isLoading={isLoading}
              disabled={editContent.trim() === '' || isLoading}
            >
              Speichern
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
      )}
    </div>
  );
};

export default TaskCommentItem;
