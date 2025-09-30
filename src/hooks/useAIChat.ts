import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatService, ChatMessage, ChatConversation } from '../services/chatService';
import { ChatContextBuilder } from '../utils/chatContext';
import { getManagerStatus, calculateHumanTiming, generateAwayMessage, enhanceResponseWithHumanElements } from '../utils/humanBehavior';
import toast from 'react-hot-toast';

interface UseAIChatOptions {
  taskAssignmentId?: string;
  autoInitialize?: boolean;
}

export const useAIChat = (options: UseAIChatOptions = {}) => {
  const { taskAssignmentId, autoInitialize = true } = options;
  const { user, profile } = useAuth();
  
  // State
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const subscriptionRef = useRef<any>(null);
  const isInitializingRef = useRef(false);

  /**
   * Initialize chat conversation
   */
  const initializeChat = useCallback(async () => {
    if (!user || !profile || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('Initializing AI chat for user:', user.id);
      
      // Always use general conversation type to ensure persistence across sessions
      const conv = await ChatService.createConversation(
        'Projektleitung Chat',
        'general', // Always use general to maintain single conversation per user
        taskAssignmentId
      );
      
      setConversation(conv);
      console.log('Conversation ready:', conv.id);

      // Load existing messages if conversation already exists
      if (conv.isExisting) {
        const existingMessages = await ChatService.getMessages(conv.id);
        setMessages(existingMessages);
        console.log(`Loaded ${existingMessages.length} existing messages`);
      } else {
        // Generate welcome message for new conversations
        const welcomeMessage = ChatContextBuilder.generateWelcomeMessage(profile);
        setMessages([{
          id: 'welcome',
          content: welcomeMessage,
          role: 'assistant',
          created_at: new Date().toISOString()
        }]);
      }

      // Set up real-time subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      
      subscriptionRef.current = ChatService.subscribeToMessages(conv.id, (newMessage) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });

      setIsInitialized(true);
      console.log('AI chat initialized successfully');
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      toast.error('Fehler beim Initialisieren des Chats');
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [user, profile, taskAssignmentId]);

  /**
   * Send text message
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!conversation || !content.trim()) return;

    setError(null);
    
    // Add user message optimistically
    const optimisticUserMessage = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      role: 'user' as const,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticUserMessage]);
    
    // ENHANCED: Check manager availability and calculate human-like timing
    const managerStatus = getManagerStatus();
    
    // Handle away messages for non-working hours
    if (!managerStatus.isAvailable) {
      const awayMessage = generateAwayMessage(managerStatus);
      if (awayMessage) {
        // Use regular message flow but it will be detected as auto-reply in backend
        try {
          console.log('📤 Sending auto-reply via regular message flow...');
          const result = await ChatService.sendMessage(conversation.id, content.trim());
          
          // The backend will detect offline status and send auto-reply + schedule follow-up
          setMessages(prev => [
            ...prev.filter(m => m.id !== optimisticUserMessage.id),
            result.userMessage,
            result.aiMessage
          ]);
          
          console.log('✅ Auto-reply processed and follow-up scheduled');
        } catch (error) {
          console.error('Error processing auto-reply:', error);
          setError(error instanceof Error ? error.message : 'Failed to send auto-reply');
          toast.error('Fehler beim Senden der Auto-Antwort');
          
          // Remove optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== optimisticUserMessage.id));
        }
        return;
      }
    }
    
    // Calculate realistic human timing
    const preliminaryResponse = "Placeholder response for timing calculation";
    const humanTiming = calculateHumanTiming(content.trim(), preliminaryResponse.length, managerStatus);
    
    setTimeout(() => {
      setIsTyping(true);
    }, humanTiming.readingDelay);

    try {
      console.log('Sending message:', content);
      
      const result = await ChatService.sendMessage(conversation.id, content.trim());
      
      // ENHANCED: Human-like typing simulation with realistic timing
      const finalTiming = calculateHumanTiming(content, result.aiMessage.content.length, managerStatus);
      
      // Enhance response with human elements
      const enhancedAIResponse = {
        ...result.aiMessage,
        content: enhanceResponseWithHumanElements(result.aiMessage.content, content, managerStatus)
      };
      
      // Show typing for realistic duration with human variations
      setTimeout(() => {
        // Replace optimistic message with real ones
        setMessages(prev => [
          ...prev.filter(m => m.id !== optimisticUserMessage.id),
          result.userMessage,
          enhancedAIResponse
        ]);
        setIsTyping(false);
        
        console.log('Message sent successfully with human-like timing');
      }, finalTiming.typingDelay);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      toast.error('Fehler beim Senden der Nachricht');
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticUserMessage.id));
      setIsTyping(false);
    }
  }, [conversation]);

  /**
   * Upload file
   */
  const uploadFile = useCallback(async (file: File) => {
    if (!conversation) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Uploading file:', file.name);
      
      const fileMessage = await ChatService.uploadFile(conversation.id, file);
      
      // Add file message to state
      setMessages(prev => [...prev, fileMessage]);
      
      toast.success('Datei erfolgreich hochgeladen');
      console.log('File uploaded successfully');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      toast.error('Fehler beim Hochladen der Datei');
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  /**
   * Clear current conversation
   */
  const clearConversation = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setIsInitialized(false);
    setError(null);
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  }, []);

  /**
   * Refresh messages
   */
  const refreshMessages = useCallback(async () => {
    if (!conversation) return;

    try {
      const freshMessages = await ChatService.getMessages(conversation.id);
      setMessages(freshMessages);
    } catch (err) {
      console.error('Error refreshing messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh messages');
    }
  }, [conversation]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize && user && profile && !isInitialized) {
      initializeChat();
    }
  }, [autoInitialize, user, profile, isInitialized, initializeChat]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    // State
    conversation,
    messages,
    isLoading,
    isInitialized,
    error,
    isTyping,
    
    // Actions
    initializeChat,
    sendMessage,
    uploadFile,
    clearConversation,
    refreshMessages
  };
};

/**
 * Detect urgency level for follow-up prioritization
 */
function detectUrgencyLevel(message: string): 'low' | 'normal' | 'high' | 'urgent' {
  const urgentWords = /hilfe|problem|fehler|dringend|schnell|sofort|wichtig|eilig/i;
  const casualWords = /danke|bitte|vielleicht|später|gerne|mal/i;
  const exclamationCount = (message.match(/!/g) || []).length;
  
  if (urgentWords.test(message) || exclamationCount >= 2) {
    return 'high';
  }
  
  if (casualWords.test(message) || message.includes('?')) {
    return 'low';
  }
  
  return 'normal';
}

