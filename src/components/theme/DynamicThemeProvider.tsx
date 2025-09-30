import React, { useEffect, ReactNode } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface DynamicThemeProviderProps {
  children: ReactNode;
}

/**
 * Dynamically injects CSS variables and updates document title/favicon based on settings
 */
const DynamicThemeProvider: React.FC<DynamicThemeProviderProps> = ({ children }) => {
  const { settings, colors, loading } = useSettingsContext();
  
  // Set document title using the custom hook (only for dashboard pages, not landing)
  useDocumentTitle({
    title: settings?.website_name,
    loading: loading
  });
  
  // Update favicon based on settings
  useEffect(() => {
    if (settings?.favicon_url) {
      const existingFavicon = document.querySelector('link[rel="icon"]');
      
      if (existingFavicon) {
        existingFavicon.setAttribute('href', settings.favicon_url);
      } else {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = settings.favicon_url;
        document.head.appendChild(favicon);
      }
    }
  }, [settings?.favicon_url]);
  
  // Inject CSS variables for colors
  useEffect(() => {
    console.log('Applying colors:', colors);
    const rootElement = document.documentElement;
    
    // Set primary color variables
    rootElement.style.setProperty('--color-primary', colors.primary);
    rootElement.style.setProperty('--color-primary-rgb', colors.primaryRgb);
    rootElement.style.setProperty('--color-primary-hover', colors.primaryHover);
    rootElement.style.setProperty('--color-primary-light', colors.primaryLight);
    rootElement.style.setProperty('--color-primary-dark', colors.primaryDark);
    
    // Set accent color variables
    rootElement.style.setProperty('--color-accent', colors.accent);
    rootElement.style.setProperty('--color-accent-rgb', colors.accentRgb);
    rootElement.style.setProperty('--color-accent-hover', colors.accentHover);
    rootElement.style.setProperty('--color-accent-light', colors.accentLight);
    rootElement.style.setProperty('--color-accent-dark', colors.accentDark);
    
    // Apply styles directly to commonly colored elements for immediate effect
    const styleElement = document.getElementById('dynamic-theme-styles') || document.createElement('style');
    if (!styleElement.id) {
      styleElement.id = 'dynamic-theme-styles';
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      .bg-primary { background-color: ${colors.primary} !important; }
      .text-primary { color: ${colors.primary} !important; }
      .border-primary { border-color: ${colors.primary} !important; }
      .hover\\:bg-primary-hover:hover { background-color: ${colors.primaryHover} !important; }
      .bg-primary-light { background-color: ${colors.primaryLight} !important; }
      .bg-primary-dark { background-color: ${colors.primaryDark} !important; }
      
      .bg-accent { background-color: ${colors.accent} !important; }
      .text-accent { color: ${colors.accent} !important; }
      .border-accent { border-color: ${colors.accent} !important; }
      .hover\\:bg-accent-hover:hover { background-color: ${colors.accentHover} !important; }
      .bg-accent-light { background-color: ${colors.accentLight} !important; }
      .bg-accent-dark { background-color: ${colors.accentDark} !important; }
      
      .focus\\:ring-accent:focus { --tw-ring-color: ${colors.accent} !important; }
      .focus\\:border-accent:focus { border-color: ${colors.accent} !important; }
    `;
    
    // Clean up function to reset styles if component unmounts
    return () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [colors]);
  
  return <>{children}</>;
};

export default DynamicThemeProvider; 