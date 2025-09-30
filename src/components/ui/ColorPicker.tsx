import React, { useState, useEffect, useRef } from 'react';
import { isValidHexColor, normalizeHexColor, getContrastRatio } from '../../utils/colorUtils';
import { AlertTriangle } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  name?: string;
  className?: string;
  error?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value = '#3b82f6',
  onChange,
  label,
  name,
  className = '',
  error
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Initialize with provided value
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Predefined colors
  const presetColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#ef4444', // Red
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
  ];
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate input
    const valid = isValidHexColor(newValue);
    setIsValid(valid);
    
    // If valid, normalize and trigger onChange
    if (valid) {
      const normalizedColor = normalizeHexColor(newValue);
      onChange(normalizedColor);
    }
  };
  
  // Handle color selection from presets
  const handleColorSelect = (color: string) => {
    setInputValue(color);
    onChange(color);
    setIsOpen(false);
  };
  
  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Calculate contrast with white and black for accessibility
  const whiteContrast = getContrastRatio(inputValue, '#ffffff');
  const blackContrast = getContrastRatio(inputValue, '#000000');
  const showContrastWarning = isValid && (whiteContrast < 4.5 && blackContrast < 4.5);
  
  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}
      
      <div className="flex items-center space-x-2 mt-1">
        {/* Color preview */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-sm"
          style={{ backgroundColor: isValid ? inputValue : '#cccccc' }}
          aria-label="Open color picker"
        >
          {!isValid && (
            <span className="text-white">?</span>
          )}
        </button>
        
        {/* Color input */}
        <div className="flex-grow relative">
          <input
            type="text"
            name={name}
            id={name}
            value={inputValue}
            onChange={handleInputChange}
            className={`block w-full rounded-md sm:text-sm ${
              !isValid 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-700 dark:text-red-300'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
            }`}
            placeholder="#RRGGBB"
          />
          
          {!isValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
      
      {/* Contrast warning */}
      {showContrastWarning && (
        <div className="mt-1 text-sm text-amber-600 dark:text-amber-400 flex items-center">
          <AlertTriangle size={14} className="mr-1 flex-shrink-0" />
          <span>Low contrast with both black and white text</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {/* Color picker dropdown */}
      {isOpen && (
        <div 
          ref={pickerRef}
          className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none p-3"
        >
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded-md hover:scale-110 transform transition-transform ${
                  color.toLowerCase() === inputValue.toLowerCase() ? 'ring-2 ring-black dark:ring-white ring-opacity-60' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 