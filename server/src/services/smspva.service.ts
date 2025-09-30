import axios from 'axios';
import dotenv from 'dotenv';
import { retryOperation } from '../utils/retry';

dotenv.config();

// SMSPVA API Configuration
const API_BASE_URL = 'https://smspva.com/api/rent.php';
const API_KEY = process.env.SMSPVA_API_KEY || '';

if (!API_KEY) {
  console.warn('[SMSPVA] API key not configured. Set SMSPVA_API_KEY environment variable.');
}

// Error class for SMSPVA API errors
class SmspvaError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SmspvaError';
    this.code = code;
  }
}

/**
 * Check if SMSPVA API is available (has API key)
 */
const isApiAvailable = (): boolean => {
  return !!API_KEY && API_KEY.length > 0;
};

// Mapping from SMS-Activate country codes to SMSPVA country codes
const COUNTRY_CODE_MAPPING: Record<string, string> = {
  '0': 'RU',   // Russia
  '1': 'UA',   // Ukraine
  '2': 'KZ',   // Kazakhstan
  '3': 'CN',   // China (not in SMSPVA list, fallback to RU)
  '4': 'PH',   // Philippines
  '5': 'MM',   // Myanmar (not in SMSPVA list, fallback to RU)
  '6': 'ID',   // Indonesia
  '7': 'MY',   // Malaysia
  '8': 'KE',   // Kenya (not in SMSPVA list, fallback to RU)
  '9': 'TZ',   // Tanzania
  '10': 'VN',  // Vietnam (not in SMSPVA list, fallback to RU)
  '11': 'KG',  // Kyrgyzstan (not in SMSPVA list, fallback to RU)
  '12': 'US',  // USA (virtual)
  '13': 'IL',  // Israel
  '14': 'HK',  // Hong Kong
  '15': 'PL',  // Poland
  '16': 'UK',  // United Kingdom
  '17': 'MG',  // Madagascar (not in SMSPVA list, fallback to RU)
  '18': 'CD',  // DCongo (not in SMSPVA list, fallback to RU)
  '19': 'NG',  // Nigeria (not in SMSPVA list, fallback to RU)
  '20': 'MO',  // Macao (not in SMSPVA list, fallback to RU)
  '21': 'EG',  // Egypt
  '22': 'IN',  // India (not in SMSPVA list, fallback to RU)
  '23': 'IE',  // Ireland
  '24': 'KH',  // Cambodia
  '25': 'LA',  // Laos (not in SMSPVA list, fallback to RU)
  '26': 'HT',  // Haiti (not in SMSPVA list, fallback to RU)
  '27': 'CI',  // Ivory Coast (not in SMSPVA list, fallback to RU)
  '28': 'GM',  // Gambia (not in SMSPVA list, fallback to RU)
  '29': 'RS',  // Serbia
  '30': 'YE',  // Yemen (not in SMSPVA list, fallback to RU)
  '31': 'ZA',  // South Africa (not in SMSPVA list, fallback to RU)
  '32': 'RO',  // Romania
  '33': 'CO',  // Colombia (not in SMSPVA list, fallback to RU)
  '34': 'EE',  // Estonia
  '35': 'AZ',  // Azerbaijan (not in SMSPVA list, fallback to RU)
  '36': 'CA',  // Canada
  '37': 'MA',  // Morocco (not in SMSPVA list, fallback to RU)
  '38': 'GH',  // Ghana (not in SMSPVA list, fallback to RU)
  '39': 'AR',  // Argentina
  '40': 'UZ',  // Uzbekistan (not in SMSPVA list, fallback to RU)
  '41': 'CM',  // Cameroon (not in SMSPVA list, fallback to RU)
  '42': 'TD',  // Chad (not in SMSPVA list, fallback to RU)
  '43': 'DE',  // Germany
  '44': 'LT',  // Lithuania
  '45': 'HR',  // Croatia
  '46': 'SE',  // Sweden
  '47': 'IQ',  // Iraq (not in SMSPVA list, fallback to RU)
  '48': 'NL',  // Netherlands
  '49': 'LV',  // Latvia
  '50': 'AT',  // Austria
  '51': 'BY',  // Belarus (not in SMSPVA list, fallback to RU)
  '52': 'TH',  // Thailand
  '53': 'SA',  // Saudi Arabia (not in SMSPVA list, fallback to RU)
  '54': 'MX',  // Mexico
  '55': 'TW',  // Taiwan (not in SMSPVA list, fallback to RU)
  '56': 'ES',  // Spain
  '57': 'IR',  // Iran (not in SMSPVA list, fallback to RU)
  '58': 'DZ',  // Algeria (not in SMSPVA list, fallback to RU)
  '59': 'SI',  // Slovenia
  '60': 'BD',  // Bangladesh
  '61': 'SN',  // Senegal (not in SMSPVA list, fallback to RU)
  '62': 'TR',  // Turkey
  '63': 'CZ',  // Czech Republic
  '64': 'LK',  // Sri Lanka (not in SMSPVA list, fallback to RU)
  '65': 'PE',  // Peru (not in SMSPVA list, fallback to RU)
  '66': 'PK',  // Pakistan (not in SMSPVA list, fallback to RU)
  '67': 'NZ',  // New Zealand
  '68': 'GN',  // Guinea (not in SMSPVA list, fallback to RU)
  '69': 'ML',  // Mali (not in SMSPVA list, fallback to RU)
  '70': 'VE',  // Venezuela (not in SMSPVA list, fallback to RU)
  '71': 'ET',  // Ethiopia (not in SMSPVA list, fallback to RU)
  '72': 'MN',  // Mongolia (not in SMSPVA list, fallback to RU)
  '73': 'BR',  // Brazil (not in SMSPVA list, fallback to RU)
  '74': 'AF',  // Afghanistan (not in SMSPVA list, fallback to RU)
  '75': 'UG',  // Uganda (not in SMSPVA list, fallback to RU)
  '76': 'AO',  // Angola (not in SMSPVA list, fallback to RU)
  '77': 'CY',  // Cyprus
  '78': 'FR',  // France
  '79': 'PG',  // Papua New Guinea (not in SMSPVA list, fallback to RU)
  '80': 'MZ',  // Mozambique (not in SMSPVA list, fallback to RU)
  '81': 'NP',  // Nepal (not in SMSPVA list, fallback to RU)
  '82': 'BE',  // Belgium
  '83': 'BG',  // Bulgaria
  '84': 'HU',  // Hungary
  '85': 'MD',  // Moldova
  '86': 'IT',  // Italy
  '87': 'PY',  // Paraguay
  '88': 'HN',  // Honduras (not in SMSPVA list, fallback to RU)
  '89': 'TN',  // Tunisia (not in SMSPVA list, fallback to RU)
  '90': 'NI',  // Nicaragua (not in SMSPVA list, fallback to RU)
  '91': 'TL',  // Timor-Leste (not in SMSPVA list, fallback to RU)
  '92': 'BO',  // Bolivia (not in SMSPVA list, fallback to RU)
  '93': 'CR',  // Costa Rica (not in SMSPVA list, fallback to RU)
  '94': 'GT',  // Guatemala (not in SMSPVA list, fallback to RU)
  '95': 'AE',  // UAE (not in SMSPVA list, fallback to RU)
  '96': 'ZW',  // Zimbabwe (not in SMSPVA list, fallback to RU)
  '97': 'PR',  // Puerto Rico
  '98': 'SD',  // Sudan (not in SMSPVA list, fallback to RU)
  '99': 'TG',  // Togo (not in SMSPVA list, fallback to RU)
  '100': 'KW', // Kuwait (not in SMSPVA list, fallback to RU)
  '101': 'SV', // El Salvador (not in SMSPVA list, fallback to RU)
  '102': 'LY', // Libya (not in SMSPVA list, fallback to RU)
  '103': 'JM', // Jamaica (not in SMSPVA list, fallback to RU)
  '104': 'TT', // Trinidad and Tobago (not in SMSPVA list, fallback to RU)
  '105': 'EC', // Ecuador (not in SMSPVA list, fallback to RU)
  '106': 'SZ', // Swaziland (not in SMSPVA list, fallback to RU)
  '107': 'OM', // Oman (not in SMSPVA list, fallback to RU)
  '108': 'BA', // Bosnia and Herzegovina (not in SMSPVA list, fallback to RU)
  '109': 'DO', // Dominican Republic (not in SMSPVA list, fallback to RU)
  '111': 'QA', // Qatar (not in SMSPVA list, fallback to RU)
  '112': 'PA', // Panama (not in SMSPVA list, fallback to RU)
  '114': 'MR', // Mauritania (not in SMSPVA list, fallback to RU)
  '115': 'SL', // Sierra Leone (not in SMSPVA list, fallback to RU)
  '116': 'JO', // Jordan (not in SMSPVA list, fallback to RU)
  '117': 'PT', // Portugal
  '118': 'BB', // Barbados (not in SMSPVA list, fallback to RU)
  '119': 'BI', // Burundi (not in SMSPVA list, fallback to RU)
  '120': 'BJ', // Benin (not in SMSPVA list, fallback to RU)
  '121': 'BN', // Brunei (not in SMSPVA list, fallback to RU)
  '122': 'BS', // Bahamas (not in SMSPVA list, fallback to RU)
  '123': 'BW', // Botswana (not in SMSPVA list, fallback to RU)
  '124': 'BZ', // Belize (not in SMSPVA list, fallback to RU)
  '125': 'CF', // Central African Republic (not in SMSPVA list, fallback to RU)
  '126': 'DM', // Dominica (not in SMSPVA list, fallback to RU)
  '127': 'GD', // Grenada (not in SMSPVA list, fallback to RU)
  '128': 'GE', // Georgia (not in SMSPVA list, fallback to RU)
  '129': 'GR', // Greece
  '130': 'GW', // Guinea-Bissau (not in SMSPVA list, fallback to RU)
  '131': 'GY', // Guyana (not in SMSPVA list, fallback to RU)
  '132': 'IS', // Iceland (not in SMSPVA list, fallback to RU)
  '133': 'KM', // Comoros (not in SMSPVA list, fallback to RU)
  '134': 'KN', // Saint Kitts and Nevis (not in SMSPVA list, fallback to RU)
  '135': 'LR', // Liberia (not in SMSPVA list, fallback to RU)
  '136': 'LS', // Lesotho (not in SMSPVA list, fallback to RU)
  '137': 'MW', // Malawi (not in SMSPVA list, fallback to RU)
  '138': 'NA', // Namibia (not in SMSPVA list, fallback to RU)
  '139': 'NE', // Niger (not in SMSPVA list, fallback to RU)
  '140': 'RW', // Rwanda (not in SMSPVA list, fallback to RU)
  '141': 'SK', // Slovakia
  '142': 'SR', // Suriname (not in SMSPVA list, fallback to RU)
  '143': 'TJ', // Tajikistan (not in SMSPVA list, fallback to RU)
  '144': 'MC', // Monaco (not in SMSPVA list, fallback to RU)
  '145': 'BH', // Bahrain (not in SMSPVA list, fallback to RU)
  '146': 'RE', // Reunion (not in SMSPVA list, fallback to RU)
  '147': 'ZM', // Zambia (not in SMSPVA list, fallback to RU)
  '148': 'AM', // Armenia
  '149': 'SO', // Somalia (not in SMSPVA list, fallback to RU)
  '150': 'CG', // Congo (not in SMSPVA list, fallback to RU)
  '151': 'CL', // Chile (not in SMSPVA list, fallback to RU)
  '152': 'BF', // Burkina Faso (not in SMSPVA list, fallback to RU)
  '153': 'LB', // Lebanon (not in SMSPVA list, fallback to RU)
  '154': 'GA', // Gabon (not in SMSPVA list, fallback to RU)
  '155': 'AL', // Albania
  '156': 'UY', // Uruguay (not in SMSPVA list, fallback to RU)
  '157': 'MU', // Mauritius (not in SMSPVA list, fallback to RU)
  '158': 'BT', // Bhutan (not in SMSPVA list, fallback to RU)
  '159': 'MV', // Maldives (not in SMSPVA list, fallback to RU)
  '160': 'GP', // Guadeloupe (not in SMSPVA list, fallback to RU)
  '161': 'TM', // Turkmenistan (not in SMSPVA list, fallback to RU)
  '162': 'GF', // French Guiana (not in SMSPVA list, fallback to RU)
  '163': 'FI', // Finland
  '164': 'LC', // Saint Lucia (not in SMSPVA list, fallback to RU)
  '165': 'LU', // Luxembourg (not in SMSPVA list, fallback to RU)
  '166': 'VC', // Saint Vincent and the Grenadines (not in SMSPVA list, fallback to RU)
  '167': 'GQ', // Equatorial Guinea (not in SMSPVA list, fallback to RU)
  '168': 'DJ', // Djibouti (not in SMSPVA list, fallback to RU)
  '169': 'AG', // Antigua and Barbuda (not in SMSPVA list, fallback to RU)
  '170': 'KY', // Cayman Islands (not in SMSPVA list, fallback to RU)
  '171': 'ME', // Montenegro (not in SMSPVA list, fallback to RU)
};

