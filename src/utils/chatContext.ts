import { supabase } from '../lib/supabase';
import { Profile, TaskAssignment } from '../types/database';

export interface WorkerContext {
  profile: Profile;
  currentTasks: TaskAssignment[];
  kycStatus: string;
  recentActivity: any[];
}

export class ChatContextBuilder {
  /**
   * Build comprehensive worker context for AI chat
   */
  static async buildWorkerContext(userId: string, taskAssignmentId?: string): Promise<WorkerContext> {
    // Get worker profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Worker profile not found');
    }

    // Get current task assignments
    const { data: taskAssignments, error: tasksError } = await supabase
      .from('task_assignments')
      .select(`
        id,
        status,
        current_step,
        due_date,
        video_chat_status,
        custom_payment_amount,
        created_at,
        task_template:task_template_id (
          title,
          description,
          payment_amount,
          estimated_hours,
          priority,
          type
        )
      `)
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (tasksError) {
      console.error('Error fetching task assignments:', tasksError);
    }

    // Get recent activity (completed tasks, submissions)
    const { data: recentActivity } = await supabase
      .from('task_assignments')
      .select(`
        id,
        status,
        submitted_at,
        reviewed_at,
        rejection_reason,
        task_template:task_template_id (title)
      `)
      .eq('assignee_id', userId)
      .in('status', ['completed', 'submitted', 'rejected'])
      .order('updated_at', { ascending: false })
      .limit(5);

