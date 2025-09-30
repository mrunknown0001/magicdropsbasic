import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import { useSettingsContext } from '../../../context/SettingsContext';
import { phoneApiClient } from '../../../api/phoneApiClient';
import type { ProviderModalProps, ServiceOption, CountryOption } from './types';

const SmspvaModal: React.FC<ProviderModalProps> = ({ isOpen, onClose, onRent, loading }) => {
  const [service, setService] = useState('');
  const [rentTime, setRentTime] = useState('4');
  const [country, setCountry] = useState('DE'); // Default to Germany
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const { showToast } = useToast();
  const { colors } = useSettingsContext();

  // Fetch services and countries when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchServicesAndCountries();
    }
  }, [isOpen]);

  const fetchServicesAndCountries = async () => {
    try {
      setLoadingData(true);
      console.log('Fetching SMSPVA services and countries...');
      
      const data = await phoneApiClient.getServicesAndCountries('4', 'all_countries', 'smspva', 'rental');
      
      // Transform services data - handle array format from SMSPVA
      let servicesList: ServiceOption[] = [];
      if (Array.isArray(data.services)) {
        servicesList = data.services.map((svc: any) => ({
          code: svc.service || svc.code,
          name: svc.name || svc.service || svc.code,
          cost: svc.cost ? `~$${svc.cost}` : undefined
        }));
      } else if (typeof data.services === 'object') {
        servicesList = Object.entries(data.services).map(([code, info]) => ({
          code,
          name: (info as any).name || code,
          cost: (info as any).cost ? `~$${(info as any).cost}` : undefined
        }));
      }
      
      // Transform countries data - handle array format from SMSPVA
      let countriesList: CountryOption[] = [];
      if (Array.isArray(data.countries)) {
        countriesList = data.countries.map((country: any) => ({
          code: country.code || country.id,
          name: country.name || country.code || country.id
        }));
      } else if (typeof data.countries === 'object') {
        countriesList = Object.entries(data.countries).map(([code, name]) => ({
          code,
          name: typeof name === 'string' ? name : code
        }));
      }
      
      console.log(`Loaded ${servicesList.length} services and ${countriesList.length} countries for SMSPVA`);
      
      setServices(servicesList);
      setCountries(countriesList);
      
      // Set default selections if not already set
      if (servicesList.length > 0 && !service) {
        setService(servicesList[0].code);
      }
      if (countriesList.length > 0 && !country) {
        setCountry(countriesList[0].code);
      }
      
    } catch (error) {
      console.error('Error fetching SMSPVA data:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Konnte Services und Länder nicht laden'
      });
      
      // Fallback to hardcoded data
      const fallbackServices: ServiceOption[] = [
        { code: 'opt1', name: 'WhatsApp', cost: '~$0.40' },
        { code: 'opt2', name: 'Telegram', cost: '~$0.25' },
        { code: 'opt3', name: 'Google/Gmail', cost: '~$0.55' },
        { code: 'opt4', name: 'Facebook', cost: '~$0.75' },
        { code: 'opt5', name: 'Instagram', cost: '~$0.85' },
        { code: 'opt6', name: 'Twitter/X', cost: '~$1.10' },
        { code: 'opt7', name: 'Discord', cost: '~$0.65' }
      ];

      const fallbackCountries: CountryOption[] = [
        { code: 'DE', name: 'Deutschland 🇩🇪' },
        { code: 'US', name: 'United States 🇺🇸' },
        { code: 'UK', name: 'United Kingdom 🇬🇧' },
        { code: 'FR', name: 'France 🇫🇷' },
        { code: 'IT', name: 'Italy 🇮🇹' },
        { code: 'RU', name: 'Russland 🇷🇺' },
        { code: 'UA', name: 'Ukraine 🇺🇦' },
        { code: 'KZ', name: 'Kasachstan 🇰🇿' },
        { code: 'PL', name: 'Polen 🇵🇱' },
        { code: 'LT', name: 'Litauen 🇱🇹' }
      ];
      
      setServices(fallbackServices);
      setCountries(fallbackCountries);
    } finally {
      setLoadingData(false);
    }
  };

  const smspvaRentTimes = [
    { value: '4', label: '4 Stunden' },
    { value: '24', label: '1 Tag (24 Stunden)' },
    { value: '72', label: '3 Tage (72 Stunden)' },
    { value: '168', label: '7 Tage (168 Stunden)' }
  ];

  const handleRent = async () => {
    if (!service) {
      showToast({ type: 'error', title: 'Fehler', message: 'Bitte wählen Sie einen Service' });
      return;
    }

    try {
      await onRent({
        provider: 'smspva',
        service,
        rentTime,
        country,
      });
      onClose();
    } catch (error: any) {
      showToast({ 
        type: 'error', 
        title: 'Fehler bei der Miete', 
        message: error.message || 'SMSPVA Nummer konnte nicht gemietet werden' 
      });
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="🇷🇺 SMSPVA - Osteuropa-Spezialist">
      <div className="space-y-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <strong>SMSPVA</strong> - Zuverlässiger Service für osteuropäische Telefonnummern
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
            disabled={loading || loadingData}
          >
            <option value="">{loadingData ? 'Lade Services...' : 'Service auswählen...'}</option>
            {services.map((svc) => (
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
            disabled={loading || loadingData}
          >
            {loadingData && countries.length === 0 && (
              <option value="">Lade Länder...</option>
            )}
            {countries.map((ctry) => (
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
            {smspvaRentTimes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button onClick={onClose} variant="secondary" disabled={loading || loadingData}>
            Abbrechen
          </Button>
          <Button
            onClick={handleRent}
            disabled={!service || loading || loadingData}
            style={{ backgroundColor: colors.primary, color: 'white' }}
            className="hover:opacity-90 transition-opacity"
          >
            {loadingData ? 'Lade Daten...' : loading ? 'Wird gemietet...' : 'Nummer mieten'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default SmspvaModal; 