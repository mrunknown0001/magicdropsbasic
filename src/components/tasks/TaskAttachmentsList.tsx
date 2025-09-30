import React from 'react';
import { Download, X, FileText, Image, Video } from 'lucide-react';
import { TaskAttachment } from '../../hooks/useTaskAttachments';
import Button from '../ui/Button';
import { motion } from 'framer-motion';

interface TaskAttachmentsListProps {
  attachments: TaskAttachment[];
  onDownload: (attachment: TaskAttachment) => void;
  onDelete: (attachment: TaskAttachment) => void;
  isLoading?: boolean;
}

const TaskAttachmentsList: React.FC<TaskAttachmentsListProps> = ({
  attachments,
  onDownload,
  onDelete,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="py-4 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-pulse flex justify-center">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <p className="mt-2">Anhänge werden geladen...</p>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 dark:text-gray-400">
        <p>Keine Anhänge vorhanden</p>
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    const type = fileType.split('/')[0];
    switch (type) {
      case 'image':
        return <Image size={20} />;
      case 'video':
        return <Video size={20} />;
      case 'audio':
        return <FileText size={20} />;
      case 'application':
        if (fileType.includes('pdf')) {
          return <FileText size={20} />;
        } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) {
          return <FileText size={20} />;
        }
        return <FileText size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

  return (
    <motion.div 
      className="space-y-2"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {attachments.map((attachment) => (
        <motion.div 
          key={attachment.id}
          className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded px-3 py-2"
          variants={item}
        >
          <div className="flex items-center space-x-2">
            <div className="text-gray-600 dark:text-gray-400">
            {getFileIcon(attachment.file_type)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
                {attachment.file_name}
              </p>
              <div className="flex text-xs text-gray-500 dark:text-gray-400 space-x-2">
                <span>{formatFileSize(attachment.file_size)}</span>
                <span>•</span>
                <span>{formatDate(attachment.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(attachment)}
              title="Herunterladen"
            >
              <Download size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(attachment)}
              title="Löschen"
            >
              <X size={16} className="text-red-500" />
            </Button>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default TaskAttachmentsList;
