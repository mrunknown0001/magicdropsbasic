import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, Image, X, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  acceptedTypes?: string[];
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  className?: string;
  label?: string;
  error?: string;
  showPreview?: boolean;
  previewUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'],
  maxSizeMB = 5,
  onFileSelect,
  className = '',
  label = 'Upload file',
  error,
  showPreview = true,
  previewUrl
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(error || null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };
  
  // Handle file drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };
  
  // Validate and process the file
  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);
    
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      setErrorMessage(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`);
      return;
    }
    
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }
    
    // Create preview
    if (showPreview) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    
    // Notify parent
    setIsUploading(true);
    try {
      onFileSelect(file);
    } catch (err) {
      setErrorMessage('Failed to process file');
      console.error('Error in FileUpload component:', err);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle drag events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  // Handle file selection click
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Clear the preview and reset
  const handleClearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md 
          ${isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'} 
          ${errorMessage ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}
          hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 animate-spin">
              <Upload className="h-12 w-12" />
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        ) : preview ? (
          <div className="relative w-full">
            <div className="flex justify-center">
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-64 rounded" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearPreview(); }}
                  className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Upload className="h-12 w-12" />
            </div>
            <div className="flex text-sm text-gray-600 dark:text-gray-400">
              <p className="pl-1">Drag and drop a file or click to select</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {acceptedTypes.join(', ')} (max. {maxSizeMB}MB)
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept={acceptedTypes.join(',')}
          onChange={handleFileChange}
        />
      </div>
      
      {errorMessage && (
        <div className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
          <AlertCircle size={16} className="mr-1 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
