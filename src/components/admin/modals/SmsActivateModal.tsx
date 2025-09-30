import React, { useState } from 'react';
import BaseModal from './BaseModal';
import Button from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import { useSettingsContext } from '../../../context/SettingsContext';
import type { ProviderModalProps, ServiceOption, CountryOption } from './types';

const SmsActivateModal: React.FC<ProviderModalProps> = ({ isOpen, onClose, onRent, loading }) => {
  const [service, setService] = useState('');
  const [rentTime, setRentTime] = useState('4');
  const [country, setCountry] = useState('0');
  const [operator, setOperator] = useState('any');
  const [incomingCall, setIncomingCall] = useState(false);
  
  const { showToast } = useToast();
  const { colors } = useSettingsContext();

  // Popular SMS-Activate services with proper names
  const popularServices: ServiceOption[] = [
    { code: 'full', name: 'Vollständige Nummer (Full Rental)', cost: '~$4.78' },
    { code: 'wa', name: 'WhatsApp', cost: '~$0.50' },
    { code: 'tg', name: 'Telegram', cost: '~$0.30' },
    { code: 'go', name: 'Google/Gmail', cost: '~$0.60' },
    { code: 'fb', name: 'Facebook', cost: '~$0.80' },
    { code: 'ig', name: 'Instagram', cost: '~$0.90' },
    { code: 'tw', name: 'Twitter/X', cost: '~$1.20' },
    { code: 'ds', name: 'Discord', cost: '~$0.70' },
    { code: 'vi', name: 'Viber', cost: '~$0.40' },
    { code: 'other', name: 'Andere Dienste', cost: 'Variabel' }
  ];

  const popularCountries: CountryOption[] = [
    { code: '43', name: 'Deutschland 🇩🇪' },
    { code: '16', name: 'UK 🇬🇧' },
    { code: '33', name: 'Frankreich 🇫🇷' },
    { code: '39', name: 'Italien 🇮🇹' },
    { code: '34', name: 'Spanien 🇪🇸' },
    { code: '31', name: 'Niederlande 🇳🇱' },
    { code: '7', name: 'USA 🇺🇸' },
    { code: '0', name: 'Russland 🇷🇺' },
    { code: '187', name: 'Philippinen 🇵🇭' }
  ];

  const rentTimeOptions = [
    { value: '4', label: '4 Stunden - Kurzzeitmiete' },
    { value: '24', label: '1 Tag (24 Stunden)' },
    { value: '72', label: '3 Tage (72 Stunden)' },
    { value: '168', label: '7 Tage (168 Stunden)' },
  ];

  const handleRent = async () => {
    if (!service) {
      showToast({ type: 'error', title: 'Fehler', message: 'Bitte wählen Sie einen Service' });
      return;
    }

    try {
      await onRent({
        provider: 'sms_activate',
        service,
        rentTime,
        country,
        operator,
        incomingCall
      });
      onClose();
    } catch (error: any) {
      showToast({ 
        type: 'error', 
        title: 'Fehler bei der Miete', 
        message: error.message || 'SMS-Activate Nummer konnte nicht gemietet werden' 
      });
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="📱 SMS-Activate - Nummer mieten">
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>SMS-Activate</strong> - Globaler SMS-Empfangsdienst mit wettbewerbsfähigen Preisen
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Service
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={service}
            onChange={(e) => setService(e.target.value)}
            disabled={loading}
          >
            <option value="">Service auswählen...</option>
            {popularServices.map((svc) => (
              <option key={svc.code} value={svc.code}>
                {svc.name} {svc.cost && `- ${svc.cost}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Land
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={loading}
          >
            {popularCountries.map((ctry) => (
              <option key={ctry.code} value={ctry.code}>
                {ctry.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mietdauer
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={rentTime}
            onChange={(e) => setRentTime(e.target.value)}
            disabled={loading}
          >
            {rentTimeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="incoming-call"
            checked={incomingCall}
            onChange={(e) => setIncomingCall(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="incoming-call" className="text-sm text-gray-700 dark:text-gray-300">
            Unterstützung für eingehende Anrufe einbeziehen
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button onClick={onClose} variant="secondary">
            Abbrechen
          </Button>
          <Button
            onClick={handleRent}
            disabled={!service || loading}
            style={{ backgroundColor: colors.primary, color: 'white' }}
            className="hover:opacity-90 transition-opacity"
          >
            {loading ? 'Wird gemietet...' : 'Nummer mieten'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default SmsActivateModal; 