// Country names mapping for display
const COUNTRY_NAMES: Record<string, string> = {
  '0': 'Russia',
  '1': 'Ukraine',
  '2': 'Kazakhstan',
  '3': 'China',
  '4': 'Philippines',
  '5': 'Myanmar',
  '6': 'Indonesia',
  '7': 'Malaysia',
  '8': 'Kenya',
  '9': 'Tanzania',
  '10': 'Vietnam',
  '11': 'Kyrgyzstan',
  '12': 'USA',
  '13': 'Israel',
  '14': 'Hong Kong',
  '15': 'Poland',
  '16': 'United Kingdom',
  '17': 'Madagascar',
  '18': 'DCongo',
  '19': 'Nigeria',
  '20': 'Macao',
  '21': 'Egypt',
  '22': 'India',
  '23': 'Ireland',
  '24': 'Cambodia',
  '25': 'Laos',
  '26': 'Haiti',
  '27': 'Ivory Coast',
  '28': 'Gambia',
  '29': 'Serbia',
  '30': 'Yemen',
  '31': 'South Africa',
  '32': 'Romania',
  '33': 'Colombia',
  '34': 'Estonia',
  '35': 'Azerbaijan',
  '36': 'Canada',
  '37': 'Morocco',
  '38': 'Ghana',
  '39': 'Argentina',
  '40': 'Uzbekistan',
  '41': 'Cameroon',
  '42': 'Chad',
  '43': 'Germany',
  '44': 'Lithuania',
  '45': 'Croatia',
  '46': 'Sweden',
  '47': 'Iraq',
  '48': 'Netherlands',
  '49': 'Latvia',
  '50': 'Austria',
  '51': 'Belarus',
  '52': 'Thailand',
  '53': 'Saudi Arabia',
  '54': 'Mexico',
  '55': 'Taiwan',
  '56': 'Spain',
  '57': 'Iran',
  '58': 'Algeria',
  '59': 'Slovenia',
  '60': 'Bangladesh',
  '61': 'Senegal',
  '62': 'Turkey',
  '63': 'Czech Republic',
  '64': 'Sri Lanka',
  '65': 'Peru',
  '66': 'Pakistan',
  '67': 'New Zealand',
  '68': 'Guinea',
  '69': 'Mali',
  '70': 'Venezuela',
  '71': 'Ethiopia',
  '72': 'Mongolia',
  '73': 'Brazil',
  '74': 'Afghanistan',
  '75': 'Uganda',
  '76': 'Angola',
  '77': 'Cyprus',
  '78': 'France',
  '79': 'Papua New Guinea',
  '80': 'Mozambique',
  '81': 'Nepal',
  '82': 'Belgium',
  '83': 'Bulgaria',
  '84': 'Hungary',
  '85': 'Moldova',
  '86': 'Italy',
  '87': 'Paraguay',
  '88': 'Honduras',
  '89': 'Tunisia',
  '90': 'Nicaragua',
  '91': 'Timor-Leste',
  '92': 'Bolivia',
  '93': 'Costa Rica',
  '94': 'Guatemala',
  '95': 'UAE',
  '96': 'Zimbabwe',
  '97': 'Puerto Rico',
  '98': 'Sudan',
  '99': 'Togo',
  '100': 'Kuwait',
  '101': 'El Salvador',
  '102': 'Libya',
  '103': 'Jamaica',
  '104': 'Trinidad and Tobago',
  '105': 'Ecuador',
  '106': 'Swaziland',
  '107': 'Oman',
  '108': 'Bosnia and Herzegovina',
  '109': 'Dominican Republic',
  '111': 'Qatar',
  '112': 'Panama',
  '114': 'Mauritania',
  '115': 'Sierra Leone',
  '116': 'Jordan',
  '117': 'Portugal',
  '118': 'Barbados',
  '119': 'Burundi',
  '120': 'Benin',
  '121': 'Brunei',
  '122': 'Bahamas',
  '123': 'Botswana',
  '124': 'Belize',
  '125': 'Central African Republic',
  '126': 'Dominica',
  '127': 'Grenada',
  '128': 'Georgia',
  '129': 'Greece',
  '130': 'Guinea-Bissau',
  '131': 'Guyana',
  '132': 'Iceland',
  '133': 'Comoros',
  '134': 'Saint Kitts and Nevis',
  '135': 'Liberia',
  '136': 'Lesotho',
  '137': 'Malawi',
  '138': 'Namibia',
  '139': 'Niger',
  '140': 'Rwanda',
  '141': 'Slovakia',
  '142': 'Suriname',
  '143': 'Tajikistan',
  '144': 'Monaco',
  '145': 'Bahrain',
  '146': 'Reunion',
  '147': 'Zambia',
  '148': 'Armenia',
  '149': 'Somalia',
  '150': 'Congo',
  '151': 'Chile',
  '152': 'Burkina Faso',
  '153': 'Lebanon',
  '154': 'Gabon',
  '155': 'Albania',
  '156': 'Uruguay',
  '157': 'Mauritius',
  '158': 'Bhutan',
  '159': 'Maldives',
  '160': 'Guadeloupe',
  '161': 'Turkmenistan',
  '162': 'French Guiana',
  '163': 'Finland',
  '164': 'Saint Lucia',
  '165': 'Luxembourg',
  '166': 'Saint Vincent and the Grenadines',
  '167': 'Equatorial Guinea',
  '168': 'Djibouti',
  '169': 'Antigua and Barbuda',
  '170': 'Cayman Islands',
  '171': 'Montenegro'
};

