/**
 * Converts a HEX color to RGB format
 * @param hex HEX color code (e.g. #ff0000)
 * @returns RGB values as a string (e.g. "255, 0, 0") or null if invalid
 */
export function hexToRgb(hex: string): string | null {
  // Remove # if present
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  
  // Handle both 3-digit and 6-digit hex codes
  const expandedHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;
    
  // Parse the hex values
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expandedHex);
  
  if (!result) return null;
  
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Generates derived colors (lighter/darker variants) from a base color
 * @param hex Base color in HEX format
 * @returns Object containing hover, light, and dark variants
 */
export function getDerivedColors(hex: string): { 
  hover: string;
  light: string;
  dark: string;
} {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  
  // Convert hex to RGB
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  
  // Darken for hover (multiply by 0.85)
  const hoverR = Math.floor(r * 0.85);
  const hoverG = Math.floor(g * 0.85);
  const hoverB = Math.floor(b * 0.85);
  
  // Lighten for light variant (add 15% of the distance to white)
  const lightR = Math.min(255, Math.floor(r + (255 - r) * 0.4));
  const lightG = Math.min(255, Math.floor(g + (255 - g) * 0.4));
  const lightB = Math.min(255, Math.floor(b + (255 - b) * 0.4));
  
  // Darken for dark variant (multiply by 0.7)
  const darkR = Math.floor(r * 0.7);
  const darkG = Math.floor(g * 0.7);
  const darkB = Math.floor(b * 0.7);
  
  // Convert back to hex
  const hover = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
  const light = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
  const dark = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
  
  return { hover, light, dark };
}

/**
 * Validates if a string is a valid HEX color
 * @param hex String to validate
 * @returns Boolean indicating if the string is a valid HEX color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#?([0-9A-F]{3}){1,2}$/i.test(hex);
}

/**
 * Ensures a HEX color starts with #
 * @param hex HEX color code
 * @returns Normalized HEX color with # prefix
 */
export function normalizeHexColor(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Calculates contrast ratio between two colors
 * @param hex1 First color in HEX format
 * @param hex2 Second color in HEX format
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const [r1, g1, b1] = rgb1.split(',').map(n => parseInt(n.trim(), 10));
  const [r2, g2, b2] = rgb2.split(',').map(n => parseInt(n.trim(), 10));
  
  // Calculate relative luminance
  const luminance1 = calculateRelativeLuminance(r1, g1, b1);
  const luminance2 = calculateRelativeLuminance(r2, g2, b2);
  
  // Calculate contrast ratio
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculates relative luminance of a color
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @returns Relative luminance value
 */
function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r / 255, g / 255, b / 255];
  const rgb = sRGB.map(val => 
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
} 