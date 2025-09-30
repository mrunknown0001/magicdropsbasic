import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiPhone, FiPlus, FiRefreshCw, FiTrash2, FiUserPlus, FiClock, FiMessageSquare, FiLink, FiGlobe } from 'react-icons/fi';
import { usePhoneNumbersStats } from '../../hooks/usePhoneNumbersStats';
import { usePhoneMessagesStats } from '../../hooks/usePhoneMessagesStats';
import { useAvailableProviders } from '../../hooks/useAvailableProviders';
import { supabase } from '../../lib/supabase';
import { useEmployees } from '../../hooks/useEmployees';
import { useToast } from '../../hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import { phoneApiClient } from '../../api/phoneApiClient';
import type { PhoneNumber } from '../../types/database';
import { getServiceName, getCountryName } from '../../utils/serviceData';
import Button from '../../components/ui/Button';
import { useSettingsContext } from '../../context/SettingsContext';
import { AddManualPhoneModalContent } from '../../components/admin/AddManualPhoneModal';
// Provider modals
import { 
  SmsActivateModal, 
  GoGetSmsModal, 
  AnosimModal, 
  SmspvaModal 
} from '../../components/admin/modals';

// Inline components needed by this page
const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} text-indigo-600 animate-spin`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="opacity-25"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    </div>
  );
};

// Searchable Dropdown Component
interface DropdownOption {
  value: string;
  label: string;
}

const SearchableDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Auswählen...', 
  emptyMessage = 'Keine Ergebnisse gefunden',
  label
}: { 
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  label?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get selected option label
  const selectedOption = options.find(option => option.value === value);
  
  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      <div 
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-60">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</div>
          ) : (
            <ul className="max-h-40 overflow-y-auto">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${option.value === value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-200'}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// Modal Component (inline)
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

        <div
          className={`inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}
        >
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

