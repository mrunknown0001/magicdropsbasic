import React, { useState } from 'react';
import { FileText, Download, Eye, Image as ImageIcon } from 'lucide-react';

interface FileAttachmentProps {
  attachment: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    publicUrl: string;
  };
  isUserMessage: boolean;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({ 
  attachment, 
  isUserMessage 
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = () => {
    if (attachment.fileType.startsWith('image/')) {
      return <ImageIcon size={16} />;
    }
    return <FileText size={16} />;
  };

  // Check if file is an image
  const isImage = attachment.fileType.startsWith('image/');
  const isPDF = attachment.fileType === 'application/pdf';

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.publicUrl;
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-2">
      {/* Image Preview */}
      {isImage && !imageError && (
        <div className="relative group">
          <img
            src={attachment.publicUrl}
            alt={attachment.fileName}
            onError={() => setImageError(true)}
            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: '200px' }}
            onClick={() => setIsPreviewOpen(true)}
          />
          
          {/* Image Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye size={24} className="text-white" />
          </div>
        </div>
      )}

      {/* File Info */}
      <div 
        className={`
          flex items-center justify-between p-3 rounded-lg border
          ${isUserMessage 
            ? 'border-white/30 bg-white/10' 
            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600'
          }
        `}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className={`${isUserMessage ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {getFileIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isUserMessage ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {attachment.fileName}
            </p>
            <p className={`text-xs ${isUserMessage ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Preview Button for Images */}
          {isImage && !imageError && (
            <button
              onClick={() => setIsPreviewOpen(true)}
              className={`
                p-2 rounded-lg transition-colors
                ${isUserMessage 
                  ? 'hover:bg-white/20 text-white' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-500 dark:text-gray-400'
                }
              `}
              title="Vorschau"
            >
              <Eye size={16} />
            </button>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className={`
              p-2 rounded-lg transition-colors
              ${isUserMessage 
                ? 'hover:bg-white/20 text-white' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-500 dark:text-gray-400'
              }
            `}
            title="Herunterladen"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {isPreviewOpen && isImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={attachment.publicUrl}
              alt={attachment.fileName}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
