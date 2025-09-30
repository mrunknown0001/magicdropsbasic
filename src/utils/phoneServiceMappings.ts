/**
 * Mappings for phone service codes to human-readable names
 */

// Service name mappings
export const serviceNameMappings: Record<string, string> = {
  ok: "OkRu",
  go: "Google",
  av: "Avito",
  ym: "Yandex",
  ma: "Mail.ru",
  mm: "MeetMe",
  wb: "WhatsApp Business",
  tg: "Telegram",
  wa: "WhatsApp",
  vi: "Viber",
  fb: "Facebook",
  tw: "Twitter",
  in: "Instagram",
  ub: "Uber",
  gt: "Gett",
  sn: "Snapchat",
  we: "WeChat",
  vk: "VKontakte",
  ot: "Microsoft/Office",
  yh: "Yahoo",
  me: "Discord",
  am: "Amazon",
  dp: "Delivery Club",
  ya: "Yalla",
  yl: "Yalla Live",
  ki: "Kik",
  dt: "DoorDash",
  ao: "AliExpress",
  tn: "TikTok",
  nu: "Nike",
  uk: "Uklon",
  pm: "Paypal",
  oi: "OLX",
  ss: "Steam",
  mt: "Microsoft Teams",
  tc: "Tinder",
  // Anosim-specific service mappings
  ig: "Instagram", 
  ds: "Discord",
  ap: "Apple",
  ms: "Microsoft",
  lf: "TikTok",
  nt: "Netflix",
  li: "LinkedIn",
  // GoGetSMS-specific service mappings
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  google: "Google",
  facebook: "Facebook",
  twitter: "Twitter",
  instagram: "Instagram",
  other: "Other Services",
  // Add more service mappings as needed
};

// Country name mappings
export const countryNameMappings: Record<string, string> = {
  0: "Russia",
  1: "Ukraine",
  2: "Kazakhstan",
  3: "China",
  4: "Philippines",
  5: "Myanmar",
  6: "Indonesia",
  7: "Malaysia",
  8: "Kenya",
  9: "Tanzania",
  10: "Vietnam",
  11: "Kyrgyzstan",
  12: "USA",
  13: "Israel",
  14: "HongKong",
  15: "Poland",
  16: "England",
  17: "Madagascar",
  18: "Congo",
  19: "Nigeria",
  20: "Macao",
  21: "Egypt",
  22: "India",
  23: "Ireland",
  24: "Cambodia",
  25: "Laos",
  26: "Haiti",
  27: "Ivory Coast",
  28: "Gambia",
  29: "Serbia",
  30: "Yemen",
  31: "South Africa",
  32: "Romania",
  33: "Estonia",
  34: "Azerbaijan",
  35: "Canada",
  36: "Morocco",
  37: "Ghana",
  38: "Argentina",
  39: "Uzbekistan",
  40: "Cameroon",
  41: "Chad",
  42: "Germany",
  43: "Lithuania",
  44: "Croatia",
  45: "Sweden",
  46: "Iraq",
  47: "Netherlands",
  48: "Latvia",
  49: "Austria",
  50: "Belarus",
  51: "Thailand",
  52: "Saudi Arabia",
  53: "Mexico",
  54: "Taiwan",
  55: "Spain",
  56: "Iran",
  57: "Algeria",
  58: "Slovenia",
  59: "Bangladesh",
  60: "Senegal",
  61: "Turkey",
  62: "Czech Republic",
  63: "Sri Lanka",
  64: "Peru",
  65: "Pakistan",
  66: "New Zealand",
  67: "Guinea",
  68: "Mali",
  69: "Venezuela",
  70: "Ethiopia",
  // Anosim-specific country mappings
  98: "Germany", // Anosim country ID for Germany
  165: "Lithuania", // Anosim country ID for Lithuania
  // Add more country mappings as needed
};

/**
 * Get a human-readable service name from a service code
 */
export const getServiceName = (code: string): string => {
  return serviceNameMappings[code] || `Service ${code}`;
};

/**
 * Get a human-readable country name from a country code
 */
export const getCountryName = (code: string): string => {
  return countryNameMappings[code] || `Country ${code}`;
};
