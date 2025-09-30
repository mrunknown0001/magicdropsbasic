import React, { useState, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import BaseModal from './BaseModal';
import Button from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import { phoneApiClient } from '../../../api/phoneApiClient';
import type { ProviderModalProps, ServiceOption, CountryOption, TimeOption } from './types';

// Searchable Select Component
interface SearchableSelectProps {
  options: (ServiceOption | CountryOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    const filtered = options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  const selectedOption = options.find(option => option.code === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
          cursor-pointer flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 dark:hover:border-blue-400'}
          ${isOpen ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
            >
              <FiX className="h-3 w-3" />
            </button>
          )}
          <FiChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.code}
                  className={`
                    px-3 py-2 cursor-pointer text-sm
                    ${value === option.code
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100'
                    }
                  `}
                  onClick={() => handleSelect(option.code)}
                >
                  <div className="font-medium">{option.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Code: {option.code}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Keine Ergebnisse gefunden
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AnosimModal: React.FC<ProviderModalProps> = ({ isOpen, onClose, onRent, loading = false }) => {
  const [mode, setMode] = useState<'activation' | 'rental'>('rental');
  const [service, setService] = useState('full_germany');
  const [country, setCountry] = useState('98');
  const [rentTime, setRentTime] = useState('168');
  const [apiServices, setApiServices] = useState<ServiceOption[]>([]);
  const [apiCountries, setApiCountries] = useState<CountryOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const { showToast } = useToast();

  // Complete Anosim activation services (based on existing service mappings)
  const activationServices: ServiceOption[] = [
    { code: 'wa', name: 'WhatsApp' },
    { code: 'tg', name: 'Telegram' },
    { code: 'go', name: 'Google/Gmail/YouTube' },
    { code: 'fb', name: 'Facebook' },
    { code: 'ig', name: 'Instagram' },
    { code: 'tw', name: 'Twitter' },
    { code: 'ds', name: 'Discord' },
    { code: 'am', name: 'Amazon' },
    { code: 'ap', name: 'Apple' },
    { code: 'ms', name: 'Microsoft' },
    { code: 'vi', name: 'Viber' },
    { code: 'wb', name: 'WeChat' },
    { code: 'lf', name: 'TikTok' },
    { code: 'oi', name: 'Tinder' },
    { code: 'nt', name: 'Netflix' },
    { code: 'li', name: 'LinkedIn' },
    { code: 'sn', name: 'Snapchat' },
    { code: 'vk', name: 'VK' },
    { code: 'ot', name: 'Andere Dienste' }
  ];

  // Complete Anosim rental services (based on service implementation)
  const rentalServices: ServiceOption[] = [
    // Full country rentals (priority)
    { code: 'full_germany', name: 'Deutschland - Vollmiete (alle Dienste)' },
    { code: 'full_czechrepublic', name: 'Tschechische Republik - Vollmiete' },
    { code: 'full_lithuania', name: 'Litauen - Vollmiete' },
    { code: 'full_netherlands', name: 'Niederlande - Vollmiete' },
    { code: 'full_poland', name: 'Polen - Vollmiete' },
    { code: 'full_portugal', name: 'Portugal - Vollmiete' },
    { code: 'full_southafrica', name: 'Südafrika - Vollmiete' },
    { code: 'full_sweden', name: 'Schweden - Vollmiete' },
    { code: 'full_unitedkingdom', name: 'Vereinigtes Königreich - Vollmiete' },
    { code: 'full_cyprus', name: 'Zypern - Vollmiete' },
    { code: 'full_kenya', name: 'Kenia - Vollmiete' },
    { code: 'full', name: 'Beste Vollmiete (automatische Auswahl)' },
    // Service-specific rentals
    ...activationServices.filter(s => s.code !== 'ot').map(s => ({
      code: s.code,
      name: s.name + ' (Dienst-spezifische Miete)'
    })),
    { code: 'ot', name: 'Andere Dienste (Dienst-spezifische Miete)' }
  ];

  // Complete Anosim countries (based on service implementation)
  const anosimCountries: CountryOption[] = [
    { code: '98', name: 'Deutschland' },
    { code: '67', name: 'Tschechische Republik' },
    { code: '165', name: 'Litauen' },
    { code: '196', name: 'Niederlande' },
    { code: '220', name: 'Polen' },
    { code: '221', name: 'Portugal' },
    { code: '252', name: 'Südafrika' },
    { code: '261', name: 'Schweden' },
    { code: '286', name: 'Vereinigtes Königreich' },
    { code: '77', name: 'Zypern' },
    { code: '8', name: 'Kenia' }
  ];

  // Anosim rental times (based on service pricing)
  const anosimRentalTimes: TimeOption[] = [
    { value: '4', label: '4 Stunden - $3.00' },
    { value: '24', label: '1 Tag - $4.00' },
    { value: '168', label: '7 Tage - $10.85 (Empfohlen)' },
    { value: '720', label: '30 Tage - $30.00' },
    { value: '2160', label: '90 Tage - $60.00' },
    { value: '4320', label: '180 Tage - $100.00' },
    { value: '8760', label: '360 Tage - $150.00' }
  ];

  // Activation times (shorter durations)
  const activationTimes: TimeOption[] = [
    { value: '4', label: '4 Stunden' },
    { value: '24', label: '1 Tag' },
    { value: '72', label: '3 Tage' }
  ];

  // Fetch services from API when mode changes
  useEffect(() => {
    const fetchServices = async () => {
      if (!isOpen) return;

      setServicesLoading(true);
      try {
        console.log(`[ANOSIM MODAL] Fetching ${mode} services...`);
        const data = await phoneApiClient.getServicesAndCountries('168', '98', 'anosim', mode);
        
        // Transform API services to ServiceOption format
        const transformedServices: ServiceOption[] = Object.entries(data.services || {}).map(([code, info]: [string, any]) => ({
          code,
          name: info.name || code
        }));

        // Transform API countries to CountryOption format
        const transformedCountries: CountryOption[] = Object.entries(data.countries || {}).map(([code, name]: [string, any]) => ({
          code,
          name: typeof name === 'string' ? name : name.name || code
        }));

        setApiServices(transformedServices);
        setApiCountries(transformedCountries);

        // Reset selection to first available if current selection is not available
        if (transformedServices.length > 0) {
          const hasCurrentService = transformedServices.some(s => s.code === service);
          if (!hasCurrentService) {
            setService(mode === 'rental' ? 'full_germany' : transformedServices[0]?.code || 'go');
          }
        }

        if (transformedCountries.length > 0) {
          const hasCurrentCountry = transformedCountries.some(c => c.code === country);
          if (!hasCurrentCountry) {
            setCountry(transformedCountries[0]?.code || '98');
          }
        }

        console.log(`[ANOSIM MODAL] Loaded ${transformedServices.length} services and ${transformedCountries.length} countries for ${mode} mode`);
      } catch (error) {
        console.error(`[ANOSIM MODAL] Error fetching ${mode} services:`, error);
        showToast({
          title: 'Fehler',
          message: `Fehler beim Laden der ${mode === 'activation' ? 'Aktivierungs' : 'Miet'}-Services`,
          type: 'error'
        });
        
        // Fallback to hardcoded lists on error
        if (mode === 'activation') {
          setApiServices(activationServices);
        } else {
          setApiServices(rentalServices);
        }
        setApiCountries(anosimCountries);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, [mode, isOpen]);

  const handleRent = async () => {
    if (!service || !country || !rentTime) {
      showToast({
        title: 'Fehler',
        message: 'Bitte füllen Sie alle Felder aus',
        type: 'error'
      });
      return;
    }

    try {
      await onRent({
        provider: 'anosim',
        service,
        rentTime,
        country,
        mode
      });
      setService(mode === 'rental' ? 'full_germany' : 'go');
      setCountry('98');
      setRentTime(mode === 'rental' ? '168' : '4');
      onClose();
    } catch (error) {
      console.error('Error renting number:', error);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Anosim - Premium deutsche Nummern"
      size="lg"
    >
      <div className="space-y-4">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modus
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('activation')}
              className={`p-3 text-left border-2 rounded-lg transition-colors ${
                mode === 'activation'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="font-semibold">Aktivierung</div>
              <div className="text-xs opacity-75">Eine SMS, günstiger</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('rental')}
              className={`p-3 text-left border-2 rounded-lg transition-colors ${
                mode === 'rental'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="font-semibold">Miete</div>
              <div className="text-xs opacity-75">Mehrere SMS, längere Laufzeit</div>
            </button>
          </div>
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dienst {servicesLoading && <span className="text-xs text-gray-500">(Lädt...)</span>}
          </label>
          <SearchableSelect
            options={apiServices.length > 0 ? apiServices : (mode === 'activation' ? activationServices : rentalServices)}
            value={service}
            onChange={setService}
            placeholder={servicesLoading ? "Services werden geladen..." : "Dienst auswählen..."}
            disabled={loading || servicesLoading}
          />
        </div>

        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Land {servicesLoading && <span className="text-xs text-gray-500">(Lädt...)</span>}
          </label>
          <SearchableSelect
            options={apiCountries.length > 0 ? apiCountries : anosimCountries}
            value={country}
            onChange={setCountry}
            placeholder={servicesLoading ? "Länder werden geladen..." : "Land auswählen..."}
            disabled={loading || servicesLoading}
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {mode === 'activation' ? 'Gültigkeitsdauer' : 'Mietdauer'}
          </label>
          <select
            value={rentTime}
            onChange={(e) => setRentTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            disabled={loading}
          >
            {(mode === 'activation' ? activationTimes : anosimRentalTimes).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {mode === 'activation' 
              ? 'Aktivierungen sind ideal für einmalige Verifizierungen'
              : 'Vollmieten funktionieren mit allen Diensten und bieten das beste Preis-Leistungs-Verhältnis'
            }
          </p>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            {mode === 'activation' ? 'Aktivierung' : 'Premium-Miete'} Vorteile:
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            {mode === 'activation' ? (
              <>
                <li>✅ Günstig für einmalige Verifizierungen</li>
                <li>✅ Schnelle SMS-Zustellung</li>
                <li>✅ Ideal für Account-Erstellung</li>
                <li>✅ Europaweite Abdeckung</li>
              </>
            ) : (
              <>
                <li>✅ Premium deutsche Mobilnummern</li>
                <li>✅ Alle SMS-Dienste unterstützt</li>
                <li>✅ Hohe Zustellrate</li>
                <li>✅ Auto-Verlängerungsoptionen</li>
                <li>✅ 24/7 Nummernverfügbarkeit</li>
              </>
            )}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleRent}
            disabled={loading}
            className="hover:opacity-90 transition-opacity"
          >
            {loading ? 'Wird gemietet...' : (mode === 'activation' ? 'Aktivierung starten' : 'Nummer mieten')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default AnosimModal; 