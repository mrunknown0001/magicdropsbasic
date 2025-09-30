import React, { useState, useEffect } from 'react';
import { useTaskAttachments } from '../../hooks/useTaskAttachments';
import { TaskAssignment } from '../../types/database';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import TaskAttachmentsList from './TaskAttachmentsList';
import AnimatedButton from '../ui/AnimatedButton';
import { CheckCircle, Upload, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploadStepProps {
  taskAssignment: TaskAssignment;
  onComplete: () => Promise<void>;
  onBack: () => void;
}

const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  taskAssignment,
  onComplete,
  onBack,
}) => {
  const { 
    attachments, 
    loading, 
    uploadTaskAttachment, 
    downloadTaskAttachment, 
    deleteTaskAttachment,
    fetchAttachments 
  } = useTaskAttachments(taskAssignment.id);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requiredAttachments = taskAssignment.task_template?.required_attachments || [];
  
  // Fetch attachments on component mount
  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);
  
  const handleFileUpload = async (file: File, attachmentType?: string) => {
    try {
      // If attachmentType is provided, we can add metadata about what type of document this is
      await uploadTaskAttachment(file, taskAssignment.id, attachmentType);
      toast.success('Dokument erfolgreich hochgeladen');
    } catch (error) {
      console.error('Error uploading document', error);
      toast.error('Fehler beim Hochladen des Dokuments');
    }
  };
  
  const handleCompleteStep = async () => {
    // Check if all required attachments are uploaded
    if (requiredAttachments.length > 0 && requiredAttachments.some(att => att.required) && 
        attachments.length === 0) {
      toast.error('Bitte laden Sie die erforderlichen Dokumente hoch');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('Error completing document step', error);
      toast.error('Fehler beim Abschließen des Dokumentenschritts');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Dokumente hochladen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Bitte laden Sie die erforderlichen Dokumente für diese Aufgabe hoch.
          </p>
          
          {requiredAttachments.length > 0 ? (
            <div className="space-y-4">
              {requiredAttachments.map((attachment, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {attachment.name}
                    {attachment.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  
                  {attachment.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {attachment.description}
                    </p>
                  )}
                  
                  <FileUpload
                    acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
                    maxSizeMB={10}
                    onFileSelect={(file) => handleFileUpload(file, attachment.name)}
                    label={`${attachment.name} hochladen`}
                    showPreview={false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
              <FileUpload
                acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
                maxSizeMB={10}
                onFileSelect={(file) => handleFileUpload(file)}
                label="Dokument hochladen"
                showPreview={false}
              />
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Hochgeladene Dokumente:</h3>
            <TaskAttachmentsList
              attachments={attachments}
              onDownload={downloadTaskAttachment}
              onDelete={deleteTaskAttachment}
              isLoading={loading}
            />
          </div>
          
          <div className="flex justify-between mt-8">
            <Button
              onClick={onBack}
              variant="outline"
              style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '120px', padding: '8px 16px' }}
            >
              ← Zurück
            </Button>
            
            <AnimatedButton
              onClick={handleCompleteStep}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-base font-medium whitespace-nowrap min-w-[240px]"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>Dokumente bestätigen & abschließen</span>
                <CheckCircle size={16} />
              </div>
            </AnimatedButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUploadStep; 