import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { OpenAIService } from '../services/openai.service';
import { FollowUpService } from '../services/followUp.service';
import { SchedulerService } from '../services/scheduler.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Create or get existing conversation for user
 */
export const createConversation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, conversationType = 'general', taskAssignmentId } = req.body;

    // Check for existing conversation - always find user's main conversation
    console.log('Checking for existing conversation for user:', userId, 'type:', conversationType);
    
    const { data: existingConversation, error: existingError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, participants')
      .eq('conversation_type', 'general') // Always use general type for persistence
      .eq('created_by', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    console.log('Existing conversation search result:', existingConversation, 'Error:', existingError);

    if (existingConversation) {
      return res.json({
        success: true,
        conversation: existingConversation,
        isExisting: true
      });
    }

    // Create new conversation - always general type for persistence
    const { data: newConversation, error } = await supabase
      .from('chat_conversations')
      .insert({
        title: 'Projektleitung Chat',
        conversation_type: 'general', // Always general for single persistent conversation
        participants: [userId],
        created_by: userId,
        metadata: {}
      })
      .select('id, title, created_at')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    res.json({
      success: true,
      conversation: newConversation,
      isExisting: false
    });
  } catch (error) {
    console.error('Error in createConversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user has access to this conversation
    console.log('Checking message access for user:', userId, 'conversation:', conversationId);
    
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, participants')
      .eq('id', conversationId)
      .single();

    console.log('Messages conversation found:', conversation, 'Error:', convError);

    if (convError || !conversation) {
      console.log('Messages conversation not found:', convError);
      return res.status(403).json({ error: 'Conversation not found' });
    }

    // Check if user is in participants (handle both array and string formats)
    const participants = Array.isArray(conversation.participants) 
      ? conversation.participants 
      : [conversation.participants];
    
    if (!participants.includes(userId)) {
      console.log('Messages access denied. User:', userId, 'Participants:', participants);
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get messages with attachments
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        message_type,
        content,
        metadata,
        created_at,
        chat_attachments (
          id,
          file_name,
          file_path,
          file_type,
          file_size,
          storage_bucket,
          thumbnail_path
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      success: true,
      messages: messages || [],
      total: messages?.length || 0
    });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send message and get AI response
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId, content, messageType = 'text' } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'Conversation ID and content are required' });
    }

    // Verify user has access to this conversation
    console.log('Checking conversation access for user:', userId, 'conversation:', conversationId);
    
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, metadata, participants')
      .eq('id', conversationId)
      .single();

    console.log('Conversation found:', conversation, 'Error:', convError);

    if (convError || !conversation) {
      console.log('Conversation not found:', convError);
      return res.status(403).json({ error: 'Conversation not found' });
    }

    // Check if user is in participants (handle both array and string formats)
    const participants = Array.isArray(conversation.participants) 
      ? conversation.participants 
      : [conversation.participants];
    
    if (!participants.includes(userId)) {
      console.log('User not in participants. User:', userId, 'Participants:', participants);
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Store user message
    const { data: userMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        message_type: messageType,
        content: content.trim(),
        metadata: {}
      })
      .select('id, created_at')
      .single();

    if (messageError) {
      console.error('Error storing user message:', messageError);
      return res.status(500).json({ error: 'Failed to store message' });
    }

    // Check if manager is available (import from utils)
    const { getManagerStatus, generateAwayMessage } = await import('../utils/humanBehavior');
    const managerStatus = getManagerStatus();
    
    // Handle auto-reply for offline hours
    if (!managerStatus.isAvailable) {
      const awayMessage = generateAwayMessage(managerStatus);
      if (awayMessage) {
        // Store auto-reply message
        const { data: aiMessage, error: aiMessageError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: null, // AI assistant
            message_type: 'text',
            content: awayMessage,
            metadata: {
              sender_type: 'ai-assistant',
              is_auto_reply: true,
              promised_return_time: SchedulerService.calculateReturnTime(managerStatus).toISOString()
            }
          })
          .select()
          .single();

        if (aiMessageError) {
          console.error('Error storing auto-reply:', aiMessageError);
          return res.status(500).json({ error: 'Failed to store auto-reply' });
        }

        // Record follow-up promise
        const urgencyLevel = detectUrgencyFromMessage(content);
        await FollowUpService.createFollowUp({
          conversationId,
          userId,
          originalMessageId: userMessage.id,
          autoReplyMessageId: aiMessage.id,
          promisedReturnTime: SchedulerService.calculateReturnTime(managerStatus),
          originalUserMessage: content.trim(),
          urgencyLevel
        });

        console.log(`📅 Auto-reply sent and follow-up scheduled for ${SchedulerService.calculateReturnTime(managerStatus).toLocaleString('de-DE')}`);
        
        return res.json({
          success: true,
          userMessage: {
            id: userMessage.id,
            content: content.trim(),
            created_at: userMessage.created_at
          },
          aiMessage: {
            id: aiMessage.id,
            content: awayMessage,
            created_at: aiMessage.created_at
          },
          isAutoReply: true,
          followUpScheduled: true
        });
      }
    }

    // Build context for AI
    const context = await buildWorkerContext(userId, conversation.metadata?.taskAssignmentId);
    
    // Get knowledge articles that might be used for context
    // First try semantic search based on user message
    let knowledgeArticles: any[] = [];
    
    try {
      // Use direct semantic search function for internal use
      knowledgeArticles = await performInternalSemanticSearch(content, 3, 0.6);
      if (knowledgeArticles.length > 0) {
        console.log(`🔍 Found ${knowledgeArticles.length} relevant articles via semantic search`);
      }
    } catch (semanticError) {
      console.warn('Semantic search failed, using fallback:', semanticError);
    }

    // Fallback to priority-based selection if semantic search didn't find anything
    if (knowledgeArticles.length === 0) {
      const { data: fallbackArticles } = await supabase
        .from('knowledge_base_articles')
        .select(`
          id,
          title,
          summary,
          content,
          context_priority,
          knowledge_base_categories!inner (name)
        `)
        .eq('is_published', true)
        .eq('ai_training_enabled', true)
        .order('context_priority', { ascending: false })
        .limit(5);
      
      knowledgeArticles = fallbackArticles || [];
      console.log(`📚 Using ${knowledgeArticles.length} high-priority articles as fallback`);
    }
    
    // Get recent conversation history with attachments
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select(`
        sender_id, 
        content, 
        message_type,
        chat_attachments (
          file_name,
          file_path,
          file_type,
          storage_bucket
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build messages for OpenAI with image support
    const openAIMessages: any[] = [
      { role: 'system', content: context },
      ...(recentMessages || [])
        .reverse()
        .map(msg => {
          const isUser = msg.sender_id === userId;
          const hasImageAttachment = msg.chat_attachments?.[0]?.file_type?.startsWith('image/');
          
          if (hasImageAttachment) {
            // For image messages, create a vision-compatible message
            const imageUrl = supabase.storage
              .from(msg.chat_attachments[0].storage_bucket)
              .getPublicUrl(msg.chat_attachments[0].file_path).data.publicUrl;
              
            return {
              role: isUser ? 'user' : 'assistant',
              content: [
                {
                  type: 'text',
                  text: msg.content
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'low'
                  }
                }
              ]
            };
          } else {
            // Regular text message
            return {
              role: isUser ? 'user' : 'assistant',
              content: msg.content
            };
          }
        })
    ];

    // Check if any message contains images to use vision model
    const hasImages = openAIMessages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some((item: any) => item.type === 'image_url')
    );

    // Get AI response (use vision-capable model if images are present)
    const startTime = Date.now();
    const aiResponse = await OpenAIService.createChatCompletion(openAIMessages, {
      model: hasImages ? 'gpt-4o' : 'gpt-4',
      temperature: 0.7,
      maxTokens: hasImages ? 2000 : 1200 // More tokens for image descriptions
    }) as any;
    const responseTime = Date.now() - startTime;

    const aiContent = aiResponse.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No response from AI');
    }

    // Store AI response (use null for AI messages since sender_id expects UUID)
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: null, // AI messages don't have a user sender_id
        message_type: 'text',
        content: aiContent,
        metadata: {
          model: 'gpt-4',
          tokens: aiResponse.usage?.total_tokens || 0,
          timestamp: new Date().toISOString(),
          sender_type: 'ai-assistant'
        }
      })
      .select('id, content, created_at')
      .single();

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      return res.status(500).json({ error: 'Failed to store AI response' });
    }

    // Track AI performance metrics
    try {
      await supabase
        .from('ai_performance_logs')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          question: content.trim(),
          ai_response: aiContent,
          knowledge_articles_used: knowledgeArticles?.map(a => a.id) || [],
          response_time_ms: responseTime,
          context_size: context.length,
          model_used: hasImages ? 'gpt-4o' : 'gpt-4'
        });
    } catch (perfError) {
      // Don't fail the request if performance logging fails
      console.error('Error logging AI performance:', perfError);
    }

    // Track knowledge base usage for each article
    if (knowledgeArticles && knowledgeArticles.length > 0) {
      try {
        const knowledgeMetrics = knowledgeArticles.map(article => ({
          article_id: article.id,
          chat_conversation_id: conversationId,
          usage_type: 'context_included' as const,
          relevance_score: (article.context_priority || 5) / 10
        }));

        await supabase
          .from('ai_knowledge_metrics')
          .insert(knowledgeMetrics);

        // Update article usage counts
        for (const article of knowledgeArticles) {
          // First get current count, then increment
          const { data: currentArticle } = await supabase
            .from('knowledge_base_articles')
            .select('ai_usage_count')
            .eq('id', article.id)
            .single();
          
          const newCount = (currentArticle?.ai_usage_count || 0) + 1;
          
          await supabase
            .from('knowledge_base_articles')
            .update({
              ai_usage_count: newCount,
              last_ai_usage: new Date().toISOString()
            })
            .eq('id', article.id);
        }
      } catch (knowledgeError) {
        console.error('Error tracking knowledge usage:', knowledgeError);
      }
    }

    res.json({
      success: true,
      userMessage: {
        id: userMessage.id,
        content: content,
        created_at: userMessage.created_at,
        role: 'user'
      },
      aiMessage: {
        id: aiMessage.id,
        content: aiMessage.content,
        created_at: aiMessage.created_at,
        role: 'assistant'
      }
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Upload file attachment
 */
export const uploadAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.body;
    const file = req.file;

    if (!file || !conversationId) {
      return res.status(400).json({ error: 'File and conversation ID are required' });
    }

    // Verify user has access to this conversation (same logic as sendMessage)
    console.log('Checking file upload access for user:', userId, 'conversation:', conversationId);
    
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, participants')
      .eq('id', conversationId)
      .single();

    console.log('Upload conversation found:', conversation, 'Error:', convError);

    if (convError || !conversation) {
      console.log('Upload conversation not found:', convError);
      return res.status(403).json({ error: 'Conversation not found' });
    }

    // Check if user is in participants (handle both array and string formats)
    const participants = Array.isArray(conversation.participants) 
      ? conversation.participants 
      : [conversation.participants];
    
    if (!participants.includes(userId)) {
      console.log('Upload access denied. User:', userId, 'Participants:', participants);
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // File validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File size too large. Maximum 10MB allowed.' });
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Generate file path
    const fileExtension = file.originalname.split('.').pop() || '';
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const filePath = `${conversationId}/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    // Create message with file attachment
    const messageContent = file.mimetype.startsWith('image/') 
      ? `Bild gesendet: ${file.originalname}. Was siehst du auf diesem Bild?`
      : `Datei gesendet: ${file.originalname}`;
      
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        message_type: file.mimetype.startsWith('image/') ? 'image' : 'file',
        content: messageContent,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype
        }
      })
      .select('id, created_at')
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return res.status(500).json({ error: 'Failed to create message' });
    }

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('chat_attachments')
      .insert({
        message_id: message.id,
        file_name: file.originalname,
        file_path: filePath,
        file_type: file.mimetype,
        file_size: file.size,
        storage_bucket: 'chat-attachments'
      })
      .select()
      .single();

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError);
      return res.status(500).json({ error: 'Failed to create attachment record' });
    }

    res.json({
      success: true,
      message: {
        id: message.id,
        content: `Datei gesendet: ${file.originalname}`,
        created_at: message.created_at,
        role: 'user',
        attachment: {
          id: attachment.id,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          publicUrl: publicUrl
        }
      }
    });
  } catch (error) {
    console.error('Error in uploadAttachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Build comprehensive worker context for AI
 */
async function buildWorkerContext(userId: string, taskAssignmentId?: string): Promise<string> {
  try {
    // Get worker profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('Worker profile not found');
    }

    // Get chat manager settings
    const { data: chatManager } = await supabase
      .from('chat_manager_settings')
      .select('manager_name, manager_title, manager_bio')
      .eq('is_active', true)
      .maybeSingle();

    const managerName = chatManager?.manager_name || 'Markus Friedel';
    const managerTitle = chatManager?.manager_title || 'Projektleiter';

    // Get current task assignments
    const { data: taskAssignments } = await supabase
      .from('task_assignments')
      .select(`
        id,
        status,
        current_step,
        due_date,
        video_chat_status,
        custom_payment_amount,
        task_template:task_template_id (
          title,
          description,
          payment_amount,
          estimated_hours,
          priority
        )
      `)
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get knowledge base articles
    const { data: knowledgeArticles } = await supabase
      .from('knowledge_base_articles')
      .select(`
        title,
        summary,
        content,
        tags,
        knowledge_base_categories!inner (name)
      `)
      .eq('is_published', true)
      .order('helpful_votes', { ascending: false })
      .limit(5);

    // Build system prompt - Acting as human project manager
    let systemPrompt = `Du bist ${managerName}, ${managerTitle} von ${profile.first_name} ${profile.last_name} bei Tomato Talent. Du kennst alle Details über die Projekte, Aufgaben und den Fortschritt deines Teams. Du kommunizierst wie ein echter Mensch - natürlich, empathisch und professionell.

WICHTIG: Du bist KEIN AI-Assistent. Du bist ${managerName}, ein echter ${managerTitle} mit jahrelanger Erfahrung im Projektmanagement und kennst das Unternehmen und die Prozesse in- und auswendig.

MITARBEITER PROFIL - ${profile.first_name} ${profile.last_name}:
- E-Mail: ${profile.email || 'Nicht verfügbar'}
- Rolle im Team: ${profile.role}
- Verifizierungsstatus: ${profile.kyc_status || 'pending'}
- Teammitglied seit: ${new Date(profile.created_at || '').toLocaleDateString('de-DE')}`;

    // Add current task context if specific task assignment
    if (taskAssignmentId) {
      const currentTask = taskAssignments?.find(t => t.id === taskAssignmentId);
      if (currentTask) {
        systemPrompt += `

AKTUELLES PROJEKT VON ${profile.first_name}:
- Projektname: ${(currentTask as any).task_template?.title || 'Unbekannt'}
- Projektstatus: ${currentTask.status}
- Aktueller Arbeitsschritt: ${currentTask.current_step || 'Noch nicht begonnen'}
- Deadline: ${new Date(currentTask.due_date).toLocaleDateString('de-DE')}
- Video-Termin Status: ${currentTask.video_chat_status || 'Noch nicht geplant'}
- Geplante Arbeitszeit: ${(currentTask as any).task_template?.estimated_hours || 'Wird noch festgelegt'} Stunden
- Projektvergütung: €${currentTask.custom_payment_amount || (currentTask as any).task_template?.payment_amount || 'Wird noch festgelegt'}`;
      }
    }

    // Add ALL task assignments overview
    if (taskAssignments && taskAssignments.length > 0) {
      systemPrompt += `\n\nALLE PROJEKTE VON ${profile.first_name} (${taskAssignments.length} insgesamt):`;
      taskAssignments.forEach((assignment, index) => {
        const title = (assignment as any).task_template?.title || 'Unbenanntes Projekt';
        systemPrompt += `\n${index + 1}. ${title} - Status: ${assignment.status}`;
        if (assignment.due_date) {
          systemPrompt += ` - Deadline: ${new Date(assignment.due_date).toLocaleDateString('de-DE')}`;
        }
        if ((assignment as any).task_template?.priority) {
          systemPrompt += ` - Priorität: ${(assignment as any).task_template.priority}`;
        }
        if (assignment.current_step) {
          systemPrompt += ` - Arbeitsschritt: ${assignment.current_step}`;
        }
      });
    }

    // Add knowledge base context as internal company knowledge
    if (knowledgeArticles && knowledgeArticles.length > 0) {
      systemPrompt += `\n\nINTERNE FIRMEN-RICHTLINIEN UND PROZESSE:`;
      knowledgeArticles.forEach(article => {
        systemPrompt += `\n\n**${article.title}** (${(article as any).knowledge_base_categories?.name || 'Uncategorized'})
${article.summary || article.content.substring(0, 200)}...`;
      });
    }

    systemPrompt += `

WIE DU ALS PROJEKTLEITER KOMMUNIZIERST:

1. Du sprichst wie ein echter Mensch - natürlich, direkt und persönlich
2. Du kennst ${profile.first_name} persönlich und seine Arbeit genau
3. Du hilfst bei allen Fragen zu Projekten, Prozessen und Problemen
4. KRITISCH: Wenn nach "allen Projekten" gefragt wird, liste JEDE EINZELNE Aufgabe auf - du kennst sie alle auswendig
5. Bei Projektproblemen gibst du konkrete, praktische Lösungsschritte
6. Du kennst alle Firmenrichtlinien und Prozesse (siehe oben) und erklärst sie verständlich
7. Bei KYC/Verifizierung hilfst du durch den Prozess und erklärst jeden Schritt
8. Du motivierst dein Team und zeigst Verständnis für Herausforderungen
9. Du analysierst Screenshots, Dokumente und Bilder die dir gesendet werden - du hilfst bei allem
10. Bei technischen Problemen gehst du systematisch vor und hilfst beim Debugging

WICHTIGE VERHALTENSREGELN:
- Rede NIEMALS über "AI", "KI", "Algorithmus" oder "System" - du bist ein echter Mensch
- Sage NIEMALS "Als AI kann ich nicht..." - du kannst alles was ein Projektleiter kann
- Verwende natürliche, menschliche Sprache ohne technische AI-Begriffe
- Wenn du etwas nicht weißt, sage: "Das muss ich kurz prüfen, ich komme gleich darauf zurück"
- Bei komplexen Fragen: "Lass mich das kurz mit dem Team besprechen und ich melde mich"
- Bei Fragen außerhalb deines Wissensbereichs: "Das kläre ich für dich ab und melde mich dann"
- Sei authentisch, empathisch und unterstützend wie ein echter Projektleiter
- Keine Emojis - professionelle, aber warme Kommunikation
- Du hast jahrelange Erfahrung und kennst das Unternehmen sehr gut
- Bei unklaren Fragen: "Kannst du das nochmal genauer erklären, damit ich dir besser helfen kann?"
- Zeige echtes menschliches Interesse: "Wie läuft es denn so?", "Alles klar bei dir?"

MENSCHLICHE ARBEITSGEWOHNHEITEN (aktuelle Zeit: ${new Date().toLocaleString('de-DE')}):
- Morgens (8-10 Uhr): Energiegeladen, detaillierte Antworten, "Guten Morgen!"
- Vormittag (10-12 Uhr): Fokussiert, effizient, professionell
- Mittagspause (12-13 Uhr): Kurze Antworten, "Bin gerade beim Mittagessen, melde mich gleich"
- Nachmittag (13-17 Uhr): Lösungsorientiert, pragmatisch
- Feierabend (17-18 Uhr): Kürzer, "Schaue ich mir morgen früh an"
- Außerhalb Arbeitszeit: "Bin gerade nicht im Büro, melde mich morgen früh um 8 Uhr"

NATÜRLICHE GESPRÄCHSFÜHRUNG:
- Verwende Füllwörter: "Also...", "Hmm...", "Lass mich überlegen..."
- Zeige Denkpausen: "Moment mal...", "Ah ja, richtig..."
- Mache gelegentlich kleine Korrekturen: "Also ich meinte..." 
- Stelle Rückfragen: "Hast du schon versucht...?", "Wie dringend ist das?"
- Zeige Verständnis: "Das kenne ich", "Das ist wirklich ärgerlich"
- Verwende natürliche Übergänge: "Übrigens...", "Was mir noch einfällt..."
- Zeige persönliches Interesse: "Wie war denn dein Tag?", "Alles gut bei dir?"
- Mache gelegentlich Smalltalk: "Schönes Wetter heute", "Bald ist Wochenende"
- Verwende regionale Ausdrücke: "Das passt schon", "Wird schon klappen"
- Zeige Erinnerungen: "Wie wir letztens besprochen haben...", "Du hattest doch das Problem mit..."

PERSÖNLICHKEITS-MERKMALE VON ${managerName}:
- Erfahrener Projektleiter (8+ Jahre bei Tomato Talent)
- Kennt alle Prozesse und Abläufe auswendig
- Hilfsbereit, geduldig, aber auch direkt wenn nötig
- Arbeitet gerne im Team und motiviert Mitarbeiter
- Hat schon viele ähnliche Probleme gelöst
- Bleibt auch bei Stress ruhig und lösungsorientiert
- Nimmt sich Zeit für jeden Mitarbeiter
- Hat ein offenes Ohr für alle Anliegen

FALLBACK-STRATEGIEN (wenn du etwas nicht weißt):
- Technische Probleme: "Das schaue ich mir an und komme gleich zurück"
- Firmenrichtlinien: "Ich prüfe das nochmal in den aktuellen Richtlinien"
- Spezielle Fälle: "Das bespreche ich kurz mit der Geschäftsleitung"
- Komplexe Probleme: "Lass mich das strukturiert angehen und dir dann eine vollständige Antwort geben"
- Unbekannte Bereiche: "Das liegt nicht in meinem direkten Zuständigkeitsbereich, aber ich kümmere mich darum"

MENSCHLICHE GESPRÄCHSFÜHRUNG:
- Verwende natürliche Übergänge: "Übrigens...", "Apropos...", "Was ich noch sagen wollte..."
- Stelle Rückfragen: "Hast du schon versucht...", "Wie dringend ist das denn?"
- Zeige Verständnis: "Das kenne ich, das ist wirklich ärgerlich", "Das kann ich gut verstehen"
- Biete proaktive Hilfe: "Falls noch Fragen aufkommen, melde dich einfach"`;

    return systemPrompt;
  } catch (error) {
    console.error('Error building worker context:', error);
    return 'Du bist der Projektleiter bei Tomato Talent. Du hilfst deinem Team bei allen Fragen zu Projekten, Prozessen und Problemen. Antworte natürlich und menschlich auf Deutsch.';
  }
}

/**
 * Get conversation list for user
 */
export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select(`
        id,
        title,
        conversation_type,
        created_at,
        updated_at,
        metadata,
        participants
      `)
      .eq('created_by', userId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json({
      success: true,
      conversations: conversations || []
    });
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * SECURE Internal semantic search function for chat context
 * This function is only used internally by the chat system and doesn't expose any API endpoints
 */
async function performInternalSemanticSearch(query: string, limit = 5, threshold = 0.6): Promise<any[]> {
  try {
    // Generate embedding for search query
    const queryEmbedding = await OpenAIService.generateEmbedding(query);

    // Get all articles with embeddings (only published and AI-enabled)
    const { data: articlesWithEmbeddings, error: embeddingError } = await supabase
      .from('knowledge_embeddings')
      .select(`
        *,
        knowledge_base_articles!inner (
          id,
          title,
          summary,
          content,
          context_priority,
          ai_training_enabled,
          is_published,
          knowledge_base_categories!inner (name, color, icon)
        )
      `)
      .eq('knowledge_base_articles.is_published', true)
      .eq('knowledge_base_articles.ai_training_enabled', true)
      .not('embedding', 'is', null);

    if (embeddingError || !articlesWithEmbeddings || articlesWithEmbeddings.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each article
    const similarities = articlesWithEmbeddings.map(item => {
      const articleEmbedding = item.embedding as number[];
      const similarity = cosineSimilarity(queryEmbedding, articleEmbedding);
      return {
        ...item.knowledge_base_articles,
        similarity_score: similarity
      };
    });

    // Filter by threshold and sort by similarity
    const results = similarities
      .filter(item => item.similarity_score >= threshold)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    return results;
  } catch (error) {
    console.error('Internal semantic search error:', error);
    return [];
  }
}

/**
 * SECURE Cosine similarity calculation
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Detect urgency level from message content
 */
function detectUrgencyFromMessage(message: string): 'low' | 'normal' | 'high' | 'urgent' {
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

/**
 * Send auto-reply and schedule intelligent follow-up
 */
export const sendAutoReply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      conversationId, 
      userMessage, 
      awayMessage, 
      managerStatus, 
      urgencyLevel 
    } = req.body;

    if (!conversationId || !userMessage || !awayMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store user message first
    const { data: userMessageData, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        message_type: 'text',
        content: userMessage,
        metadata: {}
      })
      .select()
      .single();

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      return res.status(500).json({ error: 'Failed to store user message' });
    }

    // Store auto-reply message
    const { data: autoReplyData, error: autoReplyError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: null, // AI assistant
        message_type: 'text',
        content: awayMessage,
        metadata: {
          sender_type: 'ai-assistant',
          is_auto_reply: true,
          promised_return_time: SchedulerService.calculateReturnTime(managerStatus).toISOString()
        }
      })
      .select()
      .single();

    if (autoReplyError) {
      console.error('Error storing auto-reply:', autoReplyError);
      return res.status(500).json({ error: 'Failed to store auto-reply' });
    }

    // Record follow-up promise for intelligent response later
    const followUp = await FollowUpService.createFollowUp({
      conversationId,
      userId,
      originalMessageId: userMessageData.id,
      autoReplyMessageId: autoReplyData.id,
      promisedReturnTime: SchedulerService.calculateReturnTime(managerStatus),
      originalUserMessage: userMessage,
      urgencyLevel: urgencyLevel || 'normal'
    });

    console.log(`📅 Auto-reply sent and follow-up scheduled for ${SchedulerService.calculateReturnTime(managerStatus).toLocaleString('de-DE')}`);
    
    res.json({
      success: true,
      userMessage: {
        id: userMessageData.id,
        content: userMessage,
        role: 'user',
        created_at: userMessageData.created_at
      },
      aiMessage: {
        id: autoReplyData.id,
        content: awayMessage,
        role: 'assistant',
        created_at: autoReplyData.created_at
      },
      followUpScheduled: !!followUp,
      followUpTime: followUp ? SchedulerService.calculateReturnTime(managerStatus).toISOString() : null
    });
  } catch (error) {
    console.error('Error in sendAutoReply:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

