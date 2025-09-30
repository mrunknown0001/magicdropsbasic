import React from 'react';

interface SwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`inline-flex ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          checked 
            ? 'bg-accent' 
            : 'bg-gray-300 dark:bg-gray-600'
        } transition-colors duration-200 ease-in-out`}
      >
        <span 
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          } translate-y-0.5`} 
        />
      </label>
    </div>
  );
};

export default Switch; 