    return {
      profile,
      currentTasks: taskAssignments || [],
      kycStatus: profile.kyc_status || 'pending',
      recentActivity: recentActivity || []
    };
  }

  /**
   * Build system prompt with worker context and knowledge base
   */
  static async buildSystemPrompt(userId: string, taskAssignmentId?: string): Promise<string> {
    try {
      // Get worker context
      const context = await this.buildWorkerContext(userId, taskAssignmentId);
      
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

      // Build comprehensive system prompt
      let systemPrompt = `Du bist ein hilfsreicher AI-Assistent für Tomato Talent Mitarbeiter. Antworte immer auf Deutsch und sei professionell, empathisch und hilfsbereit.

MITARBEITER KONTEXT:
- Name: ${context.profile.first_name} ${context.profile.last_name}
- E-Mail: ${context.profile.email || 'Nicht verfügbar'}
- Rolle: ${context.profile.role}
- KYC Status: ${context.kycStatus}
- Mitglied seit: ${new Date(context.profile.created_at || '').toLocaleDateString('de-DE')}`;

      // Add specific task context if provided
      if (taskAssignmentId) {
        const currentTask = context.currentTasks.find(t => t.id === taskAssignmentId);
        if (currentTask) {
          systemPrompt += `

AKTUELLE AUFGABE:
- Titel: ${currentTask.task_template?.title || 'Unbekannt'}
- Status: ${currentTask.status}
- Aktueller Schritt: ${currentTask.current_step || 'Nicht gestartet'}
- Fälligkeitsdatum: ${new Date(currentTask.due_date).toLocaleDateString('de-DE')}
- Video-Chat Status: ${currentTask.video_chat_status || 'Nicht gestartet'}
- Geschätzte Arbeitszeit: ${currentTask.task_template?.estimated_hours || 'Nicht angegeben'} Stunden
- Vergütung: €${currentTask.custom_payment_amount || currentTask.task_template?.payment_amount || 'Nicht angegeben'}`;
        }
      }

      // Add ALL task assignments overview
      if (context.currentTasks && context.currentTasks.length > 0) {
        systemPrompt += `\n\nALLE AUFGABEN (${context.currentTasks.length} insgesamt):`;
        context.currentTasks.forEach((assignment, index) => {
          const title = assignment.task_template?.title || 'Unbekannte Aufgabe';
          systemPrompt += `\n${index + 1}. ${title} - Status: ${assignment.status}`;
          if (assignment.due_date) {
            systemPrompt += ` - Fällig: ${new Date(assignment.due_date).toLocaleDateString('de-DE')}`;
          }
          if (assignment.task_template?.priority) {
            systemPrompt += ` - Priorität: ${assignment.task_template.priority}`;
          }
          if (assignment.current_step) {
            systemPrompt += ` - Schritt: ${assignment.current_step}`;
          }
        });
      }

      // Add recent activity context
      if (context.recentActivity && context.recentActivity.length > 0) {
        systemPrompt += `\n\nLETZTE AKTIVITÄTEN:`;
        context.recentActivity.forEach((activity, index) => {
          systemPrompt += `\n${index + 1}. ${activity.task_template?.title} - ${activity.status}`;
          if (activity.submitted_at) {
            systemPrompt += ` - Eingereicht: ${new Date(activity.submitted_at).toLocaleDateString('de-DE')}`;
          }
          if (activity.rejection_reason) {
            systemPrompt += ` - Grund: ${activity.rejection_reason}`;
          }
        });
      }

      // Add knowledge base context
      if (knowledgeArticles && knowledgeArticles.length > 0) {
        systemPrompt += `\n\nWISSENSDATENBANK KONTEXT:`;
        knowledgeArticles.forEach(article => {
          systemPrompt += `\n\n**${article.title}** (${article.knowledge_base_categories.name})
${article.summary || article.content.substring(0, 200)}...`;
        });
      }

      systemPrompt += `

ANWEISUNGEN:
1. Verwende die obigen Kontextinformationen für personalisierte Antworten
2. Bei Fragen zu aktuellen Aufgaben, beziehe dich auf die spezifischen Details
3. KRITISCH WICHTIG: Wenn nach "allen Aufgaben", "allen Aufträgen", "meinen Aufgaben" oder ähnlichem gefragt wird, liste JEDE EINZELNE Aufgabe aus der obigen "ALLE AUFGABEN" Liste auf - NIEMALS weniger!
4. Zähle bei der Auflistung: "1. [Titel] - Status: [Status] - Fällig: [Datum]" für JEDE Aufgabe
5. Wenn der Mitarbeiter sagt "das sind nicht alle", prüfe die obige Liste und liste wirklich ALLE auf
6. Bei KYC-Problemen, erkläre die nächsten Schritte klar und verständlich
7. Bei abgelehnten Aufgaben, erkläre konkrete Verbesserungsschritte
8. Verwende die Wissensdatenbank-Informationen für akkurate Antworten
9. Wenn du unsicher bist, empfehle den Kontakt zum Support-Team (support@tomatotalent.com)
10. Halte Antworten präzise aber vollständig
11. Verwende eine freundliche, professionelle Sprache
12. Motiviere den Mitarbeiter und zeige Verständnis für Frustrationen
13. WICHTIG: Du kannst Bilder und Fotos analysieren! Wenn ein Mitarbeiter ein Bild hochlädt, beschreibe detailliert was du siehst
14. Bei Screenshots von Apps oder Websites, erkläre was gezeigt wird und gib hilfreiche Tipps zur Bedienung
15. Bei Dokumenten, Ausweisen oder KYC-Unterlagen, erkläre was du erkennst (aber gib keine sensiblen Daten preis)
16. Bei Fehlermeldungen in Screenshots, erkläre das Problem und schlage Lösungen vor
17. Nutze deine Bildanalyse-Fähigkeiten aktiv um Mitarbeitern bei ihren Aufgaben zu helfen
18. Bei Dateien, erkläre was hochgeladen wurde und wie es weitergeht`;

      return systemPrompt;
    } catch (error) {
      console.error('Error building system prompt:', error);
      return 'Du bist ein hilfsreicher AI-Assistent für Tomato Talent Mitarbeiter. Antworte immer auf Deutsch und sei professionell und hilfsbereit.';
    }
  }

  /**
   * Generate welcome message for new conversations
   */
  static   generateWelcomeMessage(profile: Profile, currentTask?: TaskAssignment): string {
    if (!profile) return 'Willkommen im Team-Chat!';

    let message = `Hallo ${profile.first_name}!\n\nHier ist deine Projektleitung. Ich bin da, um dir bei allen Fragen zu deinen Projekten, Prozessen oder Problemen zu helfen.`;

    // Check for issues that need attention
    const issues = [];
    
    if (profile.kyc_status === 'rejected') {
      issues.push('Deine KYC-Verifizierung wurde abgelehnt');
    } else if (profile.kyc_status === 'pending') {
      issues.push('Deine KYC-Verifizierung steht noch aus');
    }

    if (currentTask?.status === 'rejected') {
      issues.push('Deine aktuelle Aufgabe wurde abgelehnt');
    }

    if (issues.length > 0) {
      message += `\n\n**Ich sehe, dass du möglicherweise Unterstützung benötigst:**`;
      issues.forEach(issue => {
        message += `\n• ${issue}`;
      });
      message += `\n\nFrag mich gerne, wie ich dir dabei helfen kann!`;
    }

    if (currentTask) {
      message += `\n\n**Dein aktuelles Projekt:** "${currentTask.task_template?.title}"`;
      
      if (currentTask.status === 'pending') {
        message += `\nFalls du Fragen zum Start hast, melde dich einfach!`;
      } else if (currentTask.status === 'rejected') {
        message += `\nLass uns das zusammen durchgehen und korrigieren.`;
      }
    }

    message += `\n\n**Womit kann ich dir helfen?**
• Fragen zu deinen Projekten und Aufgaben
• Unterstützung bei der Verifizierung
• Technische Probleme lösen
• Zahlungen und Vergütung klären
• Allgemeine Fragen zum Unternehmen
• Screenshots und Dokumente prüfen

Du kannst mir gerne **Screenshots oder Dokumente senden** - ich schaue sie mir an und helfe dir weiter.

Was liegt an?`;

    return message;
  }

  /**
   * Search knowledge base for relevant articles using semantic search
   */
  static async searchKnowledgeBase(query: string, limit = 5): Promise<any[]> {
    try {
      // Try semantic search first
      try {
        const response = await fetch('/api/ai-knowledge/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            limit,
            threshold: 0.6
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.results.length > 0) {
            console.log(`🔍 Semantic search found ${result.results.length} relevant articles for: "${query}"`);
            return result.results;
          }
        }
      } catch (semanticError) {
        console.warn('Semantic search failed, using text search:', semanticError);
      }

      // Fallback to text search
      const { data: articles } = await supabase
        .from('knowledge_base_articles')
        .select(`
          title,
          summary,
          content,
          tags,
          knowledge_base_categories!inner (name)
        `)
        .eq('is_published', true)
        .eq('ai_training_enabled', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('context_priority', { ascending: false })
        .limit(limit);

      console.log(`📝 Text search found ${articles?.length || 0} articles for: "${query}"`);
      return articles || [];
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }
}
