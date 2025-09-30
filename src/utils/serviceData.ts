import serviceData from '../data/services.json';
import countriesData from '../data/countries.json';

// Define the service interface based on the JSON structure
interface ServiceInfo {
  code: string;
  name: string;
  f: string | number;
}

// Create a mapping of service codes to their human-readable names
const serviceCodeToNameMap: Record<string, string> = {};

// Process the service data to create the mapping with better error handling
try {
  // Check if serviceData is an array
  if (Array.isArray(serviceData)) {
    serviceData.forEach((service: ServiceInfo) => {
      if (service && service.code && service.name) {
        serviceCodeToNameMap[service.code] = service.name;
      }
    });
    console.log(`Loaded ${Object.keys(serviceCodeToNameMap).length} services successfully`);
  } else {
    console.error('Service data is not an array:', typeof serviceData);
  }
} catch (error) {
  console.error('Error processing service data:', error);
}

// Create a mapping of country codes to their human-readable names
const countryCodeToNameMap: Record<string, string> = {};

// Process the country data to create the mapping with better error handling
try {
  if (countriesData && typeof countriesData === 'object') {
    Object.entries(countriesData).forEach(([code, name]) => {
      if (code && typeof name === 'string') {
        countryCodeToNameMap[code] = name;
      }
    });
    console.log(`Loaded ${Object.keys(countryCodeToNameMap).length} countries successfully`);
  } else {
    console.error('Country data is not an object:', typeof countriesData);
  }
} catch (error) {
  console.error('Error processing country data:', error);
}

/**
 * Get a human-readable service name from a service code
 */
export const getServiceName = (code: string): string => {
  if (!code) return 'Unknown Service';
  return serviceCodeToNameMap[code] || `Service ${code}`;
};

/**
 * Get a human-readable country name from a country code or country name
 */
export const getCountryName = (code: string): string => {
  if (!code) return 'Unknown Country';
  
  // If it's already a readable country name (e.g., "Germany", "UnitedKingdom"), format it nicely
  if (isNaN(Number(code)) && code.length > 2) {
    // Handle special cases for better formatting
    const countryFormatting: Record<string, string> = {
      'Germany': 'Germany',
      'UnitedKingdom': 'United Kingdom',
      'CzechRepublic': 'Czech Republic',
      'Lithuania': 'Lithuania',
      'Netherlands': 'Netherlands',
      'Poland': 'Poland',
      'Portugal': 'Portugal',
      'SouthAfrica': 'South Africa',
      'Sweden': 'Sweden',
      'Cyprus': 'Cyprus',
      'Kenya': 'Kenya'
    };
    
    return countryFormatting[code] || code;
  }
  
  // Otherwise lookup by numeric code
  return countryCodeToNameMap[code] || `Country ${code}`;
};

// We no longer need fallback mappings as we have the complete country data from the JSON file
// However, we'll add a few special cases for better display
const specialCaseMappings: Record<string, string> = {
  '16': 'United Kingdom', // Instead of 'England'
  '187': 'United States', // Instead of 'USA'
  '95': 'United Arab Emirates', // Instead of 'UAE'
  '53': 'Saudi Arabia', // Instead of 'Saudiarabia'
  '31': 'South Africa', // Instead of 'Southafrica'
  '27': 'Ivory Coast' // Instead of 'Ivory'
};

// Apply special case mappings
Object.entries(specialCaseMappings).forEach(([code, name]) => {
  countryCodeToNameMap[code] = name;
});

// Create and export a fallback service list for when API fails
export const fallbackServices: Record<string, any> = {
  'ss': { code: 'ss', name: 'Social Security', cost: 0.5, quant: 10 },
  'go': { code: 'go', name: 'Google', cost: 0.6, quant: 20 },
  'fb': { code: 'fb', name: 'Facebook', cost: 0.4, quant: 30 },
  'wa': { code: 'wa', name: 'WhatsApp', cost: 0.3, quant: 25 },
  'tg': { code: 'tg', name: 'Telegram', cost: 0.35, quant: 15 }
};

// Create and export a fallback countries list for when API fails
export const fallbackCountries: Record<string, string> = {
  '0': 'All countries',
  '16': 'United Kingdom',
  '187': 'United States',
  '43': 'Germany',
  '78': 'France',
  '117': 'Portugal'
};

export { serviceData, countriesData };
