import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import AnimatedButton from '../ui/AnimatedButton';
import { TaskAssignment } from '../../types/database';
import { ArrowLeft, CheckCircle, FileText } from 'lucide-react';
import { FiArrowRight, FiBookOpen, FiList } from 'react-icons/fi';
import ShimmerEffect from '../ui/ShimmerEffect';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSettingsContext } from '../../context/SettingsContext';

interface TaskInstructionsProps {
  taskAssignment: TaskAssignment;
  isLoading?: boolean;
  onComplete?: () => void;
  onBack?: () => void;
  onNextStep?: () => Promise<void>;
  onPreviousStep?: () => Promise<void>;
}

const TaskInstructions: React.FC<TaskInstructionsProps> = ({
  taskAssignment,
  isLoading = false,
  onComplete,
  onBack,
  onNextStep,
  onPreviousStep,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(taskAssignment?.current_step || 1);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Move useSettingsContext to the top to avoid hooks order violations
  const { settings } = useSettingsContext();
  const primaryColor = settings?.primary_color || '#ee1d3c';
  const accentColor = settings?.accent_color || '#231f20';

  // Update the local step when the task assignment changes
  useEffect(() => {
    if (taskAssignment && taskAssignment.current_step) {
      setCurrentStep(taskAssignment.current_step);
    }
  }, [taskAssignment]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            <ShimmerEffect className="h-8 w-48 mx-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ShimmerEffect className="h-6 w-full" />
            <ShimmerEffect className="h-32 w-full" />
            <ShimmerEffect className="h-6 w-full" />
            <div className="flex justify-between mt-8">
              <ShimmerEffect className="h-10 w-24" />
              <ShimmerEffect className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taskAssignment || !taskAssignment.task_template) {
    return <div>No task template found</div>;
  }

  const { task_template } = taskAssignment;
  const steps = task_template.steps || [];
  const totalSteps = steps.length;

  // Ensure current step is valid
  const validCurrentStep = Math.min(Math.max(1, currentStep), totalSteps);
  const currentStepData = steps[validCurrentStep - 1]; // Adjust for 0-based array
  const isLastStep = validCurrentStep === totalSteps;
  const isFirstStep = validCurrentStep === 1;

  if (!steps.length || !currentStepData) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-xl">Anweisungen nicht verfügbar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
            Für diese Aufgabe wurden keine Anweisungen hinterlegt.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => onBack && onBack()} variant="secondary">
              Zurück zur Aufgabe
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleNext = async () => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);

      if (isLastStep) {
        if (onComplete) {
          onComplete();
        }
      } else {
        const nextStep = validCurrentStep + 1;
        setCurrentStep(nextStep);

        if (onNextStep) {
          await onNextStep();
        }
      }
    } catch (error) {
      console.error('Failed to navigate to next step:', error);
      toast.error('Failed to navigate to next step. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = async () => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);

      // For non-first steps, go to previous step
        const prevStep = validCurrentStep - 1;
        setCurrentStep(prevStep);

        if (onPreviousStep) {
          await onPreviousStep();
      }
    } catch (error) {
      console.error('Failed to navigate to previous step:', error);
      toast.error('Failed to navigate to previous step. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBackToTask = () => {
    if (isUpdating) return;
    
    if (onBack) {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col"
    >
      <Card className="w-full h-full flex flex-col shadow-lg border border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">
                {task_template.title}
              </CardTitle>
              <div className="flex items-center mt-2 text-gray-500 dark:text-gray-400">
                <FiList className="mr-2" />
                <span>Schritt {validCurrentStep} von {totalSteps}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div 
                  key={index} 
                  className={`h-2 w-8 rounded-full mx-0.5 ${index < validCurrentStep ? 'bg-green-500' : index === validCurrentStep - 1 ? '' : 'bg-gray-200 dark:bg-gray-700'}`}
                  style={index === validCurrentStep - 1 ? { backgroundColor: primaryColor } : {}}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow overflow-auto py-8">
          <motion.div
            key={validCurrentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full flex flex-col"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
              <div className="flex items-start">
                <div 
                  className="flex-shrink-0 rounded-full w-12 h-12 flex items-center justify-center mr-4"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <FiBookOpen size={24} style={{ color: primaryColor }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    {currentStepData.title}
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 space-y-4">
                    {currentStepData.description.split('\n').map((paragraph, index) => (
                      <p key={index} className="text-base leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Image would be displayed here if available */}
            {/* Commented out until image_url is added to the step data schema
            {currentStepData.image_url && (
              <div className="my-6 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
                <img 
                  src={currentStepData.image_url} 
                  alt={`Illustration für ${currentStepData.title}`}
                  className="w-full h-auto" 
                />
              </div>
            )}
            */}
          </motion.div>
        </CardContent>
        
        <CardFooter className="border-t border-gray-100 dark:border-gray-800 p-6 flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
          {!isFirstStep ? (
          <Button
            onClick={handleBack}
              disabled={isUpdating}
            variant="outline"
            style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '120px', padding: '8px 16px' }}
          >
            ← Zurück
          </Button>
          ) : (
            <Button
              onClick={handleBackToTask}
              disabled={isUpdating}
              variant="outline"
              style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '200px', padding: '8px 16px' }}
            >
              ← Zurück zur Aufgabe
            </Button>
          )}
          
          <AnimatedButton
            onClick={handleNext}
            disabled={isUpdating}
            className="px-8 py-2 text-base font-medium whitespace-nowrap min-w-[140px]"
            style={{
              backgroundColor: primaryColor,
              color: 'white'
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>{isLastStep ? 'Abschließen' : 'Weiter'}</span>
              {isLastStep ? (
                <CheckCircle size={16} />
              ) : (
                <FiArrowRight size={16} />
              )}
            </div>
          </AnimatedButton>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TaskInstructions;
