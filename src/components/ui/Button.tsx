import React, { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    leftIcon,
    rightIcon,
    children, 
    disabled,
    fullWidth = false,
    rounded = false,
    ...props 
  }, ref) => {
    // Enhanced variant styles with improved hover and focus states
    const variantStyles = {
      primary: 'bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow focus:ring-accent/50',
      secondary: 'bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow focus:ring-primary/50',
      outline: 'border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-gray-300/50 dark:focus:ring-gray-600/50',
      ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-300/50 dark:focus:ring-gray-700/50',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow focus:ring-red-500/50',
      success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow focus:ring-green-500/50'
    };

    // Enhanced size styles with more options and better proportions
    const sizeStyles = {
      xs: 'text-xs px-2 py-1 rounded',
      sm: 'text-sm px-3 py-1.5 rounded',
      md: 'text-sm px-4 py-2 rounded-md',
      lg: 'text-base px-5 py-2.5 rounded-lg',
      xl: 'text-lg px-6 py-3 rounded-lg'
    };

    // Loading spinner sizes based on button size
    const spinnerSizes = {
      xs: 'h-3 w-3',
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      xl: 'h-5 w-5'
    };

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
        className={twMerge(
          clsx(
            // Base styles with Inter font
            'font-app font-app-medium inline-flex items-center justify-center transition-all duration-200',
            // Focus styles
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            // Disabled styles
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
            // Apply variant styles
            variantStyles[variant],
            // Apply size styles
            sizeStyles[size],
            // Apply full width if specified
            fullWidth && 'w-full',
            // Apply rounded style if specified
            rounded && 'rounded-full',
            // Apply custom classes
            className
          )
        )}
        disabled={disabled || isLoading}
        {...props}
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
            {leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;