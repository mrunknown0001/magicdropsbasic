import React from 'react';
import { CheckCircle, Clock, Upload, XCircle, AlertCircle } from 'lucide-react';

export type TaskStatus = 'pending' | 'submitted' | 'completed' | 'rejected' | 'canceled';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Centralized status configuration
const statusConfig: Record<TaskStatus, {
  label: string;
  icon: React.ComponentType<any>;
  colors: {
    bg: string;
    text: string;
    darkBg: string;
    darkText: string;
    border: string;
    darkBorder: string;
  };
}> = {
  pending: {
    label: 'Ausstehend',
    icon: Clock,
    colors: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      darkBg: 'dark:bg-yellow-900/30',
      darkText: 'dark:text-yellow-300',
      border: 'border-yellow-200',
      darkBorder: 'dark:border-yellow-700'
    }
  },
  submitted: {
    label: 'Eingereicht',
    icon: Upload,
    colors: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      darkBg: 'dark:bg-blue-900/30',
      darkText: 'dark:text-blue-300',
      border: 'border-blue-200',
      darkBorder: 'dark:border-blue-700'
    }
  },
  completed: {
    label: 'Abgeschlossen',
    icon: CheckCircle,
    colors: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      darkBg: 'dark:bg-green-900/30',
      darkText: 'dark:text-green-300',
      border: 'border-green-200',
      darkBorder: 'dark:border-green-700'
    }
  },
  rejected: {
    label: 'Abgelehnt',
    icon: XCircle,
    colors: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      darkBg: 'dark:bg-red-900/30',
      darkText: 'dark:text-red-300',
      border: 'border-red-200',
      darkBorder: 'dark:border-red-700'
    }
  },
  canceled: {
    label: 'Abgebrochen',
    icon: AlertCircle,
    colors: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      darkBg: 'dark:bg-gray-900/30',
      darkText: 'dark:text-gray-300',
      border: 'border-gray-200',
      darkBorder: 'dark:border-gray-700'
    }
  }
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    iconSize: 12
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    iconSize: 14
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    iconSize: 16
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  className = '' 
}) => {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const IconComponent = config.icon;

  const badgeClasses = [
    'inline-flex items-center rounded-full font-medium border',
    sizeStyles.padding,
    sizeStyles.text,
    config.colors.bg,
    config.colors.text,
    config.colors.darkBg,
    config.colors.darkText,
    config.colors.border,
    config.colors.darkBorder,
    className
  ].join(' ');

  return (
    <span className={badgeClasses}>
      <IconComponent size={sizeStyles.iconSize} className="mr-1" />
      {config.label}
    </span>
  );
};

export default StatusBadge;

// Export the status configuration for use in other components
export const getStatusConfig = (status: TaskStatus) => statusConfig[status];

// Export utility functions for consistent status handling
export const getStatusLabel = (status: TaskStatus): string => statusConfig[status]?.label || status;

export const getStatusIcon = (status: TaskStatus) => statusConfig[status]?.icon || Clock;

export const getStatusColors = (status: TaskStatus) => statusConfig[status]?.colors || statusConfig.pending.colors; 