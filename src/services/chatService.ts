import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  attachment?: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    publicUrl: string;
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  isExisting: boolean;
}

export class ChatService {
  private static readonly API_BASE = '/api/chat';

  /**
   * Create or get existing conversation
   */
  static async createConversation(
    title?: string, 
    conversationType: 'general' | 'task_related' | 'support' = 'general',
    taskAssignmentId?: string
  ): Promise<ChatConversation> {
    try {
      const response = await fetch(`${this.API_BASE}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          title,
          conversationType,
          taskAssignmentId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create conversation');
      }

      return {
        id: data.conversation.id,
        title: data.conversation.title,
        created_at: data.conversation.created_at,
        isExisting: data.isExisting
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(conversationId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      const response = await fetch(
        `${this.API_BASE}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch messages');
      }

      return data.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.sender_id === null || msg.metadata?.sender_type === 'ai-assistant' ? 'assistant' : 'user',
        created_at: msg.created_at,
        attachment: msg.chat_attachments?.[0] ? {
          id: msg.chat_attachments[0].id,
          fileName: msg.chat_attachments[0].file_name,
          fileSize: msg.chat_attachments[0].file_size,
          fileType: msg.chat_attachments[0].file_type,
          publicUrl: this.getFileUrl(msg.chat_attachments[0].file_path)
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send message and get AI response
   */
  static async sendMessage(
    conversationId: string, 
    content: string, 
    messageType: 'text' | 'file' | 'image' = 'text'
  ): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
    try {
      const response = await fetch(`${this.API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          conversationId,
          content,
          messageType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      return {
        userMessage: {
          id: data.userMessage.id,
          content: data.userMessage.content,
          role: 'user',
          created_at: data.userMessage.created_at
        },
        aiMessage: {
          id: data.aiMessage.id,
          content: data.aiMessage.content,
          role: 'assistant',
          created_at: data.aiMessage.created_at
        }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file attachment
   */
  static async uploadFile(conversationId: string, file: File): Promise<ChatMessage> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);

      const response = await fetch(`${this.API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload file');
      }

      return {
        id: data.message.id,
        content: data.message.content,
        role: 'user',
        created_at: data.message.created_at,
        attachment: data.message.attachment
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of conversations
   */
  static async getConversations(): Promise<ChatConversation[]> {
    try {
      const response = await fetch(`${this.API_BASE}/conversations`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch conversations');
      }

      return data.conversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        isExisting: true
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw new Error(`Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for file attachment
   */
  private static getFileUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Subscribe to real-time message updates
   */
  static subscribeToMessages(
    conversationId: string, 
    onNewMessage: (message: ChatMessage) => void
  ) {
    return supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const message = payload.new as any;
          onNewMessage({
            id: message.id,
            content: message.content,
            role: message.sender_id === null || message.metadata?.sender_type === 'ai-assistant' ? 'assistant' : 'user',
            created_at: message.created_at
          });
        }
      )
      .subscribe();
  }
}
