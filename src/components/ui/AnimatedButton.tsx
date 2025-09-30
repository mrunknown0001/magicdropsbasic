import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
  animationLevel?: 'subtle' | 'medium' | 'high';
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  fullWidth = false,
  rounded = false,
  animationLevel = 'medium',
  ...props
}) => {
      // Base styles with Inter font
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-app font-app-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Enhanced variant styles to match Button component
  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow focus:ring-accent/50',
    secondary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow focus:ring-primary/50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow focus:ring-red-500/50',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow focus:ring-green-500/50',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm hover:shadow focus:ring-yellow-500/50',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-300/50 dark:focus:ring-gray-700/50',
    outline: 'border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-gray-300/50 dark:focus:ring-gray-600/50',
  };
  
  // Enhanced size styles with more options to match Button component
  const sizeStyles = {
    xs: 'text-xs px-2 py-1 rounded',
    sm: 'text-sm px-3 py-1.5 rounded',
    md: 'text-sm px-4 py-2 rounded-md',
    lg: 'text-base px-5 py-2.5 rounded-lg',
    xl: 'text-lg px-6 py-3 rounded-lg',
  };
  
  // Loading spinner sizes based on button size
  const spinnerSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-5 w-5'
  };
  
  const disabledStyles = 'opacity-60 cursor-not-allowed pointer-events-none';
  
  // Animation variants based on level
  const animationVariants = {
    subtle: {
      hover: { scale: 1.01, y: -1 },
      tap: { scale: 0.99 }
    },
    medium: {
      hover: { scale: 1.03, y: -2 },
      tap: { scale: 0.97 }
    },
    high: {
      hover: { scale: 1.05, y: -3, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
      tap: { scale: 0.95 }
    }
  };
  
  // Combine all styles
  const buttonStyles = `
    ${baseStyles} 
    ${variantStyles[variant]} 
    ${sizeStyles[size]} 
    ${disabled || isLoading ? disabledStyles : ''}
    ${fullWidth ? 'w-full' : ''}
    ${rounded ? 'rounded-full' : ''}
    ${className}
  `;

  // Get the appropriate animation variant
  const animation = animationVariants[animationLevel];

  return (
    <motion.button
      className={buttonStyles}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? animation.hover : {}}
      whileTap={!disabled && !isLoading ? animation.tap : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      {...props as any}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg 
            className={`animate-spin mr-2 ${spinnerSizes[size]} text-current`} 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </div>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="mr-2 inline-flex">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="ml-2 inline-flex">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};

export default AnimatedButton;
