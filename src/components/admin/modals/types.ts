// Shared types for provider modals

export interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRent: (params: RentParams) => Promise<void>;
  loading?: boolean;
}

export interface RentParams {
  provider: string;
  service: string;
  rentTime: string;
  country: string;
  operator?: string;
  incomingCall?: boolean;
  mode?: 'activation' | 'rental'; // For GoGetSMS dual-mode
}

export interface ServiceOption {
  code: string;
  name: string;
  cost?: string;
}

export interface CountryOption {
  code: string;
  name: string;
}

export interface TimeOption {
  value: string;
  label: string;
} 