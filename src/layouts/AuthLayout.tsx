import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building, Briefcase } from 'lucide-react';
import { useSettingsContext } from '../context/SettingsContext';

const AuthLayout: React.FC = () => {
  const { settings } = useSettingsContext();
  const location = useLocation();
  
  // Check if we're on the login page specifically
  const isLoginPage = location.pathname === '/login';
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 md:p-8">
      {/* Main container with shadow and rounded corners */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full overflow-hidden bg-white dark:bg-gray-800 shadow-xl rounded-xl flex flex-col md:flex-row ${isLoginPage ? 'md:max-w-5xl' : 'md:max-w-md'}`}
      >
        {/* Left column - Only shown on login page and on medium screens and up */}
        {isLoginPage && (
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-gray-800 to-gray-900 p-8 text-white flex-col justify-between">
            <div className="h-full flex flex-col justify-between">
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.7 }}
                  className="flex items-center space-x-3 mb-8"
                >
                  <Briefcase size={32} className="text-white" />
                  <span className="font-app font-app-bold text-xl">{settings?.website_name || 'Ihr Portal'}</span>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                >
                  <h2 className="text-3xl font-app font-app-bold mb-6">Willkommen zurück bei {settings?.website_name || 'Ihrem Portal'}</h2>
                  <p className="text-lg opacity-90 mb-8">Melden Sie sich an, um auf Ihr Mitarbeiter-Dashboard zuzugreifen und Ihre Aufgaben zu verwalten.</p>
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="rounded-lg bg-white/10 p-6 backdrop-blur-sm"
              >
                <h3 className="font-app font-app-medium text-lg mb-2">Einfach. Effizient. Zuverlässig.</h3>
                <p className="opacity-90">Unser Mitarbeiter-Portal bietet Ihnen alle Tools, die Sie für Ihre tägliche Arbeit benötigen.</p>
              </motion.div>
            </div>
          </div>
        )}
        
        {/* Right column - Content area */}
        <div className={`${isLoginPage ? 'md:w-1/2' : 'w-full'} p-6 md:p-8 lg:p-10`}>
          {/* Logo for non-login pages or mobile view on login page */}
          {(!isLoginPage || true) && (
            <div className="mb-8 flex justify-center md:justify-start">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex items-center"
              >
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-10" />
                ) : (
                  <Building size={36} className="text-accent" />
                )}
                <span className="ml-3 font-app font-app-bold text-xl text-gray-900 dark:text-white">
                  {settings?.website_name || 'Ihr Portal'}
                </span>
              </motion.div>
            </div>
          )}
          
          {/* Page title for non-login pages or mobile view on login page */}
          {!isLoginPage && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6 text-center md:text-left"
            >
              <h2 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">
                {location.pathname === '/register' ? 'Konto erstellen' : 'Willkommen zurück'}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Mitarbeiter-Management und Auftrags-Dashboard
              </p>
            </motion.div>
          )}
          
          {/* Content from child routes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;