function PhoneNumbers() {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [isManualPhoneModalOpen, setIsManualPhoneModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  // Provider-specific modal states
  const [isSmsActivateModalOpen, setIsSmsActivateModalOpen] = useState(false);
  const [isGoGetSmsModalOpen, setIsGoGetSmsModalOpen] = useState(false);
  const [isAnosimModalOpen, setIsAnosimModalOpen] = useState(false);
  const [isSmspvaModalOpen, setIsSmspvaModalOpen] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumber | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'sms_activate' | 'smspva' | 'anosim' | 'gogetsms'>('sms_activate');
  const [selectedService, setSelectedService] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all_countries'); // Default to all countries
  const [rentTime, setRentTime] = useState('4'); // Default to 4 hours
  const [gogetSmsMode, setGogetSmsMode] = useState<'activation' | 'rental'>('rental'); // NEW: GoGetSMS mode
  const [newMessageCount, setNewMessageCount] = useState<Record<string, number>>({});
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [statusMessage, setStatusMessage] = useState<{type: 'info' | 'success' | 'error' | 'warning', message: string} | null>(null);
  const [addingManualPhone, setAddingManualPhone] = useState(false);
  
  // Custom hooks
  const { showToast } = useToast();
  const { colors } = useSettingsContext();
  const { providers: availableProviders, loading: loadingProviders, error: providersError } = useAvailableProviders();
  
  // Auto-adjust rent time when switching to German full rental
  useEffect(() => {
    if (selectedProvider === 'anosim' && (selectedService === 'full_germany' || selectedService === 'full')) {
      // Set default to 7 days (168 hours) for German full rental
      if (!['24', '168', '720', '2160', '4320', '8760'].includes(rentTime)) {
        setRentTime('168'); // 7 days default
      }
    }
  }, [selectedProvider, selectedService]);
  
  // Use our new hooks
  const {
    phoneNumbers,
    services,
    countries,
    loading,
    error,
    serverStatus,
    fetchPhoneNumbers,
    fetchServicesAndCountries,
    rentPhoneNumber,
    cancelPhoneNumberRental,
    extendPhoneNumberRental,
    assignPhoneNumber,
    checkServerConnectivity
  } = usePhoneNumbersStats();
  
  const { employees } = useEmployees();
  
  // Load data only once on component mount
  useEffect(() => {
    // Check server connectivity on mount
    checkServerConnectivity();
  }, [checkServerConnectivity]);
  
  // Handle provider change manually instead of automatic useEffect
  const handleProviderChange = async (newProvider: 'sms_activate' | 'smspva' | 'anosim' | 'gogetsms') => {
    // Prevent provider change if already loading
    if (loading) {
      console.log('Already loading, ignoring provider change');
      return;
    }
    
    // Only refresh services if provider actually changed
    if (newProvider !== selectedProvider) {
      const providerName = newProvider === 'smspva' ? 'SMSPVA' : 
                          newProvider === 'anosim' ? 'Anosim' : 'SMS-Activate';
      console.log(`Provider changed to: ${providerName}...`);
      
      setStatusMessage({
        type: 'info',
        message: `Lade Dienste für ${providerName}...`
      });
      
      try {
        setSelectedProvider(newProvider);
        setSelectedService(''); // Reset selected service
        
        await fetchServicesAndCountries(true, rentTime, selectedCountry, newProvider);
        
        setStatusMessage({
          type: 'success',
          message: `Dienste für ${providerName} erfolgreich geladen`
        });
        
        // Clear success message after 2 seconds
        setTimeout(() => setStatusMessage(null), 2000);
      } catch (error) {
        console.error('Error refreshing services for new provider:', error);
        setStatusMessage({
          type: 'error',
          message: 'Fehler beim Laden der Dienste für den neuen Anbieter'
        });
      }
    } else {
      setSelectedProvider(newProvider);
      setSelectedService(''); // Reset selected service
    }
  };
  
  // Filter phone numbers based on search term
  const filteredPhoneNumbers = phoneNumbers.filter(phone => {
    const searchLower = searchTerm.toLowerCase();
    return (
      phone.phone_number.toLowerCase().includes(searchLower) ||
      phone.service.toLowerCase().includes(searchLower) ||
      phone.country.toLowerCase().includes(searchLower)
    );
  });
  
  // Handle manual refresh
  const handleRefresh = async () => {
    console.log('Refresh button clicked - starting refresh...');
    
    try {
    showToast({
      type: 'info',
      title: 'Refreshing',
      message: 'Updating phone numbers list...'
    });
      
      const result = await fetchPhoneNumbers(true); // Force refresh
      console.log('Refresh completed, fetched:', result?.length, 'phone numbers');
      
      showToast({
        type: 'success',
        title: 'Refreshed',
        message: `Updated phone numbers list (${result?.length || 0} numbers)`
      });
    } catch (error) {
      console.error('Error during refresh:', error);
      showToast({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to update phone numbers list'
      });
    }
  };
  
  // Handle adding manual phone number
  const handleAddManualPhone = async (url: string) => {
    setAddingManualPhone(true);
    try {
      await phoneApiClient.addManualPhoneNumber(url);
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Manual phone number added successfully!'
      });
      
      // Refresh the phone numbers list
      fetchPhoneNumbers(true);
      
    } catch (error: any) {
      console.error('Error adding manual phone number:', error);
      
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add manual phone number'
      });
      
      throw error; // Re-throw to let modal handle it
    } finally {
      setAddingManualPhone(false);
    }
  };

  // Handle refreshing messages for manual phone numbers
  const handleRefreshMessages = async (phoneNumber: PhoneNumber) => {
    try {
      const { messageSyncService } = await import('../../services/messageSyncService');
      
      showToast({
        type: 'info',
        title: 'Syncing Messages',
        message: `Refreshing messages for ${phoneNumber.phone_number}...`
      });

      const result = await messageSyncService.syncPhoneNumberById(phoneNumber.id);
      
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Messages Synced',
          message: `Found ${result.newMessagesCount} new messages for ${phoneNumber.phone_number}`
        });
        
        // Refresh the phone numbers list to update message counts
        fetchPhoneNumbers(true);
      } else {
        showToast({
          type: 'error',
          title: 'Sync Failed',
          message: result.error || 'Failed to sync messages'
        });
      }
    } catch (error: any) {
      console.error('Error refreshing messages:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to refresh messages'
      });
    }
  };

  // Handle removing manual phone numbers
  const handleRemoveManualPhone = async (phoneNumber: PhoneNumber) => {
    if (!confirm(`Are you sure you want to remove ${phoneNumber.phone_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      await phoneApiClient.removeManualPhoneNumber(phoneNumber.id);
      
      showToast({
        type: 'success',
        title: 'Phone Number Removed',
        message: `${phoneNumber.phone_number} has been removed successfully`
      });
      
      // Refresh the phone numbers list
      fetchPhoneNumbers(true);
      
    } catch (error: any) {
      console.error('Error removing manual phone number:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove phone number'
      });
    }
  };
  
  // Handle renting a new phone number
  const handleRentNumber = async () => {
    if (!selectedService) {
      setStatusMessage({
        type: 'error',
        message: 'Please select a service'
      });
      return;
    }
    
    try {
      setStatusMessage({
        type: 'info',
        message: `Renting number for ${getServiceName(selectedService)}...`
      });
      
      const requestParams = {
        service: selectedService,
        rentTime,
        country: selectedCountry,
        provider: selectedProvider,
        // NEW: Include mode for GoGetSMS
        ...(selectedProvider === 'gogetsms' && { mode: gogetSmsMode })
      };
      
      console.log('Renting phone number with params:', requestParams);
      
      // Step 1: Rent the number via the API
      const response = await phoneApiClient.rentNumber(
        selectedService, 
        rentTime, 
        selectedCountry, 
        selectedProvider,
        selectedProvider === 'gogetsms' ? gogetSmsMode : undefined
      );
      console.log('Rental API response:', response);
      
      // Step 2: Display success message
      const modeText = selectedProvider === 'gogetsms' && gogetSmsMode === 'activation' ? '(Aktivierung)' : '(Vermietung)';
      setStatusMessage({
        type: 'success',
        message: `Successfully rented number: ${response.phone_number} ${modeText}`
      });
      
      // Step 3: Close modal after a delay to show success message
      setTimeout(() => {
        setIsRentModalOpen(false);
        setSelectedService('');
        setStatusMessage(null);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error in handleRentNumber:', error);
      
      // Get error message from error object
      const errorMsg = error.message || 'Unknown error occurred';
      
      // Set status message for display in the modal
      setStatusMessage({
        type: 'error',
        message: errorMsg
      });
      
      // Show detailed error in console
      console.error('Detailed rental error:', error);
    }
  };

  // Handle provider-specific rentals
  const handleProviderRent = async (params: any) => {
    try {
      console.log('Provider rental params:', params);
      
      // Call the API directly
      const response = await phoneApiClient.rentNumber(
        params.service, 
        params.rentTime, 
        params.country, 
        params.provider,
        params.mode // NEW: Include mode for GoGetSMS
      );
      
      console.log('Provider rental response:', response);
      
      const modeText = params.provider === 'gogetsms' && params.mode === 'activation' ? ' (Activation)' : ' (Rental)';
      showToast({
        type: 'success',
        title: 'Success',
        message: `Successfully rented ${params.provider} number: ${response.phone_number}${modeText}`
      });
      
      // Refresh phone numbers list
      fetchPhoneNumbers();
      
    } catch (error: any) {
      console.error('Provider rental error:', error);
      throw error; // Re-throw so modal can handle it
    }
  };
  
  // Handle canceling a phone number rental
  const handleCancelRental = async (phoneNumber: PhoneNumber) => {
    if (window.confirm(`Sind Sie sicher, dass Sie die Miete für ${phoneNumber.phone_number} kündigen möchten?`)) {
      try {
        await cancelPhoneNumberRental(phoneNumber.rent_id);
      } catch (error) {
        console.error('Error canceling rental:', error);
      }
    }
  };
  
  // Handle extending a phone number rental
  const handleExtendRental = async (phoneNumber: PhoneNumber) => {
    // Create dropdown options for extension periods
    const options = [
      { value: "4", label: "4 Stunden" },
      { value: "12", label: "12 Stunden" },
      { value: "24", label: "1 Tag (24 Stunden)" },
      { value: "48", label: "2 Tage (48 Stunden)" },
      { value: "72", label: "3 Tage (72 Stunden)" },
      { value: "96", label: "4 Tage (96 Stunden)" },
      { value: "120", label: "5 Tage (120 Stunden)" },
      { value: "144", label: "6 Tage (144 Stunden)" },
      { value: "168", label: "7 Tage (168 Stunden)" }
    ];
    
    // Create dropdown HTML
    const selectOptions = options.map(opt => 
      `<option value="${opt.value}">${opt.label}</option>`
    ).join('');
    
    // Custom prompt with dropdown
    const userInput = window.prompt(
      `Wählen Sie die Verlängerungszeit für ${phoneNumber.phone_number}:\n\n` +
      `4 Stunden (4)\n` +
      `12 Stunden (12)\n` +
      `1 Tag (24)\n` +
      `2 Tage (48)\n` +
      `3 Tage (72)\n` +
      `4 Tage (96)\n` +
      `5 Tage (120)\n` +
      `6 Tage (144)\n` +
      `7 Tage (168)`,
      '4'
    );
    
    if (userInput) {
      try {
        await extendPhoneNumberRental(phoneNumber.rent_id, userInput);
      } catch (error) {
        console.error('Error extending rental:', error);
      }
    }
  };
  
  // Use the usePhoneMessagesStats hook for the selected phone number
  const {
    messages,
    loading: loadingMessages,
    fetchMessages
  } = usePhoneMessagesStats(selectedPhoneNumber?.id);

  // Track active notification subscriptions
  const notificationChannelRef = useRef<any>(null);

  // Subscribe to new messages for notification badges - only once per phone number
  useEffect(() => {
    // Only set up notification subscription when a phone number is selected
    // but the messages modal is not open
    if (!selectedPhoneNumber || isMessagesModalOpen) {
      return;
    }
    
    // Clean up previous subscription if it exists
    if (notificationChannelRef.current) {
      supabase.removeChannel(notificationChannelRef.current);
      notificationChannelRef.current = null;
    }
    
    const phoneId = selectedPhoneNumber.id;
    console.log(`Setting up notification subscription for phone number: ${phoneId}`);
    
    const channel = supabase
      .channel(`phone_notifications:${phoneId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'phone_messages',
          filter: `phone_number_id=eq.${phoneId}`
        },
        (payload) => {
          console.log('Received message notification:', payload);
          // Increment message count when new message arrives
          setNewMessageCount(prev => ({
            ...prev,
            [phoneId]: (prev[phoneId] || 0) + 1
          }));
        }
      )
      .subscribe((status) => {
        console.log(`Notification subscription status: ${status}`);
      });
    
    // Store the channel reference
    notificationChannelRef.current = channel;
    
    return () => {
      if (notificationChannelRef.current) {
        console.log(`Removing notification subscription for phone number: ${phoneId}`);
        supabase.removeChannel(notificationChannelRef.current);
        notificationChannelRef.current = null;
      }
    };
  }, [selectedPhoneNumber, isMessagesModalOpen]);

  // Reset new message count when viewing messages
  useEffect(() => {
    if (selectedPhoneNumber && isMessagesModalOpen) {
      setNewMessageCount(prev => ({
        ...prev,
        [selectedPhoneNumber.id]: 0
      }));
      
      // Fetch the latest messages when opening the modal
      fetchMessages(true);
    }
  }, [isMessagesModalOpen, selectedPhoneNumber, fetchMessages]);

  // Direct SMS fetch for different providers
  const handleDirectSMSFetch = async (phoneNumber: PhoneNumber) => {
    console.log('🚀 Direct SMS fetch triggered for:', {
      provider: phoneNumber.provider,
      phone_number: phoneNumber.phone_number,
      external_url: phoneNumber.external_url,
      access_key: phoneNumber.access_key
    });
    
    try {
      if (phoneNumber.provider === 'smspva') {
        console.log('📱 Using SMSPVA API method - now handled by usePhoneMessages hook');
        showToast({
          type: 'info',
          title: 'Info',
          message: 'SMSPVA messages are now fetched automatically when opening the messages modal'
        });
      } else if (phoneNumber.provider === 'anosim') {
        console.log('🔄 Using Anosim API method');
        await handleAnosimFetch(phoneNumber);
      } else if (phoneNumber.provider === 'receive_sms_online') {
        console.log('🌐 Using receive-sms-online HTML scraping method');
        await handleReceiveSmsOnlineFetch(phoneNumber);
      } else {
        console.log('❌ Unsupported provider:', phoneNumber.provider);
        showToast({
          type: 'error',
          title: 'Fehler',
          message: `Provider ${phoneNumber.provider} wird für direkte SMS-Abfrage nicht unterstützt`
        });
      }
    } catch (error) {
      console.error('❌ Error fetching SMS:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Fehler beim Abrufen der SMS-Nachrichten'
      });
    }
  };

  // SMSPVA API message fetching
  const handleSMSPVAFetch = async (phoneNumber: PhoneNumber) => {
    if (!phoneNumber.external_url) {
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Keine Aktivierungs-ID für SMSPVA verfügbar'
      });
      return;
    }

    try {
      console.log('Fetching SMSPVA messages for activation ID:', phoneNumber.external_url);
      
      // Call the backend API to get SMSPVA messages using the standard status endpoint
      const response = await fetch(`/api/phone/status/${phoneNumber.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`SMSPVA API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('SMSPVA messages response:', data);

      // The status endpoint returns { status: 'success', data: { messages: [...] } }
      const messages = data.data?.messages || data.messages || [];
      if (messages && messages.length > 0) {
        // Store messages in database
        for (const msg of messages) {
          try {
            const { error } = await supabase
              .from('phone_messages')
              .upsert({
                phone_number_id: phoneNumber.id,
                sender: msg.sender || 'SMSPVA',
                message: msg.text || msg.message,
                received_at: msg.received_at || new Date().toISOString()
              }, {
                onConflict: 'phone_number_id,sender,message'
              });
              
            if (error) {
              console.error('Error storing SMSPVA message:', error);
            }
          } catch (dbError) {
            console.error('Database error storing SMSPVA message:', dbError);
          }
        }

        // Refresh the messages display
        await fetchMessages(true);
        
        showToast({
          type: 'success',
          title: 'Erfolg',
          message: `${data.messages.length} neue Nachrichten von SMSPVA abgerufen`
        });
      } else {
        showToast({
          type: 'info',
          title: 'Keine Nachrichten',
          message: 'Keine neuen Nachrichten von SMSPVA gefunden'
        });
      }
    } catch (error) {
      console.error('Error fetching SMSPVA messages:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Fehler beim Abrufen der SMSPVA-Nachrichten'
      });
    }
  };

  // Enhanced Anosim API message fetching with sync controller
  const handleAnosimFetch = async (phoneNumber: PhoneNumber) => {
    const bookingId = phoneNumber.order_booking_id || phoneNumber.external_url || phoneNumber.rent_id;
    
    if (!bookingId) {
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Keine Booking-ID für Anosim verfügbar'
      });
      return;
    }

    try {
      console.log('[ANOSIM-FETCH] Fetching messages for booking ID:', bookingId);
      
      // Use the new dedicated Anosim sync endpoint
      const response = await fetch(`/api/phone/sync/anosim/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Anosim sync API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ANOSIM-FETCH] Sync response:', data);

      if (data.status === 'success') {
        // Refresh the messages display
        await fetchMessages(true);
        
        if (data.data && data.data.newMessages > 0) {
          showToast({
            type: 'success',
            title: 'Erfolg',
            message: `${data.data.newMessages} neue Nachrichten von Anosim synchronisiert`
          });
        } else {
          showToast({
            type: 'info',
            title: 'Keine neuen Nachrichten',
            message: 'Alle Anosim-Nachrichten sind bereits synchronisiert'
          });
        }
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('[ANOSIM-FETCH] Error fetching Anosim messages:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Fehler beim Synchronisieren der Anosim-Nachrichten'
      });
    }
  };



  // Debug function to test receive-sms-online scraping
  const testReceiveSmsOnlineScraping = async () => {
    const testUrl = "https://receive-sms-online.info/private.php?phone=447445948164&key=913f7d";
    
    console.log("🧪 Testing receive-sms-online scraping with URL:", testUrl);
    
    try {
      // Test each CORS proxy individually
      const proxyUrls = [
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url='
      ];
      
      for (const proxyUrl of proxyUrls) {
        try {
          console.log(`🧪 Testing proxy: ${proxyUrl}`);
          const response = await fetch(proxyUrl + encodeURIComponent(testUrl), {
            method: 'GET',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            mode: 'cors',
            cache: 'no-cache',
          });
          
          console.log(`🧪 Response status: ${response.status}`);
          
          if (response.ok) {
            const html = await response.text();
            console.log(`🧪 HTML length: ${html.length}`);
            console.log(`🧪 HTML preview:`, html.substring(0, 500));
            
            // Try to parse messages
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const rows = Array.from(doc.querySelectorAll('table tbody tr')).filter(row => {
              const from = row.querySelector('td[data-label="From   :"]')?.textContent?.trim();
              const message = row.querySelector('td[data-label="Message   :"]')?.textContent?.trim();
              const added = row.querySelector('td[data-label="Added   :"]')?.textContent?.trim();
              return from && message && added;
            });
            
            console.log(`🧪 Found ${rows.length} message rows`);
            
            if (rows.length > 0) {
              const messages = rows.map(row => ({
                from: row.querySelector('td[data-label="From   :"]')!.textContent!.trim(),
                message: row.querySelector('td[data-label="Message   :"]')!.textContent!.trim(),
                added: row.querySelector('td[data-label="Added   :"]')!.textContent!.trim()
              }));
              
              console.log(`🧪 Parsed messages:`, messages);
              
              showToast({
                type: 'success',
                title: 'Test Successful',
                message: `Found ${messages.length} messages using ${proxyUrl}`
              });
              return;
            } else {
              console.log(`🧪 No messages found with ${proxyUrl}`);
            }
          } else {
            console.log(`🧪 Proxy ${proxyUrl} failed with status: ${response.status}`);
          }
        } catch (proxyError) {
          console.log(`🧪 Proxy ${proxyUrl} error:`, proxyError);
        }
      }
      
      showToast({
        type: 'error',
        title: 'Test Failed',
        message: 'All CORS proxies failed or no messages found'
      });
      
    } catch (error) {
      console.error('🧪 Test error:', error);
      showToast({
        type: 'error',
        title: 'Test Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Receive-SMS-Online HTML scraping (using working approach from magicdrops-icpo-new)
  const handleReceiveSmsOnlineFetch = async (phoneNumber: PhoneNumber) => {
    console.log('🌐 Starting receive-sms-online fetch for:', phoneNumber.phone_number);
    
    if (!phoneNumber.external_url) {
      console.log('❌ No external_url found for phone number');
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Keine URL für diese Nummer verfügbar'
      });
      return;
    }

    try {
      console.log('🔗 Fetching messages from URL:', phoneNumber.external_url);
      
      // Try multiple CORS proxies (same as working implementation)
      const proxyUrls = [
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url='
      ];
      
      let success = false;
      let html = '';
      
      // Try each proxy until one works
      for (const proxyUrl of proxyUrls) {
        try {
          console.log('Trying proxy:', proxyUrl);
          const response = await fetch(proxyUrl + encodeURIComponent(phoneNumber.external_url));
          
          if (!response.ok) {
            console.log('Proxy failed:', proxyUrl, 'Status:', response.status);
            continue; // Try next proxy
          }
          
          html = await response.text();
          success = true;
          console.log('Successfully fetched HTML with proxy:', proxyUrl);
          break;
        } catch (proxyError) {
          console.log('Error with proxy:', proxyUrl, 'Error:', proxyError);
          // Continue to next proxy
        }
      }
      
      if (!success || !html) {
        throw new Error('All CORS proxies failed to fetch the page');
      }

      // Parse the HTML using the exact same approach as working implementation
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find all table rows with the exact selectors from working implementation
      const rows = Array.from(doc.querySelectorAll('table tbody tr')).filter(row => {
        // Filter out rows that don't have all required cells with content
        const from = row.querySelector('td[data-label="From   :"]')?.textContent?.trim();
        const message = row.querySelector('td[data-label="Message   :"]')?.textContent?.trim();
        const added = row.querySelector('td[data-label="Added   :"]')?.textContent?.trim();
        return from && message && added;
      });
      
      if (!rows || rows.length === 0) {
        console.log('No messages found in HTML');
        showToast({
          type: 'info',
          title: 'Keine Nachrichten',
          message: 'Keine SMS-Nachrichten für diese Nummer gefunden'
        });
        return;
      }

      const parsedMessages = rows.map(row => {
        const from = row.querySelector('td[data-label="From   :"]')!.textContent!.trim();
        const message = row.querySelector('td[data-label="Message   :"]')!.textContent!.trim();
        const added = row.querySelector('td[data-label="Added   :"]')!.textContent!.trim();
        
        return {
          from,
          message,
          added
        };
      });

      console.log('✅ Total parsed messages:', parsedMessages.length, parsedMessages);
      
      // Store messages in database for consistency (simplified approach)
      console.log('💾 Starting to store', parsedMessages.length, 'messages in database...');
      
      for (const msg of parsedMessages) {
        try {
          console.log('💾 Storing message:', { sender: msg.from, message: msg.message });
          
          // Check if message already exists to prevent duplicates
          const { data: existingMessage } = await supabase
            .from('phone_messages')
            .select('id')
            .eq('phone_number_id', phoneNumber.id)
            .eq('sender', msg.from)
            .eq('message', msg.message)
            .maybeSingle();
          
          if (existingMessage) {
            console.log('✅ Message already exists, skipping:', { sender: msg.from, message: msg.message });
            continue;
          }
          
          // Insert new message
          const { data, error } = await supabase
            .from('phone_messages')
            .insert({
              phone_number_id: phoneNumber.id,
              sender: msg.from,
              message: msg.message,
              received_at: new Date().toISOString(),
              message_source: 'scraping'
            })
            .select();
            
          if (error) {
            console.error('❌ Error storing message:', error);
          } else {
            console.log('✅ Successfully stored message:', data);
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
        }
      }
      
      console.log('💾 Finished storing messages in database');
      
      // Force refresh the messages display
      console.log('🔄 Force refreshing messages display...');
      await fetchMessages(true);
      
      showToast({
        type: 'success',
        title: 'SMS abgerufen',
        message: `${parsedMessages.length} Nachrichten erfolgreich abgerufen und in Datenbank gespeichert`
      });
    
    } catch (error) {
      console.error('Error in receive-sms-online fetch:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: `Fehler beim Abrufen der SMS: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // Handle viewing messages for a phone number
  const handleViewMessages = (phoneNumber: PhoneNumber) => {
    console.log('🔍 Opening messages modal for phone number:', {
      id: phoneNumber.id,
      phone_number: phoneNumber.phone_number,
      provider: phoneNumber.provider,
      external_url: phoneNumber.external_url,
      access_key: phoneNumber.access_key
    });
    
    setSelectedPhoneNumber(phoneNumber);
    setIsMessagesModalOpen(true);
  };
  
  // Handle assigning a phone number to an employee
  const handleAssignToEmployee = async () => {
    if (!selectedPhoneNumber || !selectedEmployee) {
      alert('Bitte wählen Sie einen Mitarbeiter aus');
      return;
    }
    
    try {
      await assignPhoneNumber(selectedPhoneNumber.id, selectedEmployee);
      setIsAssignModalOpen(false);
      setSelectedEmployee('');
    } catch (error) {
      console.error('Error assigning phone number:', error);
    }
  };
  
  // Open assign modal
  const openAssignModal = (phoneNumber: PhoneNumber) => {
    setSelectedPhoneNumber(phoneNumber);
    setIsAssignModalOpen(true);
  };

  // Add this function to the PhoneNumbers component
  const handleRefreshServicesData = async () => {
    setStatusMessage({
      type: 'info',
      message: 'Lade Dienste und Länder...'
    });
    
    try {
      const result = await fetchServicesAndCountries(true, rentTime, selectedCountry, selectedProvider);
      
      if (!result || !result.services || Object.keys(result.services).length === 0) {
        setStatusMessage({
          type: 'error',
          message: 'Fehler beim Laden der Dienste. Bitte überprüfen Sie Ihre Verbindung.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          message: `${Object.keys(result.services).length} Dienste und ${Object.keys(result.countries || {}).length} Länder erfolgreich geladen.`
        });
      }
    } catch (error) {
      console.error('Error refreshing services data:', error);
      setStatusMessage({
        type: 'error',
        message: 'Fehler beim Laden der Dienste. Bitte überprüfen Sie Ihre Verbindung.'
      });
    }
  };
  
  return (
    <div className="w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center">
            <FiPhone size={24} className="text-gray-900 dark:text-white mr-4" />
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white flex items-center">
                Telefonnummern
                {loading && (
                  <span className="ml-3 inline-block">
                    <LoadingSpinner size="sm" />
                  </span>
                )}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 font-app">
                Verwalten Sie Ihre gemieteten Telefonnummern für SMS-Dienste
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              leftIcon={<FiRefreshCw size={16} />}
            >
              Aktualisieren
            </Button>
            {/* SMS-Activate Button - only show if API key is configured */}
            {(!loadingProviders && availableProviders?.providers?.sms_activate?.available) && (
              <Button
                size="sm"
                onClick={() => setIsSmsActivateModalOpen(true)}
                disabled={serverStatus === 'unavailable'}
                leftIcon={<FiPlus size={16} />}
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                📱 SMS-Activate
              </Button>
            )}
            
            {/* GoGetSMS Button - only show if API key is configured */}
            {(!loadingProviders && availableProviders?.providers?.gogetsms?.available) && (
              <Button
                size="sm"
                onClick={() => setIsGoGetSmsModalOpen(true)}
                disabled={serverStatus === 'unavailable'}
                leftIcon={<FiGlobe size={16} />}
                style={{ backgroundColor: '#059669', color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                🌍 GoGetSMS
              </Button>
            )}
            
            {/* Anosim Button - only show if API key is configured */}
            {(!loadingProviders && availableProviders?.providers?.anosim?.available) && (
              <Button
                size="sm"
                onClick={() => setIsAnosimModalOpen(true)}
                disabled={serverStatus === 'unavailable'}
                leftIcon={<FiPlus size={16} />}
                style={{ backgroundColor: '#d97706', color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                🇩🇪 Anosim
              </Button>
            )}
            
            {/* SMSPVA Button - only show if API key is configured */}
            {(!loadingProviders && availableProviders?.providers?.smspva?.available) && (
              <Button
                size="sm"
                onClick={() => setIsSmspvaModalOpen(true)}
                disabled={serverStatus === 'unavailable'}
                leftIcon={<FiPlus size={16} />}
                style={{ backgroundColor: '#7c3aed', color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                🇷🇺 SMSPVA
              </Button>
            )}
            
            {/* Loading state for providers */}
            {loadingProviders && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <LoadingSpinner size="sm" />
                <span>Loading providers...</span>
              </div>
            )}
            
            {/* Error state for providers */}
            {providersError && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Provider check failed - showing all options
              </div>
            )}
            


            {/* Manual phone button - always available */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManualPhoneModalOpen(true)}
              disabled={loading}
              leftIcon={<FiLink size={16} />}
            >
              Manual URL
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Server Status Warning */}
      {serverStatus === 'unavailable' && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">SMS API Server nicht verfügbar</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                <p>
                  Der SMS API Server ist derzeit nicht erreichbar. Sie können bestehende Telefonnummern verwalten, aber keine neuen Nummern mieten oder Dienste aktualisieren.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      

      
      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
          <div className="text-red-500 dark:text-red-400 mb-4">
            {error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten'}
          </div>
          <Button 
            onClick={handleRefresh}
            leftIcon={<FiRefreshCw />}
            style={{ backgroundColor: colors.primary, color: 'white' }}
            className="hover:opacity-90 transition-opacity"
          >
            Erneut versuchen
          </Button>
        </div>
      ) : (
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-4">
            {filteredPhoneNumbers.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <FiPhone size={24} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Telefonnummern gefunden</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Mieten Sie eine neue Telefonnummer, um SMS-Dienste zu nutzen.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPhoneNumbers.map((phone) => (
                  <motion.div 
                    key={phone.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <div className="flex items-center">
                        {phone.provider === 'receive_sms_online' ? (
                          <FiGlobe size={18} className="text-blue-500 dark:text-blue-400 mr-2" />
                        ) : phone.provider === 'smspva' ? (
                          <FiPhone size={18} className="text-green-500 dark:text-green-400 mr-2" />
                        ) : (
                        <FiPhone size={18} className="text-gray-500 dark:text-gray-400 mr-2" />
                        )}
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{phone.phone_number}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Provider Badge */}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          phone.provider === 'receive_sms_online' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : phone.provider === 'smspva'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : phone.provider === 'anosim'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : phone.provider === 'gogetsms'
                            ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {phone.provider === 'receive_sms_online' 
                            ? 'Manual' 
                            : phone.provider === 'smspva'
                            ? 'SMSPVA'
                            : phone.provider === 'anosim'
                            ? 'Anosim'
                            : phone.provider === 'gogetsms'
                            ? 'GoGetSMS'
                            : 'SMS-Activate'}
                        </span>
                        {/* Status Badge */}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        phone.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {phone.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                      </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{getServiceName(phone.service)}</div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Land</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{getCountryName(phone.country)}</div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Läuft ab</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDistanceToNow(new Date(phone.end_date), { addSuffix: true })}</div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 col-span-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Zugewiesen an</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {phone.assignee_id ? (
                              (() => {
                                const employee = employees.find(e => e.id === phone.assignee_id);
                                return employee ? `${employee.first_name} ${employee.last_name}` : 'Unbekannt';
                              })()
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic">Nicht zugewiesen</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <button
                        onClick={() => handleViewMessages(phone)}
                        className="flex items-center text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 text-sm"
                        title="Nachrichten anzeigen"
                      >
                        <FiMessageSquare size={16} className="mr-1" />
                        <span>Nachrichten</span>
                        {newMessageCount[phone.id] > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {newMessageCount[phone.id]}
                          </span>
                        )}
                      </button>
                      
                      <div className="flex space-x-3">
                        {!phone.assignee_id && (
                          <button
                            onClick={() => openAssignModal(phone)}
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center p-1.5"
                            title="Mitarbeiter zuweisen"
                          >
                            <FiUserPlus size={20} />
                          </button>
                        )}
                        
                        {phone.provider === 'receive_sms_online' ? (
                          // Manual phone number actions
                          <>
                            <button
                              onClick={() => handleRefreshMessages(phone)}
                              className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 flex items-center p-1.5"
                              title="Nachrichten aktualisieren"
                            >
                              <FiRefreshCw size={20} />
                            </button>
                            
                            <button
                              onClick={() => handleRemoveManualPhone(phone)}
                              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center p-1.5"
                              title="Telefonnummer entfernen"
                            >
                              <FiTrash2 size={20} />
                            </button>
                          </>
                        ) : (
                          // SMS-Activate and SMSPVA phone number actions
                          <>
                        {phone.status === 'active' && (
                          <button
                            onClick={() => handleExtendRental(phone)}
                            className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 flex items-center p-1.5"
                            title="Miete verlängern"
                          >
                            <FiClock size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelRental(phone)}
                          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center p-1.5"
                          title="Miete kündigen"
                        >
                          <FiTrash2 size={20} />
                        </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Rent New Number Modal */}
      <Modal
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        title="Neue Telefonnummer mieten"
      >
        <div className="space-y-4">
          {/* Server Status Indicator */}
          <div className={`py-2 px-3 rounded-md flex items-center text-sm ${
            serverStatus === 'available' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
              : serverStatus === 'unavailable'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              serverStatus === 'available' 
                ? 'bg-green-500' 
                : serverStatus === 'unavailable'
                  ? 'bg-red-500'
                  : 'bg-gray-500'
            }`}></div>
            <span>
              {serverStatus === 'available' 
                ? 'SMS API Server verfügbar' 
                : serverStatus === 'unavailable'
                  ? 'SMS API Server nicht verfügbar'
                  : 'Serverstatus wird geprüft...'}
            </span>
          </div>
          
          {/* Server unavailable warning */}
          {serverStatus === 'unavailable' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Es ist derzeit nicht möglich, neue Nummern zu mieten, da der SMS API Server nicht erreichbar ist.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Add refresh button */}
          <div className="flex justify-end">
            <button
              onClick={handleRefreshServicesData}
              disabled={loading || serverStatus === 'unavailable'}
              className={`inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150 ${
                loading || serverStatus === 'unavailable' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <FiRefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={14} />
              Dienste aktualisieren
            </button>
          </div>
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Anbieter
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedProvider}
              disabled={loading}
              onChange={(e) => {
                handleProviderChange(e.target.value as 'sms_activate' | 'smspva' | 'anosim' | 'gogetsms');
              }}
            >
              <option value="sms_activate">SMS-Activate</option>
              <option value="smspva">SMSPVA</option>
              <option value="anosim">Anosim</option>
              <option value="gogetsms">GoGetSMS</option>
            </select>
          </div>
          
          {/* NEW: GoGetSMS Mode Selector */}
          {selectedProvider === 'gogetsms' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔄 GoGetSMS Modus
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGogetSmsMode('activation')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    gogetSmsMode === 'activation' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  📱 Aktivierung
                  <div className="text-xs opacity-80">Einmalige SMS</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGogetSmsMode('rental')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    gogetSmsMode === 'rental' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  🏢 Vermietung
                  <div className="text-xs opacity-80">Mehrere SMS</div>
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {gogetSmsMode === 'activation' 
                  ? '💡 Optimal für: WhatsApp, Telegram, soziale Medien (günstig, schnell)'
                  : '💡 Optimal für: Geschäftsanwendungen, längere Nutzung (teurer, flexibel)'
                }
              </div>
            </div>
          )}
          
          <div>
            <SearchableDropdown
              label="Dienst"
              value={selectedService}
              onChange={(value) => setSelectedService(value)}
              placeholder={loading ? "Dienste werden geladen..." : "Dienst auswählen"}
              emptyMessage={loading ? "Dienste werden geladen..." : "Keine Dienste gefunden"}
              options={Object.entries(services).length > 0 
                ? Object.entries(services).map(([code, service]) => {
                // Use the service name from the API response if available, otherwise fallback to lookup
                const serviceName = service.name || getServiceName(code);
                const serviceCost = typeof service.cost === 'number' ? service.cost.toFixed(3) : service.cost;
                
                // Add special indicator for German full rentals on Anosim
                const isGermanFullRental = selectedProvider === 'anosim' && (code === 'full_germany' || (code === 'full' && serviceName.includes('Germany')));
                const prefix = isGermanFullRental ? '🇩🇪 ' : '';
                
                return {
                  value: code,
                  label: `${prefix}${serviceName} ($${serviceCost})`
                };
                  })
                : []
              }
            />
            {Object.keys(services).length === 0 && !loading && (
              <p className="mt-2 text-sm text-red-500">
                Keine Dienste verfügbar. Bitte versuchen Sie, die Seite zu aktualisieren.
              </p>
            )}
          </div>
          
          <div>
            <SearchableDropdown
              label="Land"
              value={selectedCountry}
              onChange={(value) => setSelectedCountry(value)}
              placeholder={loading ? "Länder werden geladen..." : "Land auswählen"}
              emptyMessage={loading ? "Länder werden geladen..." : "Keine Länder gefunden"}
              options={[
                { value: 'all_countries', label: 'Alle Länder' },
                ...(Object.entries(countries).length > 0 
                  ? Object.entries(countries).map(([code, name]) => ({
                  value: code,
                  // Use the country name from the API response if it's a string, otherwise fallback to lookup
                  label: typeof name === 'string' ? name : getCountryName(code)
                }))
                  : [])
              ]}
            />
            {Object.keys(countries).length === 0 && !loading && (
              <p className="mt-2 text-sm text-red-500">
                Keine Länder verfügbar. Bitte versuchen Sie, die Seite zu aktualisieren.
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {selectedProvider === 'anosim' && (selectedService === 'full_germany' || selectedService === 'full') ? 
                'Mietdauer (Deutsche Vollvermietung)' : 
                selectedProvider === 'gogetsms' && gogetSmsMode === 'activation' ?
                'Aktivierungsdauer' :
                'Mietdauer (Stunden)'
              }
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={rentTime}
              onChange={(e) => setRentTime(e.target.value)}
            >
              {selectedProvider === 'anosim' && (selectedService === 'full_germany' || selectedService === 'full') ? (
                // German Anosim full rental options
                <>
                  <option value="24">1 Tag - $4.00</option>
                  <option value="168">7 Tage - $10.85</option>
                  <option value="720">30 Tage - $30.00</option>
                  <option value="2160">90 Tage - $60.00</option>
                  <option value="4320">180 Tage - $100.00</option>
                  <option value="8760">360 Tage - $150.00</option>
                </>
              ) : selectedProvider === 'gogetsms' && gogetSmsMode === 'activation' ? (
                // GoGetSMS Activation mode options (typically short duration)
                <>
                  <option value="1">Bis SMS empfangen (≈5-30 Min)</option>
                  <option value="4">4 Stunden (Backup)</option>
                </>
              ) : (
                // Standard options for other providers/services
                <>
                  <option value="4">4 Stunden</option>
                  <option value="12">12 Stunden</option>
                  <option value="24">1 Tag (24 Stunden)</option>
                  <option value="48">2 Tage (48 Stunden)</option>
                  <option value="72">3 Tage (72 Stunden)</option>
                  <option value="96">4 Tage (96 Stunden)</option>
                  <option value="120">5 Tage (120 Stunden)</option>
                  <option value="144">6 Tage (144 Stunden)</option>
                  <option value="168">7 Tage (168 Stunden)</option>
                </>
              )}
            </select>
            {selectedProvider === 'anosim' && (selectedService === 'full_germany' || selectedService === 'full') && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                🇩🇪 Deutsche Vollvermietung - alle SMS-Dienste verfügbar
              </p>
            )}
          </div>
          
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-md ${
              statusMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
              statusMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
              statusMessage.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
            }`}>
              <div className="flex items-center">
                <span className="mr-2">
                  {statusMessage.type === 'error' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : statusMessage.type === 'success' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : statusMessage.type === 'warning' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-medium">{statusMessage.message}</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => {
                setIsRentModalOpen(false);
                setStatusMessage(null);
              }}
              variant="secondary"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleRentNumber}
              disabled={!selectedService || loading || serverStatus === 'unavailable'}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className="hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
                  Wird bearbeitet...
                </div>
              ) : (
                'Nummer mieten'
              )}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Assign to Employee Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Telefonnummer einem Mitarbeiter zuweisen"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefonnummer
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
              {selectedPhoneNumber?.phone_number}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mitarbeiter
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Mitarbeiter auswählen</option>
              {employees
                .filter(emp => emp.role === 'employee')
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {`${employee.first_name} ${employee.last_name}`}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setIsAssignModalOpen(false)}
              variant="secondary"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAssignToEmployee}
              disabled={!selectedEmployee}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className="hover:opacity-90 transition-opacity"
            >
              Zuweisen
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Messages Modal */}
      <Modal
        isOpen={isMessagesModalOpen}
        onClose={() => setIsMessagesModalOpen(false)}
        title={`Nachrichten für ${selectedPhoneNumber?.phone_number}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Add refresh button for immediate fetching */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedPhoneNumber?.provider === 'receive_sms_online' && selectedPhoneNumber?.external_url && (
                <span className="break-all">{selectedPhoneNumber.external_url}</span>
              )}
            </div>
            <Button
              onClick={async () => {
                console.log('🔘 SMS Aktualisieren clicked for phone number:', {
                  provider: selectedPhoneNumber?.provider,
                  external_url: selectedPhoneNumber?.external_url,
                  rent_id: selectedPhoneNumber?.rent_id,
                  phone_number: selectedPhoneNumber?.phone_number,
                  id: selectedPhoneNumber?.id
                });
                
                if (selectedPhoneNumber?.provider === 'receive_sms_online' && selectedPhoneNumber?.external_url) {
                  console.log('🚀 Using direct SMS fetch for receive-sms-online');
                  // Direct fetch from receive-sms-online URL
                  await handleDirectSMSFetch(selectedPhoneNumber);
                } else if (selectedPhoneNumber?.provider === 'smspva') {
                  console.log('🔄 Using SMSPVA API fetch');
                  try {
                    // Call the SMSPVA API directly (same logic as in usePhoneMessages hook)
                    const response = await fetch(`/api/phone/status/${selectedPhoneNumber.id}`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });

                    if (!response.ok) {
                      throw new Error(`SMSPVA API error: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('SMSPVA messages response:', data);

                    // The status endpoint returns { status: 'success', data: { messages: [...] } }
                    const messages = data.data?.messages || data.messages || [];
                    if (messages && messages.length > 0) {
                      // Store messages in database
                      for (const msg of messages) {
                        try {
                          const { error } = await supabase
                            .from('phone_messages')
                            .upsert({
                              phone_number_id: selectedPhoneNumber.id,
                              sender: msg.sender || 'SMSPVA',
                              message: msg.text || msg.message || '',
                              received_at: msg.received_at || new Date().toISOString(),
                              message_source: 'api'
                            }, {
                              onConflict: 'phone_number_id,sender,message'
                            });

                          if (error) {
                            console.error('Error storing SMSPVA message:', error);
                          }
                        } catch (insertError) {
                          console.error('Error inserting SMSPVA message:', insertError);
                        }
                      }
                      
                      showToast({
                        type: 'success',
                        title: 'Success',
                        message: `Found and stored ${messages.length} new messages`
                      });
                      
                      // Refresh the messages in the modal by closing and reopening
                      setIsMessagesModalOpen(false);
                      setTimeout(() => {
                        setIsMessagesModalOpen(true);
                      }, 100);
                    } else {
                      showToast({
                        type: 'info',
                        title: 'No Messages',
                        message: 'No new messages found on SMSPVA'
                      });
                    }
                  } catch (error) {
                    console.error('Error fetching SMSPVA messages:', error);
                    showToast({
                      type: 'error',
                      title: 'Error',
                      message: 'Failed to fetch SMSPVA messages'
                    });
                  }
                } else if (selectedPhoneNumber?.provider === 'gogetsms') {
                  console.log('🔄 Using GoGetSMS API fetch');
                  try {
                    // Call the GoGetSMS API directly (same logic as in usePhoneMessages hook)
                    const response = await fetch(`/api/phone/status/${selectedPhoneNumber.id}`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });

                    if (!response.ok) {
                      throw new Error(`GoGetSMS API error: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('GoGetSMS messages response:', data);

                    // The status endpoint returns { status: 'success', data: { messages: [...] } }
                    const messages = data.data?.messages || data.messages || [];
                    if (messages && messages.length > 0) {
                      // Store messages in database
                      for (const msg of messages) {
                        try {
                          const { error } = await supabase
                            .from('phone_messages')
                            .upsert({
                              phone_number_id: selectedPhoneNumber.id,
                              sender: msg.sender || 'GoGetSMS',
                              message: msg.text || msg.message || '',
                              received_at: msg.received_at || new Date().toISOString(),
                              message_source: 'api'
                            }, {
                              onConflict: 'phone_number_id,sender,message'
                            });

                          if (error) {
                            console.error('Error storing GoGetSMS message:', error);
                          }
                        } catch (insertError) {
                          console.error('Error inserting GoGetSMS message:', insertError);
                        }
                      }
                      
                      showToast({
                        type: 'success',
                        title: 'Success',
                        message: `Found and stored ${messages.length} new messages`
                      });
                      
                      // Refresh the messages in the modal by closing and reopening
                      setIsMessagesModalOpen(false);
                      setTimeout(() => {
                        setIsMessagesModalOpen(true);
                      }, 100);
                    } else {
                      showToast({
                        type: 'info',
                        title: 'No Messages',
                        message: 'No new messages found on GoGetSMS'
                      });
                    }
                  } catch (error) {
                    console.error('Error fetching GoGetSMS messages:', error);
                    showToast({
                      type: 'error',
                      title: 'Error',
                      message: 'Failed to fetch GoGetSMS messages'
                    });
                  }
                } else if (selectedPhoneNumber?.provider === 'anosim') {
                  console.log('🔄 Using Anosim API sync');
                  try {
                    // Use the enhanced Anosim sync endpoint
                    const bookingId = selectedPhoneNumber.order_booking_id || selectedPhoneNumber.external_url || selectedPhoneNumber.rent_id;
                    
                    if (!bookingId) {
                      throw new Error('No booking ID available for Anosim phone number');
                    }
                    
                    console.log(`[ANOSIM-MODAL] Syncing booking ID: ${bookingId}`);
                    
                    const response = await fetch(`/api/phone/sync/anosim/${bookingId}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });

                    if (!response.ok) {
                      throw new Error(`Anosim sync API error: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('[ANOSIM-MODAL] Sync response:', data);

                    if (data.status === 'success') {
                      const newMessageCount = data.data?.newMessages || 0;
                      
                      if (newMessageCount > 0) {
                        showToast({
                          type: 'success',
                          title: 'Erfolg',
                          message: `${newMessageCount} neue Anosim-Nachrichten synchronisiert`
                        });
                      } else {
                        showToast({
                          type: 'info',
                          title: 'Keine neuen Nachrichten',
                          message: 'Alle Anosim-Nachrichten sind bereits synchronisiert'
                        });
                      }
                      
                      // Refresh the messages in the modal by closing and reopening
                      setIsMessagesModalOpen(false);
                      setTimeout(() => {
                        setIsMessagesModalOpen(true);
                      }, 100);
                    } else {
                      throw new Error(data.message || 'Anosim sync failed');
                    }
                  } catch (error) {
                    console.error('[ANOSIM-MODAL] Error syncing Anosim messages:', error);
                    showToast({
                      type: 'error',
                      title: 'Fehler',
                      message: 'Fehler beim Synchronisieren der Anosim-Nachrichten'
                    });
                  }
                } else {
                  console.log('🔄 Using existing refresh logic for provider:', selectedPhoneNumber?.provider);
                  // Use existing refresh logic for other providers
                  await handleRefreshMessages(selectedPhoneNumber!);
                }
              }}
              variant="outline"
              size="sm"
              disabled={loadingMessages}
              leftIcon={<FiRefreshCw size={16} />}
            >
              {loadingMessages ? 'Lädt...' : 'SMS Aktualisieren'}
            </Button>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="md" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Keine Nachrichten für diese Nummer gefunden
              {selectedPhoneNumber?.provider === 'receive_sms_online' && (
                <div className="mt-2 text-xs">
                  Klicken Sie auf "SMS Aktualisieren" um die neuesten Nachrichten direkt abzurufen
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => {
                // Extract verification codes from message text
                const extractCode = (text: string): string | null => {
                  const patterns = [
                    /\b\d{6}\b/, // Six digit number
                    /\b\d{4}\b/, // Four digit number  
                    /\b[A-Z0-9]{5,8}\b/ // 5-8 alphanumeric code
                  ];
                  
                  for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) return match[0];
                  }
                  return null;
                };

                const code = extractCode(message.message);

                return (
                <motion.div 
                  key={message.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900 dark:text-white">{message.sender}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.received_at).toLocaleString()}
                    </div>
                  </div>
                    <div className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.message}</div>
                    {code && (
                      <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        Code: {code}
                      </div>
                    )}
                </motion.div>
                );
              })}
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setIsMessagesModalOpen(false)}
              variant="secondary"
            >
              Schließen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Manual Phone Modal */}
      <Modal
        isOpen={isManualPhoneModalOpen}
        onClose={() => setIsManualPhoneModalOpen(false)}
        title="Add Manual Phone Number"
        size="lg"
      >
        <AddManualPhoneModalContent
          onClose={() => setIsManualPhoneModalOpen(false)}
          onAdd={handleAddManualPhone}
          loading={addingManualPhone}
        />
      </Modal>

      {/* Provider-specific rental modals */}
      <SmsActivateModal
        isOpen={isSmsActivateModalOpen}
        onClose={() => setIsSmsActivateModalOpen(false)}
        onRent={handleProviderRent}
        loading={loading}
      />
      
      <GoGetSmsModal
        isOpen={isGoGetSmsModalOpen}
        onClose={() => setIsGoGetSmsModalOpen(false)}
        onRent={handleProviderRent}
        loading={loading}
      />
      
      <AnosimModal
        isOpen={isAnosimModalOpen}
        onClose={() => setIsAnosimModalOpen(false)}
        onRent={handleProviderRent}
        loading={loading}
      />
      
      <SmspvaModal
        isOpen={isSmspvaModalOpen}
        onClose={() => setIsSmspvaModalOpen(false)}
        onRent={handleProviderRent}
        loading={loading}
      />
    </div>
  );
}

export default PhoneNumbers;