// Mapping from SMS-Activate country codes to SMSPVA country codes
const REVERSE_COUNTRY_CODE_MAPPING: Record<string, string> = {
  'RU': '0',
  'UA': '1',
  'KZ': '2',
  'CN': '3',
  'PH': '4',
  'MM': '5',
  'ID': '6',
  'MY': '7',
  'KE': '8',
  'TZ': '9',
  'VN': '10',
  'KG': '11',
  'US': '12',
  'IL': '13',
  'HK': '14',
  'PL': '15',
  'UK': '16',
  'MG': '17',
  'CD': '18',
  'NG': '19',
  'MO': '20',
  'EG': '21',
  'IN': '22',
  'IE': '23',
  'KH': '24',
  'LA': '25',
  'HT': '26',
  'CI': '27',
  'GM': '28',
  'RS': '29',
  'YE': '30',
  'ZA': '31',
  'RO': '32',
  'CO': '33',
  'EE': '34',
  'AZ': '35',
  'CA': '36',
  'MA': '37',
  'GH': '38',
  'AR': '39',
  'UZ': '40',
  'CM': '41',
  'TD': '42',
  'DE': '43',
  'LT': '44',
  'HR': '45',
  'SE': '46',
  'IQ': '47',
  'NL': '48',
  'LV': '49',
  'AT': '50',
  'BY': '51',
  'TH': '52',
  'SA': '53',
  'MX': '54',
  'TW': '55',
  'ES': '56',
  'IR': '57',
  'DZ': '58',
  'SI': '59',
  'BD': '60',
  'SN': '61',
  'TR': '62',
  'CZ': '63',
  'LK': '64',
  'PE': '65',
  'PK': '66',
  'NZ': '67',
  'GN': '68',
  'ML': '69',
  'VE': '70',
  'ET': '71',
  'MN': '72',
  'BR': '73',
  'AF': '74',
  'UG': '75',
  'AO': '76',
  'CY': '77',
  'FR': '78',
  'PG': '79',
  'MZ': '80',
  'NP': '81',
  'BE': '82',
  'BG': '83',
  'HU': '84',
  'MD': '85',
  'IT': '86',
  'PY': '87',
  'HN': '88',
  'TN': '89',
  'NI': '90',
  'TL': '91',
  'BO': '92',
  'CR': '93',
  'GT': '94',
  'AE': '95',
  'ZW': '96',
  'PR': '97',
  'SD': '98',
  'TG': '99',
  'KW': '100',
  'SV': '101',
  'LY': '102',
  'JM': '103',
  'TT': '104',
  'EC': '105',
  'SZ': '106',
  'OM': '107',
  'BA': '108',
  'DO': '109',
  'QA': '111',
  'PA': '112',
  'MR': '114',
  'SL': '115',
  'JO': '116',
  'PT': '117',
  'BB': '118',
  'BI': '119',
  'BJ': '120',
  'BN': '121',
  'BS': '122',
  'BW': '123',
  'BZ': '124',
  'CF': '125',
  'DM': '126',
  'GD': '127',
  'GE': '128',
  'GR': '129',
  'GW': '130',
  'GY': '131',
  'IS': '132',
  'KM': '133',
  'KN': '134',
  'LR': '135',
  'LS': '136',
  'MW': '137',
  'NA': '138',
  'NE': '139',
  'RW': '140',
  'SK': '141',
  'SR': '142',
  'TJ': '143',
  'MC': '144',
  'BH': '145',
  'RE': '146',
  'ZM': '147',
  'AM': '148',
  'SO': '149',
  'CG': '150',
  'CL': '151',
  'BF': '152',
  'LB': '153',
  'GA': '154',
  'AL': '155',
  'UY': '156',
  'MU': '157',
  'BT': '158',
  'MV': '159',
  'GP': '160',
  'TM': '161',
  'GF': '162',
  'FI': '163',
  'LC': '164',
  'LU': '165',
  'VC': '166',
  'GQ': '167',
  'DJ': '168',
  'AG': '169',
  'KY': '170',
  'ME': '171',
  'DK': '172',
  'CH': '173',
  'NO': '174',
  'AU': '175',
  'ER': '176',
  'SS': '177',
  'ST': '178',
  'AW': '179',
  'MS': '180',
  'AI': '181',
  'TV': '182',
  'MK': '183',
  'SC': '184',
  'NC': '185',
  'CV': '186',
  'PS': '188',
  'FJ': '189',
  'KR': '190',
  'AD': '191',
  'SB': '192',
  'VU': '193',
  'MH': '194',
  'BM': '195',
  'SG': '196',
  'WS': '197',
  'TO': '198',
  'PW': '199',
  'NR': '200',
  'KI': '201',
  'CK': '202',
  'NU': '203',
  'FM': '204',
  'TK': '205',
  'WF': '206',
  'PN': '207',
  'SH': '208',
  'FK': '209',
  'GS': '210',
  'BV': '211',
  'HM': '212',
  'AQ': '213',
  'TF': '214',
  'UM': '215',
  'IO': '216',
  'CC': '217',
  'CX': '218',
  'NF': '219'
};

