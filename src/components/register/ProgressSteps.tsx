import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number;
  showContractStep?: boolean;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep, showContractStep = true }) => {
  const steps = [
    { number: 1, label: 'Persönliche Daten' },
    { number: 2, label: 'Adresse' },
    ...(showContractStep ? [{ number: 3, label: 'Vertrag' }] : []),
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex-1 relative ${
              step.number < steps.length ? 'after:content-[""] after:h-1 after:w-full after:absolute after:top-4 after:left-1/2 after:bg-gray-200 dark:after:bg-gray-700' : ''
            }`}
          >
            <div className="text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center border-2 transition-colors ${
                  step.number <= currentStep
                    ? 'bg-accent border-accent text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}
              >
                {step.number < currentStep ? (
                  <Check size={16} />
                ) : (
                  step.number
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {step.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressSteps;
