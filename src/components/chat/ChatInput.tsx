import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  isLoading: boolean;
  primaryColor: string;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFile,
  isLoading,
  primaryColor,
  placeholder = "Schreib mir einfach..."
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle message send
  const handleSend = useCallback(async () => {
    if (isLoading) return;

    // Send file if selected
    if (selectedFile) {
      try {
        await onUploadFile(selectedFile);
        setSelectedFile(null);
        return;
      } catch (error) {
        console.error('File upload failed:', error);
        return;
      }
    }

    // Send text message
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Clear input optimistically
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(trimmedMessage);
    } catch (error) {
      console.error('Message send failed:', error);
      // Restore message on error
      setMessage(trimmedMessage);
    }
  }, [message, selectedFile, onSendMessage, onUploadFile, isLoading]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // ~4 lines
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Datei zu groß. Maximum 10MB erlaubt.');
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Dateityp nicht unterstützt.');
      return;
    }

    setSelectedFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change
      const event = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  const canSend = (message.trim() || selectedFile) && !isLoading;

  return (
    <div 
      className={`
        p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
        ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Paperclip size={16} className="text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {selectedFile.name}
            </span>
            <span className="text-xs text-gray-500">
              ({Math.round(selectedFile.size / 1024)} KB)
            </span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
          <div className="text-blue-600 dark:text-blue-400 text-center">
            <Paperclip size={32} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Datei hier ablegen</p>
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end space-x-2">
        {/* File Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Datei anhängen"
        >
          <Paperclip size={20} />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.txt,.csv,.doc,.docx"
        />

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="
              w-full px-4 py-3 pr-12 
              border border-gray-300 dark:border-gray-600 
              rounded-xl resize-none
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              focus:ring-2 focus:ring-offset-0 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
            style={{
              focusRingColor: primaryColor + '40', // 40% opacity
              focusBorderColor: primaryColor
            }}
            maxLength={1000}
          />
          
          {/* Character Count */}
          {message.length > 800 && (
            <div className="absolute bottom-1 right-12 text-xs text-gray-400">
              {message.length}/1000
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="
            p-3 rounded-xl text-white transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none
          "
          style={{ 
            backgroundColor: canSend ? primaryColor : '#d1d5db',
            focusRingColor: primaryColor + '40'
          }}
          title={selectedFile ? 'Datei senden' : 'Nachricht senden'}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Input Help Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Drücke Enter zum Senden, Shift+Enter für neue Zeile
      </div>
    </div>
  );
};