// Mapping from SMS-Activate service codes to SMSPVA service codes
const SERVICE_CODE_MAPPING: Record<string, string> = {
  // Popular services mapping - Using actual SMSPVA opt codes
  'vk': 'opt33',        // VK -> Mail.RU (VK, OK, Youla)
  'go': 'opt1',         // Google -> Google (GMail, YTube, etc.)
  'ya': 'opt23',        // Yandex -> Yandex&YooMoney
  'fb': 'opt2',         // Facebook -> Facebook
  'wa': 'opt20',        // WhatsApp -> WhatsAPP
  'tg': 'opt29',        // Telegram -> Telegram
  'tw': 'opt41',        // Twitter -> X (Twitter)
  'ig': 'opt16',        // Instagram -> Instagram (+Threads)
  'ds': 'opt147',       // Discord -> Discord
  'ub': 'opt72',        // Uber -> Paxful (Noone) [closest match]
  'av': 'opt148',       // Avito -> OZON.ru [closest match]
  'ot': 'opt142',       // Other -> OTHER
  'ma': 'opt4',         // Mail.ru -> Mail.ru Group
  'ok': 'opt33',        // Odnoklassniki -> Mail.RU (VK, OK, Youla)
  'vi': 'opt11',        // Viber -> Viber
  'li': 'opt8',         // LinkedIn -> LinkedIn
  'ti': 'opt9',         // Tinder -> Tinder
  'ss': 'opt6',         // Steam -> Fiverr (closest match for gaming)
  'bd': 'opt56',        // Badoo -> Crypto.com [no direct match]
  'uk': 'opt96',        // Ukrnet -> match.com [no direct match]
  'mm': 'opt4',         // Mamba -> Mail.ru Group [no direct match]
  'mb': 'opt4',         // Mailru -> Mail.ru Group
  'am': 'opt44',        // Amazon -> Amazon
  'ap': 'opt154',       // Apple -> Apple
  'ms': 'opt15',        // Microsoft -> Microsoft (Azure, Bing, HotMail, etc.)
  'pp': 'opt83',        // PayPal -> PayPal + Ebay
  'sk': 'opt74',        // Skrill -> Skrill
  'bt': 'opt10',        // Bitcoin -> Binance [closest match]
  'qw': 'opt18',        // Qiwi -> Qiwi
  'wb': 'opt24',        // WebMoney -> WebMoney&ENUM
  'ym': 'opt23',        // YooMoney -> Yandex&YooMoney
  'ai': 'opt46',        // Airbnb -> Airbnb (VRBO.com, HomeAway)
  'nt': 'opt225',       // Netflix -> NETFLIX
  'sp': 'opt58',        // Steam -> Steam
  'tk': 'opt104',       // TikTok -> TikTok
  'tc': 'opt146',       // Ticketmaster -> Ticketmaster
  'rv': 'opt101',       // Revolut -> Revolut
  'cb': 'opt70',        // Coinbase -> CoinBase
  'bn': 'opt10',        // Binance -> Binance
  'kr': 'opt81',        // Kraken -> Kraken
  'pm': 'opt103',       // Payoneer -> Payoneer
  'ps': 'opt90',        // Paysafecard -> Paysafecard (+Mojeplatnosci)
  'n26': 'opt52',       // N26 -> N26
  'mt': 'opt97',        // Monese -> Monese
  'wd': 'opt0',         // Wise -> Wise (TransferWise)
  'kl': 'opt156',       // Klarna -> Klarna
  'sw': 'opt173',       // Swagbucks -> Swagbucks
  'bb': 'opt25',        // Bumble -> Bnext [no direct match]
  'hp': 'opt185',       // Hinge -> Hinge
  'cm': 'opt56',        // Crypto.com -> Crypto.com
  'ft': 'opt6',         // Fiverr -> Fiverr
  'up': 'opt34',        // Upwork -> Indeed.com [closest match]
  'fl': 'opt34',        // Freelancer -> Indeed.com [closest match]
  'fd': 'opt88',        // Foodpanda -> booking [no direct match]
  'ly': 'opt75',        // Lyft -> MoneyLion [no direct match]
  'gr': 'opt220',       // Grab -> Green Dot [no direct match]
  'gj': 'opt1',         // Gojek -> Google (GMail, YTube, etc.) [no direct match]
  'sh': 'opt48',        // Shopee -> 1cupis & okcupid & winline [no direct match]
  'lz': 'opt61',        // Lazada -> Alibaba Group (TaoBao, AliPay, etc) [closest match]
  'tb': 'opt61',        // Taobao -> Alibaba Group (TaoBao, AliPay, etc)
  'al': 'opt61',        // Alibaba -> Alibaba Group (TaoBao, AliPay, etc)
  'jd': 'opt198',       // JD.com -> JD.com
  'wc': 'opt67',        // WeChat -> Vivastreet [no direct match]
  'qq': 'opt67',        // QQ -> Vivastreet [no direct match]
  'wb2': 'opt192',      // Weibo -> Walmart [no direct match] (renamed to avoid conflict)
  'dd': 'opt40',        // DiDi -> Chase [no direct match]
  'mw': 'opt35',        // Meituan -> moneygram.com [no direct match]
  'el': 'opt44',        // Eleme -> Amazon [no direct match]
  'hm': 'opt88',        // Hema -> booking [no direct match]
  'xh': 'opt192',       // Xiaohongshu -> Walmart [no direct match]
  'dy': 'opt104',       // Douyin -> TikTok [closest match]
  'ks': 'opt104',       // Kuaishou -> TikTok [closest match]
  'bd2': 'opt1',        // Baidu -> Google (GMail, YTube, etc.) [closest match] (renamed to avoid conflict)
  // Default fallback for unknown services
  'default': 'opt142'   // OTHER
};

// Service names mapping for display
const SERVICE_NAMES: Record<string, string> = {
  'vk': 'VK',
  'ok': 'Odnoklassniki',
  'wa': 'WhatsApp',
  'vi': 'Viber',
  'tg': 'Telegram',
  'tw': 'Twitter',
  'fb': 'Facebook',
  'go': 'Google',
  'ig': 'Instagram',
  'ya': 'Yandex',
  'ma': 'Mail.ru',
  'av': 'Avito',
  'ub': 'Uber',
  'qw': 'Qiwi',
  'ss': 'Steam',
  'ot': 'Other'
};

