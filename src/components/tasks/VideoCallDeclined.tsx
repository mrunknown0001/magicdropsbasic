import React from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import AnimatedButton from '../ui/AnimatedButton';
import { TaskAssignment } from '../../types/database';
import { X, RefreshCw } from 'lucide-react';

interface VideoCallDeclinedProps {
  taskAssignment: TaskAssignment;
  onRestart: () => Promise<void>;
  isLoading?: boolean;
}

const VideoCallDeclined: React.FC<VideoCallDeclinedProps> = ({ 
  // taskAssignment not used currently, but kept for future extension 
  onRestart,
  isLoading = false
}) => {
  const handleRestart = async () => {
    if (isLoading) return;
    await onRestart();
  };

  return (
    <Card className="w-full h-full shadow-lg border border-gray-200 dark:border-gray-800">
      <CardHeader className="text-center border-b border-gray-100 dark:border-gray-800 pb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full shadow-sm">
            <X className="text-red-600 dark:text-red-400" size={40} />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">
          Die Bewertung ist fehlgeschlagen
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="prose dark:prose-invert max-w-none mb-8 text-center">
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            Du kannst jederzeit zurückkehren und die Bewertung neu starten, sobald du bereit für den Video-Call bist.
          </p>
          
          <div className="mt-10 flex justify-center">
            <AnimatedButton
              onClick={handleRestart}
              disabled={isLoading}
              className="px-8 py-2 text-base font-medium whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white min-w-[180px]"
            >
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw size={16} />
                <span>{isLoading ? 'Wird zurückgesetzt...' : 'Aufgabe neu starten'}</span>
              </div>
            </AnimatedButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoCallDeclined;
