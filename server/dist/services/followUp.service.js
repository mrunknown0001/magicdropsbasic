"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpService = void 0;
const supabase_1 = require("../lib/supabase");
const openai_service_1 = require("./openai.service");
class FollowUpService {
    /**
     * Create a new follow-up record when auto-reply is sent
     */
    static async createFollowUp(params) {
        try {
            // Analyze user message for context and topic
            const messageAnalysis = await this.analyzeUserMessage(params.originalUserMessage);
            const { data, error } = await supabase_1.supabase
                .from('chat_follow_ups')
                .insert({
                conversation_id: params.conversationId,
                user_id: params.userId,
                original_message_id: params.originalMessageId,
                auto_reply_message_id: params.autoReplyMessageId,
                user_question_summary: messageAnalysis.summary,
                detected_topic: messageAnalysis.topic,
                urgency_level: params.urgencyLevel,
                promised_return_time: params.promisedReturnTime.toISOString(),
                status: 'pending'
            })
                .select()
                .single();
            if (error) {
                console.error('Error creating follow-up:', error);
                return null;
            }
            console.log(`📅 Follow-up scheduled for ${params.promisedReturnTime.toLocaleString('de-DE')} - Topic: ${messageAnalysis.topic}`);
            return data;
        }
        catch (error) {
            console.error('Error in createFollowUp:', error);
            return null;
        }
    }
    /**
     * Get pending follow-ups that are due for processing
     */
    static async getPendingFollowUps() {
        try {
            const now = new Date();
            const { data, error } = await supabase_1.supabase
                .from('chat_follow_ups')
                .select(`
          *,
          chat_conversations!inner (participants, metadata)
        `)
                .eq('status', 'pending')
                .lte('promised_return_time', now.toISOString())
                .lt('retry_count', 3) // max_retries is always 3
                .order('promised_return_time', { ascending: true });
            if (error) {
                console.error('Error fetching pending follow-ups:', error);
                return [];
            }
            return data;
        }
        catch (error) {
            console.error('Error in getPendingFollowUps:', error);
            return [];
        }
    }
    /**
     * Generate intelligent follow-up message with direct answer
     */
    static async generateFollowUpMessage(followUp, userProfile) {
        try {
            const timeGreeting = this.getTimeContextualGreeting(followUp);
            const userName = userProfile.first_name;
            // Get direct answer using AI and knowledge base
            const directAnswer = await this.generateDirectAnswer(followUp.user_question_summary, followUp.detected_topic, followUp.urgency_level);
            // Build natural follow-up message (NO question repetition)
            const followUpMessage = `${timeGreeting} ${userName}! Bin wieder da.

Zu deiner Frage: ${directAnswer}

${this.generateContextualClosing(followUp.urgency_level, followUp.detected_topic)}`;
            return followUpMessage;
        }
        catch (error) {
            console.error('Error generating follow-up message:', error);
            // Fallback to simple follow-up
            return `Hallo ${userProfile.first_name}! Bin wieder da und kümmere mich jetzt um deine Frage. Wie kann ich dir helfen?`;
        }
    }
    /**
     * Send follow-up message to user
     */
    static async sendFollowUpMessage(followUpId) {
        try {
            // Get follow-up details
            const { data: followUp, error: followUpError } = await supabase_1.supabase
                .from('chat_follow_ups')
                .select(`
          *,
          chat_conversations!inner (participants, metadata)
        `)
                .eq('id', followUpId)
                .single();
            if (followUpError || !followUp) {
                console.error('Follow-up not found:', followUpError);
                return false;
            }
            // Get user profile separately
            const { data: userProfile, error: profileError } = await supabase_1.supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', followUp.user_id)
                .single();
            if (profileError || !userProfile) {
                console.error('User profile not found:', profileError);
                return false;
            }
            // Generate intelligent follow-up message
            const followUpMessage = await this.generateFollowUpMessage(followUp, userProfile);
            // Send message as AI assistant
            const { data: messageData, error: messageError } = await supabase_1.supabase
                .from('chat_messages')
                .insert({
                conversation_id: followUp.conversation_id,
                sender_id: null, // AI assistant
                message_type: 'text',
                content: followUpMessage,
                metadata: {
                    sender_type: 'ai-assistant',
                    is_follow_up: true,
                    follow_up_id: followUpId,
                    original_topic: followUp.detected_topic
                }
            })
                .select()
                .single();
            if (messageError) {
                console.error('Error sending follow-up message:', messageError);
                await this.markFollowUpFailed(followUpId, messageError.message);
                return false;
            }
            // Mark follow-up as sent
            await this.markFollowUpSent(followUpId, messageData.id);
            console.log(`✅ Follow-up sent successfully for user ${userProfile.first_name} (Topic: ${followUp.detected_topic})`);
            return true;
        }
        catch (error) {
            console.error('Error in sendFollowUpMessage:', error);
            await this.markFollowUpFailed(followUpId, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    /**
     * Mark follow-up as successfully sent
     */
    static async markFollowUpSent(followUpId, messageId) {
        await supabase_1.supabase
            .from('chat_follow_ups')
            .update({
            status: 'sent',
            follow_up_sent_at: new Date().toISOString(),
            follow_up_message_id: messageId,
            actual_return_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', followUpId);
    }
    /**
     * Mark follow-up as failed and increment retry count
     */
    static async markFollowUpFailed(followUpId, errorMessage) {
        // Get current retry count
        const { data: currentData } = await supabase_1.supabase
            .from('chat_follow_ups')
            .select('retry_count')
            .eq('id', followUpId)
            .single();
        const newRetryCount = (currentData?.retry_count || 0) + 1;
        await supabase_1.supabase
            .from('chat_follow_ups')
            .update({
            status: 'failed',
            error_message: errorMessage,
            retry_count: newRetryCount,
            updated_at: new Date().toISOString()
        })
            .eq('id', followUpId);
    }
    /**
     * Analyze user message using AI to extract context and topic
     */
    static async analyzeUserMessage(message) {
        try {
            const analysisPrompt = `
Analysiere diese Nutzernachricht und extrahiere:

Nachricht: "${message}"

Antworte im JSON-Format:
{
  "summary": "Kurze Zusammenfassung was der Nutzer braucht (1 Satz)",
  "topic": "kyc|technical|task_rejection|payment|task_help|general", 
  "urgency": "low|normal|high|urgent"
}

Beispiel:
Nachricht: "Ich kann meine KYC Dokumente nicht hochladen"
Antwort: {
  "summary": "Nutzer hat Probleme beim Upload der KYC-Dokumente",
  "topic": "kyc",
  "urgency": "normal"
}`;
            const response = await openai_service_1.OpenAIService.createChatCompletion([
                { role: 'system', content: analysisPrompt }
            ], { model: 'gpt-4o-mini', temperature: 0.3 });
            const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
            return {
                summary: analysisResult.summary || message.substring(0, 100),
                topic: analysisResult.topic || this.detectTopicFallback(message),
                urgency: analysisResult.urgency || this.detectUrgencyFallback(message)
            };
        }
        catch (error) {
            console.error('Error analyzing message:', error);
            // Fallback to simple analysis
            return {
                summary: message.substring(0, 100),
                topic: this.detectTopicFallback(message),
                urgency: this.detectUrgencyFallback(message)
            };
        }
    }
    /**
     * Generate direct answer using AI and knowledge base
     */
    static async generateDirectAnswer(questionSummary, topic, urgencyLevel) {
        try {
            // Get relevant knowledge base articles
            const { data: knowledgeArticles } = await supabase_1.supabase
                .from('knowledge_base_articles')
                .select(`
          title,
          summary,
          content,
          response_template,
          knowledge_base_categories!inner (name)
        `)
                .eq('is_published', true)
                .eq('ai_training_enabled', true)
                .or(`tags.cs.{${topic}},title.ilike.%${topic}%,content.ilike.%${topic}%`)
                .order('context_priority', { ascending: false })
                .limit(3);
            const knowledgeContext = knowledgeArticles?.map(article => `**${article.title}**: ${article.summary || article.content.substring(0, 150)}`).join('\n\n') || '';
            const answerPrompt = `
Du bist Markus Friedel, erfahrener Projektleiter bei Tomato Talent. Generiere eine DIREKTE, hilfreiche Antwort für diese Follow-up Situation:

Nutzer-Problem: "${questionSummary}"
Themenbereich: ${topic}
Dringlichkeit: ${urgencyLevel}

Verfügbares Firmenwissen:
${knowledgeContext}

WICHTIGE REGELN:
- Gib eine DIREKTE Lösung/Antwort (keine Frage wiederholen!)
- Sei konkret und actionable
- Verwende dein Firmenwissen
- Spreche als erfahrener Projektleiter Markus
- Kurz und präzise (max. 3 Sätze)
- Bei technischen Problemen: konkrete Schritte
- Bei KYC: klare Anweisungen
- Bei Aufgaben: direkte Hilfestellung

Beispiel:
Problem: "Upload funktioniert nicht"
Antwort: "Das liegt meist an der Dateigröße oder dem Format. Komprimiere das Bild unter 10MB und speichere es als JPG oder PNG. Dann sollte der Upload klappen."
`;
            const response = await openai_service_1.OpenAIService.createChatCompletion([
                { role: 'system', content: answerPrompt }
            ], { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 200 });
            return response.choices[0].message.content || 'Lass uns das Problem zusammen lösen.';
        }
        catch (error) {
            console.error('Error generating direct answer:', error);
            return 'Lass uns das Problem zusammen angehen. Beschreibe mir nochmal kurz was nicht funktioniert.';
        }
    }
    /**
     * Get time-contextual greeting
     */
    static getTimeContextualGreeting(followUp) {
        const now = new Date();
        const originalTime = new Date(followUp.created_at);
        const hoursDiff = (now.getTime() - originalTime.getTime()) / (1000 * 60 * 60);
        const currentHour = now.getHours();
        // Weekend follow-up
        if (hoursDiff > 48) {
            return "Guten Morgen";
        }
        // Next day follow-up
        if (hoursDiff > 12) {
            return currentHour < 10 ? "Guten Morgen" : "Hallo";
        }
        // Same day (after lunch)
        if (hoursDiff > 1) {
            return "Hallo";
        }
        return "Hi";
    }
    /**
     * Generate contextual closing based on urgency and topic
     */
    static generateContextualClosing(urgencyLevel, topic) {
        if (urgencyLevel === 'urgent' || urgencyLevel === 'high') {
            return 'Falls das nicht hilft, melde dich sofort!';
        }
        const closings = {
            'kyc': 'Bei Problemen schicke mir Screenshots!',
            'technical': 'Probiere das mal aus!',
            'task_rejection': 'Welcher Grund steht denn da?',
            'payment': 'Alles klar soweit?',
            'task_help': 'Kommst du damit zurecht?',
            'general': 'Hilft dir das weiter?'
        };
        return closings[topic] || 'Falls noch Fragen aufkommen, melde dich gerne!';
    }
    /**
     * Fallback topic detection (if AI analysis fails)
     */
    static detectTopicFallback(message) {
        const text = message.toLowerCase();
        if (/kyc|verifizierung|dokument|ausweis|upload.*dokument/i.test(text))
            return 'kyc';
        if (/funktioniert.*nicht|fehler|problem|lädt.*nicht|technisch/i.test(text))
            return 'technical';
        if (/aufgabe.*abgelehnt|ablehnung|nicht.*akzeptiert/i.test(text))
            return 'task_rejection';
        if (/zahlung|vergütung|geld|überweisung|bezahlung/i.test(text))
            return 'payment';
        if (/aufgabe|task|schritt|anleitung|wie.*mache/i.test(text))
            return 'task_help';
        return 'general';
    }
    /**
     * Fallback urgency detection (if AI analysis fails)
     */
    static detectUrgencyFallback(message) {
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
     * Get follow-up analytics for admin dashboard
     */
    static async getFollowUpAnalytics(timeframe = '7d') {
        try {
            const startDate = new Date();
            switch (timeframe) {
                case '24h':
                    startDate.setHours(startDate.getHours() - 24);
                    break;
                case '7d':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(startDate.getDate() - 30);
                    break;
            }
            const { data: followUps, error } = await supabase_1.supabase
                .from('chat_follow_ups')
                .select('*')
                .gte('created_at', startDate.toISOString());
            if (error)
                throw error;
            const totalFollowUps = followUps.length;
            const successfulFollowUps = followUps.filter(f => f.status === 'sent' || f.status === 'completed').length;
            const successRate = totalFollowUps > 0 ? (successfulFollowUps / totalFollowUps) * 100 : 0;
            // Calculate average delay between promise and delivery
            const sentFollowUps = followUps.filter(f => f.follow_up_sent_at);
            const delays = sentFollowUps.map(f => {
                const promised = new Date(f.promised_return_time);
                const actual = new Date(f.follow_up_sent_at);
                return Math.abs(actual.getTime() - promised.getTime()) / (1000 * 60); // minutes
            });
            const averageDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
            // Topic analysis
            const topicCounts = followUps.reduce((acc, f) => {
                acc[f.detected_topic] = (acc[f.detected_topic] || 0) + 1;
                return acc;
            }, {});
            const topTopics = Object.entries(topicCounts)
                .map(([topic, count]) => ({ topic, count: count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            return {
                totalFollowUps,
                successRate: Math.round(successRate * 100) / 100,
                averageDelay: Math.round(averageDelay * 100) / 100,
                topTopics
            };
        }
        catch (error) {
            console.error('Error getting follow-up analytics:', error);
            return {
                totalFollowUps: 0,
                successRate: 0,
                averageDelay: 0,
                topTopics: []
            };
        }
    }
    /**
     * Cancel pending follow-up (if user gets answer before follow-up time)
     */
    static async cancelFollowUp(conversationId, reason = 'User received response') {
        try {
            await supabase_1.supabase
                .from('chat_follow_ups')
                .update({
                status: 'cancelled',
                error_message: reason,
                updated_at: new Date().toISOString()
            })
                .eq('conversation_id', conversationId)
                .eq('status', 'pending');
        }
        catch (error) {
            console.error('Error cancelling follow-up:', error);
        }
    }
}
exports.FollowUpService = FollowUpService;