/**
 * SMSPVA Rental API Service
 * Uses the proper rental API endpoints for phone number rentals
 */
export const smspvaService = {
  /**
   * Check if the service is available
   */
  isAvailable: isApiAvailable,

  /**
   * Get available services and countries for SMSPVA Rental API
   */
  async getRentServicesAndCountries() {
    if (!isApiAvailable()) {
      throw new SmspvaError('SMSPVA API key not configured', 'NO_API_KEY');
    }
    try {
      console.log('[SMSPVA] Getting rental services and countries');
      
      // Get countries first using correct SMSPVA API method
      const countriesResponse = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: {
            method: 'getcountries',
            apikey: API_KEY
          },
          timeout: 15000
        }),
        3,
        1000
      );

      console.log('[SMSPVA] Countries response:', JSON.stringify(countriesResponse.data, null, 2));

      // Get services data for multiple countries to get complete service list
      let allServicesData: { services?: any[] } = {};
      const testCountries = ['US', 'DE', 'UK', 'RU', 'FR']; // Test multiple countries
      
      for (const country of testCountries) {
        try {
          console.log(`[SMSPVA] Fetching services for country: ${country}`);
          const servicesResponse = await retryOperation(() => 
            axios.get(API_BASE_URL, {
              params: {
                method: 'getdata',
                country: country,
                apikey: API_KEY
              },
              timeout: 15000
            }),
            3,
            1000
          );
          
          if (servicesResponse.data?.status === 1 && servicesResponse.data.data?.services) {
            const countryServices = servicesResponse.data.data.services;
            console.log(`[SMSPVA] Found ${countryServices.length} services for ${country}`);
            
            // Merge services from this country
            if (!allServicesData.services) {
              allServicesData.services = [];
            }
            
            // Add unique services
            countryServices.forEach((service: any) => {
              const existingService = allServicesData.services!.find((s: any) => s.service === service.service);
              if (!existingService) {
                allServicesData.services!.push({...service, country: country});
              } else if (service.count > 0 && existingService.count === 0) {
                // Update with service that has available numbers
                Object.assign(existingService, service, {country: country});
              }
            });
          }
        } catch (serviceError: any) {
          console.warn(`[SMSPVA] Failed to get services for ${country}:`, serviceError.message);
        }
      }
      
      console.log(`[SMSPVA] Total unique services found: ${allServicesData.services?.length || 0}`);
      
      // If no services found, fall back to comprehensive static mapping
      console.log('[SMSPVA] All services data structure:', JSON.stringify(allServicesData, null, 2));
      if (!allServicesData.services || allServicesData.services.length === 0) {
        console.warn('[SMSPVA] No services found from API, using comprehensive static mapping');
        
        const staticServices = [
          { service: 'opt1', name: 'WhatsApp', price_day: 0.40, count: 100 },
          { service: 'opt2', name: 'Telegram', price_day: 0.25, count: 150 },
          { service: 'opt3', name: 'Google/Gmail', price_day: 0.55, count: 80 },
          { service: 'opt4', name: 'Facebook', price_day: 0.75, count: 60 },
          { service: 'opt5', name: 'Instagram', price_day: 0.85, count: 70 },
          { service: 'opt6', name: 'Twitter/X', price_day: 1.10, count: 40 },
          { service: 'opt7', name: 'Discord', price_day: 0.65, count: 90 },
          { service: 'opt8', name: 'Viber', price_day: 0.35, count: 120 },
          { service: 'opt9', name: 'LinkedIn', price_day: 0.95, count: 50 },
          { service: 'opt10', name: 'TikTok', price_day: 0.80, count: 75 },
          { service: 'opt11', name: 'Snapchat', price_day: 0.70, count: 85 },
          { service: 'opt12', name: 'Signal', price_day: 0.60, count: 95 },
          { service: 'opt13', name: 'Microsoft', price_day: 0.65, count: 65 },
          { service: 'opt14', name: 'Apple ID', price_day: 0.90, count: 55 },
          { service: 'opt15', name: 'Amazon', price_day: 0.85, count: 45 },
          { service: 'opt16', name: 'Netflix', price_day: 1.20, count: 30 },
          { service: 'opt17', name: 'Spotify', price_day: 0.75, count: 40 },
          { service: 'opt18', name: 'PayPal', price_day: 1.00, count: 35 },
          { service: 'opt19', name: 'Uber', price_day: 0.55, count: 60 },
          { service: 'opt20', name: 'Steam', price_day: 0.80, count: 50 }
        ];
        
        allServicesData = { services: staticServices };
      }

      // Transform the response to match expected format
      const transformResult = this.transformServicesResponse({
        services: allServicesData,
        countries: countriesResponse.data?.status === 1 ? countriesResponse.data.data : []
      });
      
      console.log('[SMSPVA] Final transform result - Countries:', transformResult.countries.length, 'Services:', transformResult.services.length);
      console.log('[SMSPVA] Countries list:', transformResult.countries.map(c => `${c.name} (${c.code})`).slice(0, 10));
      
      return transformResult;
    } catch (error: any) {
      console.error('[SMSPVA] Error getting rental services and countries:', error);
      
      // Fallback to static mappings
      console.log('[SMSPVA] Using static mappings as fallback');
      return this.transformServicesResponse({
        services: SERVICE_CODE_MAPPING,
        countries: Object.entries(COUNTRY_CODE_MAPPING).map(([id, code]) => ({
          name: code,
          code: code
        }))
      });
    }
  },

  /**
   * Rent a phone number using SMSPVA Rental API
   */
  async getRentNumber(
    service: string,
    rentTime: string = '4',
    operator: string = 'any',
    country: string = 'RU'
  ) {
    try {
      // Use service code directly (no translation needed since we now get real SMSPVA codes from API)
      const smspvaService = service;
      console.log(`[SMSPVA] Using service code directly: ${service}`);
      
      // Translate country code - if it's already a SMSPVA code (like 'DE'), use it directly
      let smspvaCountry = country;
      if (COUNTRY_CODE_MAPPING[country]) {
        smspvaCountry = COUNTRY_CODE_MAPPING[country];
      }
      // If it's a 2-letter country code (like 'DE', 'US'), use it directly
      else if (country.length === 2) {
        smspvaCountry = country.toUpperCase();
      }
      // Default fallback
      else {
        smspvaCountry = 'RU';
      }
      console.log(`[SMSPVA] Using country code: ${country} -> ${smspvaCountry}`);
      
      // Convert rentTime to SMSPVA format - use simpler logic
      const rentTimeHours = parseInt(rentTime);
      console.log(`[SMSPVA] Original rent time: ${rentTimeHours} hours`);
      
      // SMSPVA uses simple time format - try using hours directly first
      console.log(`[SMSPVA] Renting number for service: ${smspvaService}, country: ${smspvaCountry}, time: ${rentTimeHours}h`);
      
              // SMSPVA Rental API parameters - use 'create' method for rentals
        const apiParams = {
          method: 'create',
          apikey: API_KEY,
          dtype: rentTimeHours >= 168 ? 'week' : 'week', // Use week as default
          dcount: Math.max(1, Math.ceil(rentTimeHours / 168)), // Convert hours to weeks
          country: smspvaCountry,
          service: smspvaService,
          ...(operator !== 'any' && { provider: operator })
        };
      
      console.log(`[SMSPVA] API parameters:`, apiParams);
      
      // Use SMSPVA Rental API endpoint (rent.php for rentals)
      const response = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: apiParams,
          timeout: 15000
        }),
        3,
        1000
      );

      console.log('[SMSPVA] Rental response:', response.data);

      // Handle SMSPVA Rental API response format
      console.log('[SMSPVA] Raw response type:', typeof response.data);
      console.log('[SMSPVA] Raw response content:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        // Check for SMSPVA Rental API success response format: { status: 1, data: {...} } or { status: 1, data: [...] }
        if (response.data.status === 1 && response.data.data) {
          let rentData;
          
          // Handle both array and object response formats
          if (Array.isArray(response.data.data) && response.data.data.length > 0) {
            rentData = response.data.data[0]; // Get first rental from array
          } else if (typeof response.data.data === 'object') {
            rentData = response.data.data; // Use object directly
          }
          
          if (rentData) {
            const activationId = rentData.id?.toString() || `smspva_rent_${Date.now()}`;
            
            // SMSPVA rental API format: { id, pnumber, ccode, service, until }
            // Handle case where ccode might be empty and pnumber contains full number
            let phoneNumber = '';
            if (rentData.ccode && rentData.pnumber) {
              phoneNumber = `${rentData.ccode}${rentData.pnumber}`;
            } else if (rentData.pnumber) {
              // If ccode is empty, pnumber might contain the full number
              phoneNumber = rentData.pnumber.toString();
            }
            
            if (phoneNumber && phoneNumber.length > 1) {
              console.log(`[SMSPVA] Successfully rented number: ${phoneNumber} with rental ID: ${activationId}`);
              
              return {
                activationId: activationId,
                phone: { number: phoneNumber },
                id: activationId,
                phone_number: phoneNumber,
                rent_id: activationId,
                country: smspvaCountry,
                service: smspvaService,
                expires_at: rentData.until ? new Date(rentData.until * 1000).toISOString() : null,
                raw_response: rentData // Include raw data for debugging
              };
            } else {
              console.error('[SMSPVA] No valid phone number in rental response:', rentData);
            }
          }
        }
        
        // Check for error response
        if (response.data.status === 0) {
          const errorMsg = response.data.msg || response.data.error_msg || 'Unknown error';
          console.log(`[SMSPVA] Rental API error: ${errorMsg}`);
          
          // Check for specific error types
          if (errorMsg.includes('No numbers available') || 
              errorMsg.includes('no numbers') ||
              errorMsg.includes('Incorrect method')) {
            
            // If it's "Incorrect method", it might be that the service has no available numbers
            // Let's check the service availability first
            console.log(`[SMSPVA] Error: ${errorMsg}. Checking service availability...`);
            
            try {
              const availabilityCheck = await this.checkServiceAvailability(smspvaCountry, smspvaService);
              if (!availabilityCheck.available) {
                throw new SmspvaError(
                  `No phone numbers available for service ${smspvaService} in country ${smspvaCountry}. Available count: ${availabilityCheck.count}`,
                  'NO_NUMBERS_AVAILABLE'
                );
              }
            } catch (checkError) {
              console.warn(`[SMSPVA] Could not check service availability: ${checkError}`);
            }
          }
          
          throw new SmspvaError(`SMSPVA API error: ${errorMsg}`, 'API_ERROR');
        }
      }
      
      // Handle legacy string response format (for backwards compatibility)
      if (typeof response.data === 'string') {
        // Handle error responses
        if (response.data.startsWith('ERROR') || response.data.includes('BAD_')) {
          throw new SmspvaError(`SMSPVA API error: ${response.data}`, 'API_ERROR');
        }
        
        // Parse successful response (usually format: id:phone_number)
        const parts = response.data.split(':');
        if (parts.length >= 2) {
          const activationId = parts[0];
          const phoneNumber = parts[1];
          
          console.log(`[SMSPVA] Successfully rented number: ${phoneNumber} with ID: ${activationId}`);
          
          return {
            activationId: activationId,
            phone: { number: phoneNumber },
            id: activationId,
            phone_number: phoneNumber,
            rent_id: activationId,
            country: smspvaCountry,
            service: smspvaService
          };
        } else {
          throw new SmspvaError(`Unexpected SMSPVA response format: ${response.data}`, 'INVALID_RESPONSE');
        }
      }
      
      throw new SmspvaError(`SMSPVA returned unexpected response: ${JSON.stringify(response.data)}`, 'UNEXPECTED_RESPONSE');
      
    } catch (error: any) {
      console.error('[SMSPVA] Error renting number:', error);
      
      if (error instanceof SmspvaError) {
        throw error;
      }
      
      // Check for specific SMSPVA error responses
      if (error.response?.data) {
        const errorData = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        throw new SmspvaError(`SMSPVA API error: ${errorData}`, 'API_ERROR');
      }
      
      throw new SmspvaError(
        error.message || 'Failed to rent SMSPVA number',
        'UNKNOWN_ERROR'
      );
    }
  },

  /**
   * Get rental status and messages using SMSPVA Rental API
   */
  async getRentStatus(
    id: string,
    page: string = '0',
    size: string = '50',
    service: string = 'opt1',
    country: string = 'RU'
  ) {
    try {
      console.log(`[SMSPVA] Getting rental status for ID: ${id}`);
      
      // Get SMS messages for the rental
      const response = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: {
            method: 'sms',
            apikey: API_KEY,
            id: id
          },
          timeout: 15000
        }),
        3,
        1000
      );

      console.log(`[SMSPVA] Status response for ${id}:`, response.data);

      // Transform response to match expected format
      return this.transformRentalMessages(response.data);
    } catch (error: any) {
      console.error(`[SMSPVA] Error getting rental status for ${id}:`, error);
      throw new SmspvaError(`Failed to get rental status: ${error.message}`, 'STATUS_ERROR');
    }
  },

  /**
   * Get rental messages using SMSPVA Rental API
   */
  async getRentalMessages(
    id: string,
    country: string = 'RU',
    service: string = 'opt1'
  ) {
    try {
      console.log(`[SMSPVA] Getting rental messages for ID: ${id}`);
      
      const response = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: {
            method: 'sms',
            apikey: API_KEY,
            id: id
          },
          timeout: 15000
        }),
        3,
        1000
      );

      console.log('[SMSPVA] Rental messages response:', response.data);

      // Transform SMSPVA rental messages response to match expected format
      return this.transformRentalMessages(response.data);
    } catch (error: any) {
      console.error('[SMSPVA] Error getting rental messages:', error);
      
      if (error instanceof SmspvaError) {
        throw error;
      }
      
      throw new Error(
        error.response?.data?.msg || 
        error.message || 
        'Failed to get rental messages'
      );
    }
  },

  /**
   * Get list of active rentals using SMSPVA Rental API
   */
  async getRentList() {
    try {
      console.log('[SMSPVA] Getting rental list');
      
      const response = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: {
            method: 'orders',
            apikey: API_KEY
          },
          timeout: 15000
        }),
        3,
        1000
      );

      console.log('[SMSPVA] Rental list response:', response.data);

      // Transform SMSPVA rental list response to match expected format
      return this.transformRentListResponse(response.data);
    } catch (error: any) {
      console.error('[SMSPVA] Error getting rental list:', error);
      
      if (error instanceof SmspvaError) {
        throw error;
      }
      
      throw new Error(
        error.response?.data?.msg || 
        error.message || 
        'Failed to get rental list'
      );
    }
  },

  /**
   * Extend rental time using SMSPVA Rental API
   */
  async continueRentNumber(
    id: string,
    rentTime: string = '4'
  ) {
    try {
      console.log(`[SMSPVA] Extending rental for ID: ${id}, additional time: ${rentTime}h`);
      
      // Convert rentTime hours to rental period format
      const rentTimeHours = parseInt(rentTime);
      let dtype = 'week';
      let dcount = 1;
      
      if (rentTimeHours <= 24) {
        dtype = 'week';
        dcount = 1;
      } else if (rentTimeHours <= 168) {
        dtype = 'week';
        dcount = Math.ceil(rentTimeHours / 168);
      } else {
        dtype = 'month';
        dcount = Math.ceil(rentTimeHours / (24 * 30));
      }

      const response = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: {
            method: 'prolong',
            apikey: API_KEY,
            id: id,
            dtype: dtype,
            dcount: dcount
          },
          timeout: 15000
        }),
        3,
        1000
      );

      console.log('[SMSPVA] Rental extension response:', response.data);

      if (response.data.status === 1) {
        return {
          status: 'success',
          message: `Rental extended by ${rentTime} hours successfully`,
          data: response.data.data
        };
      } else {
        throw new SmspvaError(`Extension failed: ${response.data.msg}`, 'EXTENSION_FAILED');
      }
    } catch (error: any) {
      console.error('[SMSPVA] Error extending rental:', error);
      
      if (error instanceof SmspvaError) {
        throw error;
      }
      
      throw new Error(
        error.response?.data?.msg || 
        error.message || 
        'Failed to extend rental'
      );
    }
  },

  /**
   * Cancel/delete a rental using SMSPVA Rental API
   */
  async setRentStatus(
    id: string,
    status: string, // 1 = Finish, 2 = Cancel
    service: string = 'opt1',
    country: string = 'RU'
  ) {
    try {
      console.log(`[SMSPVA] Setting rental status for ID: ${id}, status: ${status}`);
      
      if (status === '2') {
        // Cancel - use delete method
        const response = await retryOperation(() => 
          axios.get(API_BASE_URL, {
            params: {
              method: 'delete',
              apikey: API_KEY,
              id: id
            },
            timeout: 15000
          }),
          3,
          1000
        );

        console.log(`[SMSPVA] Cancel response for ${id}:`, response.data);

        if (response.data.status === 1) {
          return {
            success: true,
            status: 'cancelled',
            activationId: id
          };
        } else {
          throw new SmspvaError(`Failed to cancel: ${response.data.msg}`, 'CANCEL_FAILED');
        }
      } else {
        // For other statuses, just return success
        return {
          success: true,
          status: 'finished',
          activationId: id
        };
      }
    } catch (error: any) {
      console.error(`[SMSPVA] Error setting rental status for ${id}:`, error);
      
      if (error instanceof SmspvaError) {
        throw error;
      }
      
      throw new SmspvaError(`Failed to set rental status: ${error.message}`, 'STATUS_ERROR');
    }
  },

  /**
   * Check service availability for a specific country and service
   */
  async checkServiceAvailability(country: string, service: string) {
    try {
      const response = await retryOperation(() => 
        axios.get(API_BASE_URL, {
          params: {
            method: 'getdata',
            country: country,
            apikey: API_KEY
          },
          timeout: 10000
        }),
        2,
        1000
      );

      if (response.data?.status === 1 && response.data.data?.services) {
        const services = response.data.data.services;
        const targetService = services.find((s: any) => s.service === service);
        
        if (targetService) {
          return {
            available: parseInt(targetService.count) > 0,
            count: parseInt(targetService.count) || 0,
            price: parseFloat(targetService.price_day) || 0
          };
        }
      }
      
      return { available: false, count: 0, price: 0 };
    } catch (error) {
      console.error(`[SMSPVA] Error checking service availability:`, error);
      return { available: false, count: 0, price: 0 };
    }
  },

  /**
   * Transform SMSPVA services response to SMS-Activate format
   */
  transformServicesResponse(data: any) {
    try {
      const services: any[] = [];
      const countries: any[] = [];

      // Handle countries response - SMSPVA returns array of country objects
      console.log('[SMSPVA] Transform input data.countries type:', typeof data.countries, 'isArray:', Array.isArray(data.countries));
      console.log('[SMSPVA] Transform input data.countries length:', data.countries?.length);
      console.log('[SMSPVA] First few countries:', data.countries?.slice(0, 3));
      
      if (Array.isArray(data.countries)) {
        console.log(`[SMSPVA] Processing ${data.countries.length} countries from API`);
        data.countries.forEach((country: any, index: number) => {
          // SMSPVA country format: {name: "Germany", code: "DE", rent_switch_type: "FAST"}
          const countryCode = country.code;
          const countryName = country.name;
          
          if (index < 5) {
            console.log(`[SMSPVA] Country ${index}: name="${countryName}", code="${countryCode}"`);
          }
          
          if (countryCode && countryName) {
            countries.push({
              id: countryCode, // Use SMSPVA's actual country code as ID
              name: countryName.trim(), // Trim any extra spaces
              code: countryCode,
              rent_switch_type: country.rent_switch_type || 'UNKNOWN'
            });
          }
        });
        
        console.log(`[SMSPVA] Successfully processed ${countries.length} countries from API`);
      } else {
        // Fallback - get all available countries from the static mapping
        console.log('[SMSPVA] FALLBACK: Using static country mapping because data.countries is not an array');
        console.log('[SMSPVA] data.countries value:', data.countries);
        Object.entries(COUNTRY_CODE_MAPPING).forEach(([smsActivateId, smspvaCode]) => {
          countries.push({
            id: smsActivateId,
            name: smspvaCode,
            code: smspvaCode
          });
        });
      }

      // Handle services mapping - use SMSPVA services directly from API
      console.log('[SMSPVA] Transform services - input type:', typeof data.services, 'isArray:', Array.isArray(data.services));
      console.log('[SMSPVA] Transform services - data.services:', data.services);
      
      // Check if data.services is {services: [array]} format
      let servicesArray = null;
      if (data.services && data.services.services && Array.isArray(data.services.services)) {
        servicesArray = data.services.services;
        console.log('[SMSPVA] Using data.services.services array with', servicesArray.length, 'entries');
      } else if (data.services && Array.isArray(data.services)) {
        servicesArray = data.services;
        console.log('[SMSPVA] Using data.services array with', servicesArray.length, 'entries');
      }
      
      if (servicesArray) {
        // SMSPVA services format: [{name: "Google", service: "opt1", price_day: 0.5, count: 0}]
        servicesArray.forEach((serviceData: any) => {
          if (serviceData.service && serviceData.name) {
            services.push({
              service: serviceData.service, // Use SMSPVA service code directly
              name: serviceData.name,
              cost: parseFloat(serviceData.price_day) || 0.5,
              count: parseInt(serviceData.count) || 0
            });
          }
        });
        
        console.log(`[SMSPVA] Processed ${services.length} services from array`);
      } else if (data.services && typeof data.services === 'object') {
        // Alternative format: {opt1: {name: "Google", cost: "1.5", count: "100"}}
        Object.entries(data.services).forEach(([smspvaCode, serviceData]: [string, any]) => {
          services.push({
            service: smspvaCode, // Use SMSPVA service code directly
            name: serviceData.name || smspvaCode,
            cost: parseFloat(serviceData.cost || serviceData.price_day) || 0.5,
            count: parseInt(serviceData.count) || 0
          });
        });
        
        console.log(`[SMSPVA] Processed ${services.length} services from object format`);
      } else {
        // Fallback to static service mapping
        console.log('[SMSPVA] Using fallback service mapping');
        Object.entries(SERVICE_CODE_MAPPING).forEach(([smsActivateCode, smspvaCode]) => {
          services.push({
            service: smspvaCode, // Use SMSPVA codes in fallback too
            name: SERVICE_NAMES[smsActivateCode] || smsActivateCode,
            cost: 0.5,
            count: 0
          });
        });
      }

      console.log(`[SMSPVA] Transformed ${services.length} services and ${countries.length} countries to SMS-Activate format`);
    
      return {
        services: services,
        countries: countries
      };
    } catch (error) {
      console.error('[SMSPVA] Error transforming services response:', error);
      
      // Fallback response
      const fallbackServices = Object.entries(SERVICE_CODE_MAPPING).map(([smsActivateCode, smspvaCode]) => ({
        service: smsActivateCode,
        name: SERVICE_NAMES[smsActivateCode] || smsActivateCode,
        cost: 0.5,
        count: 10
      }));

      const fallbackCountries = Object.entries(COUNTRY_CODE_MAPPING).map(([id, code]) => ({
        id: id,
        name: code,
        code: code
      }));

      return {
        services: fallbackServices,
        countries: fallbackCountries
      };
    }
  },

  /**
   * Transform SMSPVA rental response to SMS-Activate format
   */
  transformRentResponse(data: any) {
    return {
      activationId: data.id?.toString() || '',
      phoneNumber: data.number || '',
      activationCost: '0.50', // Default cost
      activationStatus: 'ACTIVE',
      smsCode: null,
      smsText: null,
      expiresAt: data.until ? new Date(data.until * 1000).toISOString() : null,
      rentTime: data.rentTime || '4',
      service: data.service || '',
      country: data.countryCode || ''
    };
  },

  /**
   * Transform rental messages response
   */
  transformRentalMessages(data: any) {
    console.log('[SMSPVA] ===== TRANSFORMING RENTAL MESSAGES =====');
    console.log('[SMSPVA] Input data type:', typeof data);
    console.log('[SMSPVA] Input data:', JSON.stringify(data, null, 2));
    
    // Handle SMSPVA rental API SMS response format
    if (data && data.status === 1 && data.data) {
      console.log(`[SMSPVA] ✅ Valid status 1 response`);
      
      let messageList: any[] = [];
      
      // SMSPVA returns messages in data.SmsList and data.OtherSms arrays
      if (data.data.SmsList && Array.isArray(data.data.SmsList)) {
        console.log(`[SMSPVA] Found ${data.data.SmsList.length} SMS messages in SmsList`);
        messageList = messageList.concat(data.data.SmsList);
      }
      
      if (data.data.OtherSms && Array.isArray(data.data.OtherSms)) {
        console.log(`[SMSPVA] Found ${data.data.OtherSms.length} SMS messages in OtherSms`);
        messageList = messageList.concat(data.data.OtherSms);
      }
      
      // Fallback: check if data.data is directly an array (old format)
      if (Array.isArray(data.data) && messageList.length === 0) {
        console.log(`[SMSPVA] Using legacy array format with ${data.data.length} messages`);
        messageList = data.data;
      }
      
      console.log(`[SMSPVA] Total messages to process: ${messageList.length}`);
      
      const messages = messageList.map((sms: any, index: number) => {
        console.log(`[SMSPVA] Processing message ${index}:`, sms);
        return {
          text: sms.text || sms.message || '',
          sender: sms.sender || sms.from || 'SMSPVA',
          date: sms.date ? (typeof sms.date === 'number' ? new Date(sms.date * 1000).toISOString() : sms.date) : new Date().toISOString(),
          received_at: sms.date ? (typeof sms.date === 'number' ? new Date(sms.date * 1000).toISOString() : sms.date) : new Date().toISOString(),
          code: this.extractCodeFromText(sms.text || sms.message || '')
        };
      });

      console.log(`[SMSPVA] ✅ Transformed ${messages.length} messages:`, JSON.stringify(messages, null, 2));
      return {
        status: 'success',
        messages: messages,
        hasMessages: messages.length > 0
      };
    }

    // Handle status 0 (no messages or error)
    if (data && data.status === 0) {
      const errorMsg = data.msg || data.error_msg || 'No messages available';
      console.log(`[SMSPVA] ❌ Status 0 response: ${errorMsg}`);
      return {
        status: 'success',
        messages: [],
        hasMessages: false,
        error: errorMsg
      };
    }

    // Handle legacy response format
    if (data && Array.isArray(data)) {
      const messages = data.map((sms: any) => ({
        text: sms.text || sms.message || '',
        sender: sms.sender || sms.from || 'SMSPVA',
        date: sms.date ? (typeof sms.date === 'number' ? new Date(sms.date * 1000).toISOString() : sms.date) : new Date().toISOString(),
        received_at: sms.date ? (typeof sms.date === 'number' ? new Date(sms.date * 1000).toISOString() : sms.date) : new Date().toISOString(),
        code: this.extractCodeFromText(sms.text || sms.message || '')
      }));

      console.log(`[SMSPVA] Transformed ${messages.length} legacy format messages`);
      return {
        status: 'success',
        messages: messages,
        hasMessages: messages.length > 0
      };
    }

    console.log('[SMSPVA] No messages found or unsupported format');
    return {
      status: 'success',
      messages: [],
      hasMessages: false
    };
  },

  /**
   * Transform SMSPVA rent list response to SMS-Activate format
   */
  transformRentListResponse(data: any) {
    // Handle SMSPVA rental API orders response format
    if (data && data.status === 1 && data.data && Array.isArray(data.data)) {
      const rentals = data.data.map((rental: any) => ({
        id: rental.id?.toString() || '',
        phoneNumber: rental.ccode && rental.pnumber ? `${rental.ccode}${rental.pnumber}` : rental.pnumber || '',
        service: rental.scode || '',
        serviceName: rental.sname || '',
        status: this.mapRentalStatus(rental.state),
        expiresAt: rental.until ? new Date(rental.until * 1000).toISOString() : null,
        hasNewSms: rental.hasnewsms || false,
        canProlong: rental.canprolong || false,
        country: rental.cname || '',
        lastOnline: rental.lastonline ? new Date(rental.lastonline * 1000).toISOString() : null
      }));

      return {
        status: 'success',
        rentals: rentals
      };
    }

    return {
      status: 'success',
      rentals: []
    };
  },

  mapRentalStatus(state: number): string {
    switch (state) {
      case 0: return 'INACTIVE'; // not active, need to activate before send SMS
      case 1: return 'ACTIVE';   // active, can receive SMS
      case 2: return 'ACTIVATING'; // activating process
      case -1: return 'INVALID'; // phone number not in the system
      default: return 'UNKNOWN';
    }
  },

  extractCodeFromText(text: string): string | null {
    // Extract verification code from SMS text
    const codePatterns = [
      /\b(\d{4,8})\b/g,           // 4-8 digit codes
      /code[:\s]*(\d{4,8})/gi,    // "code: 123456"
      /verification[:\s]*(\d{4,8})/gi, // "verification: 123456"
      /confirm[:\s]*(\d{4,8})/gi, // "confirm: 123456"
      /pin[:\s]*(\d{4,8})/gi      // "pin: 123456"
    ];

    for (const pattern of codePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Extract just the digits from the match
        const code = matches[0].replace(/\D/g, '');
        if (code.length >= 4 && code.length <= 8) {
          return code;
        }
      }
    }

    return null;
  }
}; 