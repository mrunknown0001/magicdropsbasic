import React, { useState, useRef, useEffect } from 'react';
import { Menu, Moon, Sun, Search, Settings, X, Euro } from 'lucide-react';
import { FiHelpCircle } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import KycStatusIndicator from '../common/KycStatusIndicator';
import { useSearch } from '../../context/SearchContext';
import { useWorkerBalance } from '../../hooks/useWorkerBalance';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettingsContext();
  const { profile, isAdmin, isTaskBasedUser, hasPaymentModeAssigned } = useAuth();
  const { 
    searchTerm, 
    setSearchTerm, 
    executeSearch, 
    searchResults, 
    isSearching,
    clearSearch,
    searchHistory 
  } = useSearch();
  const navigate = useNavigate();
  
  // Fetch worker balance for employees in task-based payment mode (only if assigned)
  const { balance, loading: balanceLoading } = useWorkerBalance(
    !isAdmin() && hasPaymentModeAssigned() && isTaskBasedUser() ? profile?.id : undefined
  );
  
  // Search state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Check if user is admin
  const userIsAdmin = isAdmin();
  
  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm.length >= 2) {
        executeSearch(localSearchTerm);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, executeSearch]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    setSearchTerm(value);
    setSelectedSuggestion(-1); // Reset selection when typing
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchTerm.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(localSearchTerm)}`);
      setShowSuggestions(false);
    }
  };

  const handleResultClick = (result: any) => {
    navigate(result.url);
    setShowSuggestions(false);
    setLocalSearchTerm('');
    setSearchTerm('');
  };

  const handleClearSearch = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
    clearSearch();
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleSeeAllResults = () => {
    if (localSearchTerm.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(localSearchTerm)}`);
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < searchResults.slice(0, 6).length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0 && selectedSuggestion < searchResults.length) {
          handleResultClick(searchResults[selectedSuggestion]);
        } else {
          handleSearchSubmit(e as any);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        searchInputRef.current?.blur();
        break;
    }
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow-sm backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
      <button
        type="button"
        className="md:hidden px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
        onClick={onMenuClick}
      >
        <span className="sr-only">Menü öffnen</span>
        <Menu className="h-6 w-6" />
      </button>
      
      <div className="flex-1 px-4 flex justify-between items-center">
        {/* Left side - Search bar (only visible for admins) or empty div for spacing */}
        {userIsAdmin ? (
          <div ref={searchContainerRef} className="relative max-w-2xl lg:max-w-3xl w-full hidden md:flex items-center">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Mitarbeiter, Bankdrops, Aufgaben..."
                  value={localSearchTerm}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (localSearchTerm.length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="font-app block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                />
                {localSearchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </form>

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (searchResults.length > 0 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden min-w-[600px] lg:min-w-[700px]"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
                      Suchen...
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.slice(0, 6).map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}-${index}`}
                          onClick={() => handleResultClick(result)}
                          className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors ${
                            selectedSuggestion === index
                              ? 'bg-accent/10 dark:bg-accent/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                              result.type === 'employee' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              result.type === 'bankdrop' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              result.type === 'task' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                              result.type === 'phone' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                            }`}>
                              {result.type === 'employee' ? 'MA' :
                               result.type === 'bankdrop' ? 'BD' :
                               result.type === 'task' ? 'AT' :
                               result.type === 'phone' ? 'TN' : 'XX'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {result.title}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {result.subtitle}
                                  </p>
                                  {result.description && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                                      {result.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                  <span className="text-xs text-gray-400 font-medium">
                                    {result.relevanceScore}%
                                  </span>
                                  <span className="text-gray-400">→</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                      
                      {searchResults.length > 6 && (
                        <button
                          onClick={handleSeeAllResults}
                          className="w-full p-4 text-center text-accent hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-600 font-medium text-sm transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>Alle {searchResults.length} Ergebnisse anzeigen</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1">{/* Empty div to push icons to the right */}</div>
        )}
        
        {/* Right side - Actions */}
        <div className="flex items-center space-x-1 md:space-x-4">
          {/* KYC Status Indicator (for employees only) */}
          <KycStatusIndicator profile={profile} size="small" />
          
          {/* Worker Balance (for employees in task-based payment mode only) */}
          {!isAdmin() && hasPaymentModeAssigned() && isTaskBasedUser() && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/mitarbeiter/auszahlung')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 transition-colors"
              aria-label="Guthaben anzeigen"
            >
              <Euro size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {balanceLoading ? '...' : `€${balance?.current_balance?.toFixed(2) || '0.00'}`}
              </span>
            </motion.button>
          )}
          
          {/* Help button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            onClick={(e) => {
              e.preventDefault();
              // Use React Router navigation to avoid page refresh
              if (userIsAdmin) {
                navigate('/admin/support');
              } else {
                navigate('/support');
              }
            }}
            aria-label="Hilfe & Support"
          >
            <FiHelpCircle size={18} />
          </motion.button>
          
          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          
          {/* Settings button (only for admins) */}
          {userIsAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
              onClick={() => navigate('/admin/settings')}
              aria-label="Einstellungen"
            >
              <Settings size={18} />
            </motion.button>
          )}
          
          {/* Profile */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleProfileClick}
            className="flex items-center ml-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            <div className="bg-accent/20 h-8 w-8 rounded-full flex items-center justify-center text-accent font-app font-app-medium">
              {profile?.first_name?.charAt(0).toUpperCase() || '?'}
            </div>
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default Header;