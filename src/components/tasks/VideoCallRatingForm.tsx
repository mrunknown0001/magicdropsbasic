import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import AnimatedButton from '../ui/AnimatedButton';
import { TaskAssignment } from '../../types/database';
import { CheckCircle } from 'lucide-react';
import { Star } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Video } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoCallRatingFormProps {
  taskAssignment: TaskAssignment;
  onSubmit: (ratingData: any) => Promise<void>;
  onBack: () => void;
}

type VideoCallRatingFormData = {
  callQuality: number;
  agentProfessionalism: number;
  callHelpfulness: number;
  feedback: string;
};

const VideoCallRatingForm: React.FC<VideoCallRatingFormProps> = ({ 
  // taskAssignment not used currently, but kept for future extension
  onSubmit,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<VideoCallRatingFormData>({
    defaultValues: {
      callQuality: 0,
      agentProfessionalism: 0,
      callHelpfulness: 0,
      feedback: ''
    }
  });

  const onFormSubmit = async (data: VideoCallRatingFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error) {
      console.error('Failed to submit video call rating:', error);
      toast.error('Bewertung konnte nicht gespeichert werden');
      setIsSubmitting(false);
    }
  };

  const RatingInput = ({ 
    name, 
    label, 
    control, 
    error 
  }: { 
    name: keyof VideoCallRatingFormData; 
    label: string; 
    control: any; 
    error?: string;
  }) => (
    <div className="mb-6">
      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        rules={{ required: true, min: 1 }}
        render={({ field: { onChange, value } }) => (
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={`p-1 focus:outline-none transition-all ${
                  value >= rating 
                    ? 'text-yellow-500 scale-110' 
                    : 'text-gray-300 dark:text-gray-500 hover:text-yellow-300'
                }`}
                disabled={isSubmitting}
              >
                <Star 
                  size={32} 
                  fill={value >= rating ? 'currentColor' : 'none'} 
                />
              </button>
            ))}
          </div>
        )}
      />
      {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
    </div>
  );

  return (
    <Card className="w-full h-full overflow-auto">
      <CardHeader>
        <div className="flex items-center mb-2">
          <Video className="text-blue-500 mr-2" size={24} />
          <CardTitle className="text-xl font-bold">Video-Chat Bewertung</CardTitle>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Bitte bewerte deine Erfahrung mit dem Video-Chat
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <RatingInput
            name="callQuality"
            label="Wie war die Verbindungsqualität des Video-Chats?"
            control={control}
            error={errors.callQuality ? "Bitte wähle eine Bewertung" : undefined}
          />
          
          <RatingInput
            name="agentProfessionalism"
            label="Wie professionell war der Support-Mitarbeiter während des Gesprächs?"
            control={control}
            error={errors.agentProfessionalism ? "Bitte wähle eine Bewertung" : undefined}
          />
          
          <RatingInput
            name="callHelpfulness"
            label="Wie hilfreich war der Video-Chat für deine Aufgabe?"
            control={control}
            error={errors.callHelpfulness ? "Bitte wähle eine Bewertung" : undefined}
          />
          
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Hast du weitere Anmerkungen oder Feedback zum Video-Chat?
            </label>
            <Controller
              name="feedback"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700 transition-all"
                  rows={4}
                  placeholder="Dein Feedback hilft uns, den Video-Chat Service zu verbessern"
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '120px', padding: '8px 16px' }}
            >
              ← Zurück
            </Button>
            
            <AnimatedButton
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <div className="flex items-center">
                {isSubmitting ? 'Wird gespeichert...' : 'Bewertung abschicken'}
                <CheckCircle size={16} className="ml-1" />
              </div>
            </AnimatedButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VideoCallRatingForm; 