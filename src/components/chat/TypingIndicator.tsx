import React from 'react';
import { MessageSquare, User } from 'lucide-react';
import { useChatManagerSettings } from '../../hooks/useChatManagerSettings';

export const TypingIndicator: React.FC = () => {
  const { settings: chatManagerSettings } = useChatManagerSettings();
  
  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-3">
        {/* Manager Avatar */}
        {chatManagerSettings?.manager_avatar_url ? (
          <img
            src={chatManagerSettings.manager_avatar_url}
            alt={chatManagerSettings.manager_name || 'Projektleiter'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <User size={12} className="text-gray-600 dark:text-gray-400" />
          </div>
        )}

        {/* Typing Animation */}
        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
          <div className="flex items-center space-x-1">
            <div className="text-sm text-gray-600 dark:text-gray-400 mr-2">
              tippt
            </div>
            <div className="flex space-x-1">
              <div 
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div 
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div 
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
