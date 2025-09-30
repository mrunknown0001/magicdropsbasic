import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, User, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useAIChat } from '../../hooks/useAIChat';
import { useChatManagerSettings } from '../../hooks/useChatManagerSettings';
import { getManagerStatus } from '../../utils/humanBehavior';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

interface AIChatWidgetProps {
  taskAssignmentId?: string;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({
  taskAssignmentId,
  position = 'bottom-right',
  className = ''
}) => {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const { settings: chatManagerSettings, loading: chatManagerLoading } = useChatManagerSettings();
  
  // Widget state
  const [isOpen, setIsOpen] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [managerStatus, setManagerStatus] = useState(getManagerStatus());
  
  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Chat functionality
  const {
    conversation,
    messages,
    isLoading,
    isInitialized,
    error,
    isTyping,
    sendMessage,
    uploadFile,
    initializeChat
  } = useAIChat({ 
    taskAssignmentId, 
    autoInitialize: false 
  });

  // Check if worker needs attention
  useEffect(() => {
    if (!profile) return;

    const hasIssues = 
      profile.kyc_status === 'rejected' || 
      profile.kyc_status === 'pending';

    setNeedsAttention(hasIssues);
  }, [profile]);

  // Initialize chat when widget opens
  useEffect(() => {
    if (isOpen && !isInitialized && !isLoading) {
      initializeChat();
    }
  }, [isOpen, isInitialized, isLoading, initializeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isOpen]);

  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    if (isTyping && messagesEndRef.current && isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }, 100); // Small delay to ensure typing indicator is rendered
    }
  }, [isTyping, isOpen]);

  // Update manager status every minute for realistic availability
  useEffect(() => {
    const updateStatus = () => {
      setManagerStatus(getManagerStatus());
    };
    
    // Update immediately and then every minute
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Position classes
  const getPositionClasses = () => {
    const base = 'fixed z-50';
    switch (position) {
      case 'bottom-right':
        return `${base} bottom-6 right-6`;
      case 'bottom-left':
        return `${base} bottom-6 left-6`;
      default:
        return `${base} bottom-6 right-6`;
    }
  };

  // Get button styling
  const getButtonStyling = () => {
    if (needsAttention) {
      return {
        backgroundColor: '#ef4444',
        icon: <MessageSquare size={24} />,
        tooltip: 'Du benötigst Hilfe - Klick hier!'
      };
    }

    return {
      backgroundColor: settings?.primary_color || '#3b82f6',
      icon: <MessageSquare size={24} />,
      tooltip: 'Projektleitung kontaktieren'
    };
  };

  const buttonStyle = getButtonStyling();

  // Get status text based on manager availability
  const getStatusText = () => {
    const currentHour = new Date().getHours();
    
    switch (managerStatus.status) {
      case 'online':
        if (currentHour < 10) return 'Guten Morgen! Online';
        if (currentHour < 14) return 'Online';
        if (currentHour < 17) return 'Online';
        return 'Online (bis 18:00)';
      case 'busy':
        return 'Beschäftigt';
      case 'lunch':
        return 'Mittagspause (zurück um 13:30)';
      case 'meeting':
        return 'Im Meeting';
      case 'offline':
        if (currentHour < 8) return 'Offline (ab 8:00 verfügbar)';
        if (currentHour >= 18) return 'Feierabend (ab 8:00 verfügbar)';
        return 'Nicht verfügbar';
      default:
        return chatManagerSettings?.manager_title || 'Projektleiter';
    }
  };

  if (!user || !profile) return null;
  
  // Don't render chat if settings are still loading
  if (chatManagerLoading) return null;
  
  // Don't render chat if it's disabled in settings
  if (chatManagerSettings?.chat_enabled === false) return null;

  return (
    <>
      {/* Chat Interface - Independent positioning */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              exit: { duration: 0.2, ease: "easeIn" }
            }}
            className="fixed bottom-20 right-6 z-50"
          >
            <div className="w-[400px] sm:w-[420px] h-[600px] max-w-[calc(100vw-1rem)] max-h-[calc(100vh-2rem)] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Manager Profile Picture */}
                  {chatManagerSettings?.manager_avatar_url ? (
                    <img
                      src={chatManagerSettings.manager_avatar_url}
                      alt={chatManagerSettings.manager_name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: settings?.primary_color || '#3b82f6' }}
                    >
                      <User size={16} className="text-white" />
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chatManagerSettings?.manager_name || 'Markus Friedel'}
                      </h3>
                      {/* Online Status Indicator */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        managerStatus.status === 'online' ? 'bg-green-500' :
                        managerStatus.status === 'busy' ? 'bg-yellow-500' :
                        managerStatus.status === 'lunch' ? 'bg-orange-500' :
                        'bg-gray-400'
                      }`} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {getStatusText()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Schließen"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Context Bar */}
              {isOpen && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate flex items-center space-x-2">
                    <User size={12} />
                    <span>{profile.first_name} {profile.last_name}</span>
                    <span>•</span>
                    <Shield size={12} />
                    <span>KYC: {profile.kyc_status || 'pending'}</span>
                    {conversation && (
                      <>
                        <span>•</span>
                        <MessageSquare size={12} />
                        <span>Projektleitung</span>
                      </>
                    )}
                  </div>
                </div>
              )}

                                            {/* Chat Content */}
              {isOpen && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Messages Area */}
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                    >
                    {!isInitialized && isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                          <p className="text-gray-500 dark:text-gray-400">Verbindung wird hergestellt...</p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-red-500">
                          <p className="text-sm">Fehler: {error}</p>
                          <button 
                            onClick={initializeChat}
                            className="mt-2 text-xs underline hover:no-underline"
                          >
                            Erneut versuchen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => (
                          <ChatMessage 
                            key={message.id} 
                            message={message}
                            primaryColor={settings?.primary_color || '#3b82f6'}
                          />
                        ))}
                        {isTyping && <TypingIndicator />}
                        
                        {/* Scroll target - invisible element at the bottom */}
                        <div ref={messagesEndRef} className="h-0" />
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  {isInitialized && (
                    <ChatInput
                      onSendMessage={sendMessage}
                      onUploadFile={uploadFile}
                      isLoading={isLoading}
                      primaryColor={settings?.primary_color || '#3b82f6'}
                      placeholder={
                        taskAssignmentId 
                          ? "Frage zum aktuellen Projekt..."
                          : "Schreib mir einfach..."
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Independent positioning */}
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.div
            className={`${getPositionClasses()} ${className}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {/* Attention Pulse - Fixed positioning */}
            {needsAttention && (
              <div className="absolute inset-0 rounded-full animate-ping pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-red-500 opacity-75" />
              </div>
            )}

            {/* Main Button */}
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative w-14 h-14 rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 group z-10"
              style={{ backgroundColor: buttonStyle.backgroundColor }}
              title={buttonStyle.tooltip}
              whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="flex items-center justify-center w-full h-full text-white">
                {buttonStyle.icon}
              </div>

              {/* Attention Badge */}
              {needsAttention && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce z-20">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
              )}
            </motion.button>

          {/* Tooltip */}
          <div className="absolute bottom-16 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
              {buttonStyle.tooltip}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
