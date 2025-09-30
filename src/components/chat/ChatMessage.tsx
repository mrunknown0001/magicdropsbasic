import React from 'react';
import { MessageSquare, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/chatService';
import { FileAttachment } from './FileAttachment';
import { useChatManagerSettings } from '../../hooks/useChatManagerSettings';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatMessageProps {
  message: ChatMessageType;
  primaryColor: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, primaryColor }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const { settings: chatManagerSettings } = useChatManagerSettings();

  // Format timestamp
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: de });
    } catch {
      return '';
    }
  };

  // Render message content with basic markdown support
  const renderContent = (content: string) => {
    // Simple markdown-like formatting
    let formattedContent = content
      // Bold text **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text *text*
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br />');

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formattedContent }}
        className="whitespace-pre-wrap"
      />
    );
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl shadow-sm
            ${isUser 
              ? 'text-white rounded-br-md' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
            }
          `}
          style={{
            backgroundColor: isUser ? primaryColor : undefined
          }}
        >
          {/* Message Content */}
          <div className="text-sm leading-relaxed">
            {renderContent(message.content)}
          </div>

          {/* File Attachment */}
          {message.attachment && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <FileAttachment 
                attachment={message.attachment}
                isUserMessage={isUser}
              />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.created_at)}
        </div>
      </div>

      {/* Avatar for AI messages - Show manager profile */}
      {!isUser && (
        <div className="mr-3 flex-shrink-0 order-0">
          {chatManagerSettings?.manager_avatar_url ? (
            <img
              src={chatManagerSettings.manager_avatar_url}
              alt={chatManagerSettings.manager_name || 'Projektleiter'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <User size={12} className="text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
