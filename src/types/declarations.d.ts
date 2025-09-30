// Declare modules for libraries without type definitions
declare module 'react-hot-toast' {
  import React from 'react';
  
  export interface ToastOptions {
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    position?: string;
    icon?: any;
    className?: string;
    title?: string;
    message?: string;
  }

  export function toast(message: string | React.ReactNode, options?: any): string;
  toast.success = (message: string | React.ReactNode, options?: any) => '';
  toast.error = (message: string | React.ReactNode, options?: any) => '';
  toast.loading = (message: string | React.ReactNode, options?: any) => '';
  toast.dismiss = (toastId?: string) => {};

  export interface ToasterProps {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    toastOptions?: ToastOptions;
    reverseOrder?: boolean;
    gutter?: number;
    containerStyle?: React.CSSProperties;
    containerClassName?: string;
    children?: (toast: any) => React.ReactNode;
  }

  export const Toaster: React.FC<ToasterProps>;

  export default toast;
}

declare module 'lucide-react' {
  import React from 'react';
  
  interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    className?: string;
  }
  
  export const CheckCircle: React.FC<IconProps>;
  export const RefreshCw: React.FC<IconProps>;
  export const Clock: React.FC<IconProps>;
  export const Download: React.FC<IconProps>;
  export const ExternalLink: React.FC<IconProps>;
  export const Mail: React.FC<IconProps>;
  export const Key: React.FC<IconProps>;
  export const Link: React.FC<IconProps>;
  export const AlertCircle: React.FC<IconProps>;
  export const MessageSquare: React.FC<IconProps>;
  export const PhoneOutgoing: React.FC<IconProps>;
  export const Smartphone: React.FC<IconProps>;
  export const AlertTriangle: React.FC<IconProps>;
  export const Phone: React.FC<IconProps>;
  export const Copy: React.FC<IconProps>;
  export const Star: React.FC<IconProps>;
  export const ArrowLeft: React.FC<IconProps>;
  export const Video: React.FC<IconProps>;
  export const ChevronDown: React.FC<IconProps>;
  export const Search: React.FC<IconProps>;
  export const Filter: React.FC<IconProps>;
  export const UserPlus: React.FC<IconProps>;
  export const XCircle: React.FC<IconProps>;
  export const Edit: React.FC<IconProps>;
  export const Menu: React.FC<IconProps>;
  export const Moon: React.FC<IconProps>;
  export const Sun: React.FC<IconProps>;
  export const Upload: React.FC<IconProps>;
  export const Image: React.FC<IconProps>;
  export const X: React.FC<IconProps>;
  export const Check: React.FC<IconProps>;
  export const User: React.FC<IconProps>;
  export const Users: React.FC<IconProps>;
  export const Home: React.FC<IconProps>;
  export const Briefcase: React.FC<IconProps>;
  export const FileText: React.FC<IconProps>;
  export const CheckSquare: React.FC<IconProps>;
  export const LogOut: React.FC<IconProps>;
  export const Settings: React.FC<IconProps>;
  export const Building: React.FC<IconProps>;
  export const Database: React.FC<IconProps>;
}

declare module 'date-fns' {
  export function formatDistanceToNow(date: Date | number, options?: {
    includeSeconds?: boolean;
    addSuffix?: boolean;
    locale?: Locale;
  }): string;
}

declare module 'date-fns/locale' {
  export const de: Locale;
  
  interface Locale {
    code?: string;
    formatDistance?: (...args: any[]) => any;
    formatRelative?: (...args: any[]) => any;
    localize?: {
      ordinalNumber: (...args: any[]) => any;
      era: (...args: any[]) => any;
      quarter: (...args: any[]) => any;
      month: (...args: any[]) => any;
      day: (...args: any[]) => any;
      dayPeriod: (...args: any[]) => any;
    };
    formatLong?: {
      date: (...args: any[]) => any;
      time: (...args: any[]) => any;
      dateTime: (...args: any[]) => any;
    };
    match?: {
      ordinalNumber: (...args: any[]) => any;
      era: (...args: any[]) => any;
      quarter: (...args: any[]) => any;
      month: (...args: any[]) => any;
      day: (...args: any[]) => any;
      dayPeriod: (...args: any[]) => any;
    };
    options?: {
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      firstWeekContainsDate?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    };
  }
} 