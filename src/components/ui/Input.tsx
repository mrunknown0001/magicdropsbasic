import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftAddon, rightAddon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id} className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 transition-colors">
            {label}
          </label>
        )}
        <div className="relative">
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              clsx(
                'w-full rounded-lg px-4 py-3 text-base transition-all duration-200',
                'border-2 border-gray-200 dark:border-gray-600',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'hover:border-accent/50',
                'focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none',
                'dark:focus:border-accent dark:focus:ring-accent/20',
                'shadow-sm hover:shadow-md focus:shadow-lg',
                {
                  'pl-10': leftAddon,
                  'pr-10': rightAddon,
                  'border-red-500 focus:border-red-500 focus:ring-red-500/20': error,
                },
                className
              )
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {rightAddon}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500 dark:text-red-400 flex items-center gap-1"><span className="inline-block w-1 h-1 rounded-full bg-red-500 dark:bg-red-400"></span>{error}</p>}
        {helperText && !error && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><span className="inline-block w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;