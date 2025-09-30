import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiMessageSquare, 
  FiRefreshCw, 
  FiDownload, 
  FiSearch, 
  FiFilter,
  FiClock,
  FiGlobe,
  FiPhone,
  FiPlay,
  FiPause,
  FiCode,
  FiServer
} from 'react-icons/fi';
import { usePhoneMessages } from '../../hooks/usePhoneMessages';
import type { PhoneNumber } from '../../types/database';
import Button from '../ui/Button';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: PhoneNumber;
}

const EnhancedMessageModal: React.FC<EnhancedMessageModalProps> = ({
  isOpen,
  onClose,
  phoneNumber
}) => {
  const {
    messages,
    loading,
    error,
    phoneNumber: phoneData,
    filterProvider,
    searchTerm,
    autoRefresh,
    fetchMessages,
    syncMessages,
    toggleAutoRefresh,
    filteredMessages,
    exportMessages,
    setFilterProvider,
    setSearchTerm
  } = usePhoneMessages(phoneNumber.id);

  const [showRawHtml, setShowRawHtml] = useState<string | null>(null);

  const handleRefresh = () => {
    fetchMessages(phoneNumber.id, true);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'receive_sms_online':
        return <FiGlobe className="h-4 w-4 text-blue-500" />;
      case 'smspva':
        return <FiServer className="h-4 w-4 text-green-500" />;
      case 'gogetsms':
        return <FiServer className="h-4 w-4 text-orange-500" />;
      case 'sms_activate':
      default:
        return <FiPhone className="h-4 w-4 text-purple-500" />;
    }
  };

  const getMessageSourceBadge = (messageSource?: string) => {
    if (messageSource === 'scraping') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <FiGlobe className="h-3 w-3 mr-1" />
          Scraped
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <FiPhone className="h-3 w-3 mr-1" />
          API
        </span>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
        >
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getProviderIcon(phoneNumber.provider)}
                <div className="ml-3">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Messages for {phoneNumber.phone_number}
                  </h3>
                                     <p className="text-sm text-gray-500 dark:text-gray-400">
                     {phoneNumber.provider === 'receive_sms_online' 
                       ? 'Manual Phone Number'
                       : phoneNumber.provider === 'smspva'
                       ? 'SMSPVA Number'
                       : 'SMS-Activate Number'}
                     {messages.length > 0 && messages[0].last_scraped_at && (
                       <span className="ml-2">
                         • Last synced {formatDistanceToNow(new Date(messages[0].last_scraped_at), { addSuffix: true })}
                       </span>
                     )}
                   </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {/* Controls */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-2">
                <FiFilter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value as any)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Sources</option>
                  <option value="sms_activate">SMS-Activate</option>
                  <option value="smspva">SMSPVA</option>
                  <option value="receive_sms_online">Manual</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  leftIcon={<FiRefreshCw className={loading ? 'animate-spin' : ''} />}
                >
                  Refresh
                </Button>

                {(phoneNumber.provider === 'receive_sms_online' || phoneNumber.provider === 'smspva') && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={syncMessages}
                      disabled={loading}
                      leftIcon={<FiMessageSquare />}
                    >
                      Sync
                    </Button>

                    <Button
                      variant={autoRefresh ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={toggleAutoRefresh}
                      leftIcon={autoRefresh ? <FiPause /> : <FiPlay />}
                    >
                      {autoRefresh ? 'Stop' : 'Auto'}
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportMessages}
                  disabled={filteredMessages.length === 0}
                  leftIcon={<FiDownload />}
                >
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>
                <Button onClick={handleRefresh} variant="primary">
                  Try Again
                </Button>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <FiMessageSquare className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No messages found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {phoneNumber.provider === 'receive_sms_online' 
                    ? 'Try syncing messages from receive-sms-online.info'
                    : phoneNumber.provider === 'smspva'
                    ? 'Try syncing messages from SMSPVA'
                    : phoneNumber.provider === 'gogetsms'
                    ? 'Try syncing messages from GoGetSMS'
                    : 'No messages have been received for this phone number yet.'
                  }
                </p>
                {(phoneNumber.provider === 'receive_sms_online' || phoneNumber.provider === 'smspva' || phoneNumber.provider === 'gogetsms') && (
                  <div className="mt-4">
                    <Button onClick={syncMessages} variant="primary" disabled={loading}>
                      Sync Messages
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Showing {filteredMessages.length} of {messages.length} messages
                </div>
                
                <AnimatePresence>
                  {filteredMessages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {message.sender}
                          </div>
                          {getMessageSourceBadge(message.message_source)}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <FiClock className="h-3 w-3" />
                          <span>{new Date(message.received_at).toLocaleString()}</span>
                          {message.raw_html && (
                            <button
                              onClick={() => setShowRawHtml(showRawHtml === message.id ? null : message.id)}
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View raw HTML"
                            >
                              <FiCode className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {message.message}
                      </div>

                      {/* Raw HTML Display */}
                      {showRawHtml === message.id && message.raw_html && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                        >
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Raw HTML:
                          </div>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                            {message.raw_html}
                          </pre>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {autoRefresh && phoneNumber.provider === 'receive_sms_online' && (
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Auto-refresh active (30s)
                </span>
              )}
            </div>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedMessageModal; 