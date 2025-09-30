import { supabase } from '../lib/supabase';
import { 
  SearchResult, 
  SearchResultType, 
  SearchCategory,
  Profile
} from '../types/database';

class GlobalSearchService {
  private readonly MIN_SEARCH_LENGTH = 2;
  private readonly MAX_RESULTS_PER_CATEGORY = 10;
  private readonly MIN_RELEVANCE_SCORE = 40; // Minimum score to include in results

  /**
   * Simple check for obviously random patterns
   */
  private isRandomPattern(term: string): boolean {
    // Only block clearly random/nonsense patterns
    const randomPatterns = [
      /^[a-z]$/,         // Single letter
      /^(.)\1{2,}$/,     // Repeated character (aaa, bbb, etc.)
      /^[qwerty]{3,}$/i, // Keyboard mashing
      /^[asdf]{3,}$/i,   // More keyboard mashing
      /^[zxcv]{3,}$/i,   // Even more keyboard mashing
    ];
    
    return randomPatterns.some(pattern => pattern.test(term));
  }

  /**
   * Calculate relevance score based on how well the search term matches the item
   */
  private calculateRelevance(searchableText: string, searchTerm: string): number {
    const text = searchableText.toLowerCase();
    const term = searchTerm.toLowerCase();
    
    // Minimum term length for meaningful search
    if (term.length < 2) return 0;
    
    // Filter out obvious random patterns
    if (this.isRandomPattern(term)) {
      return 0;
    }
    
    // Exact match gets highest score
    if (text === term) return 100;
    
    // Starts with search term gets high score
    if (text.startsWith(term)) return 90;
    
    // Contains term as whole word gets medium-high score
    if (new RegExp(`\\b${term}\\b`).test(text)) return 80;
    
    // Contains term anywhere gets medium score
    if (text.includes(term)) return 70;
    
    // Check for partial word matches (term is substring of a word)
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.includes(term) && word.length > term.length) {
        // Give good score if term is a meaningful part of a word
        if (word.startsWith(term)) {
          return 65; // Term at start of word
        } else if (word.endsWith(term)) {
          return 60; // Term at end of word  
        } else {
          return 55; // Term in middle of word
        }
      }
    }
    
    // No fuzzy matching - only exact substring matches to avoid false positives
    
    // Additional check: if term is very short (2 chars), be more strict
    if (term.length === 2) {
      // Only return results for 2-char terms if they appear as a word boundary or start of word
      // Also check that it's not just random letters
      if (new RegExp(`\\b${term}`).test(text)) {
        // Give higher score if it's at the start of a word
        if (text.startsWith(term) || new RegExp(`\\s${term}`).test(text)) {
          return 70;
        }
        return 50;
      }
    }
    
    return 0;
  }

  /**
   * Search employees (Mitarbeiter)
   */
  async searchEmployees(searchTerm: string): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) return [];

    try {
      const { data, error } = await supabase.rpc('get_profiles_with_emails');
      
      if (error) throw error;
      
      const employees = data || [];
      const results: SearchResult[] = [];

      for (const employee of employees) {
        const searchableText = [
          employee.first_name,
          employee.last_name,
          employee.email,
          `${employee.first_name} ${employee.last_name}`,
          employee.id
        ].filter(Boolean).join(' ');

        const relevance = this.calculateRelevance(searchableText, searchTerm);
        
        if (relevance >= this.MIN_RELEVANCE_SCORE) {
          results.push({
            id: employee.id,
            type: 'employee',
            title: `${employee.first_name} ${employee.last_name}`,
            subtitle: employee.email || 'Keine E-Mail',
            description: `${employee.role === 'admin' ? 'Administrator' : 'Mitarbeiter'} • Erstellt: ${new Date(employee.created_at).toLocaleDateString('de-DE')}`,
            url: `/admin/employees/${employee.id}`,
            relevanceScore: relevance,
            metadata: {
              role: employee.role,
              email: employee.email,
              status: employee.banned_until ? 'inactive' : 'active'
            },
            createdAt: employee.created_at,
            updatedAt: employee.updated_at
          });
        }
      }

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, this.MAX_RESULTS_PER_CATEGORY);
        
    } catch (error) {
      console.error('Error searching employees:', error);
      return [];
    }
  }

  /**
   * Search bankdrops
   */
  async searchBankdrops(searchTerm: string): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) return [];

    try {
      // Get bankdrop task templates
      const { data: templates, error: templatesError } = await supabase
        .from('task_templates')
        .select('id, title, type')
        .eq('type', 'bankdrop');
        
      if (templatesError) throw templatesError;
      
      if (!templates || templates.length === 0) return [];
      
      const templateIds = templates.map(t => t.id);
      
      // Get assignments for bankdrop templates with profile data
      const { data: assignments, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select(`
          id,
          task_template_id,
          assignee_id,
          status,
          created_at,
          updated_at,
          demo_email,
          ident_code,
          task_template:task_templates(title, type)
        `)
        .in('task_template_id', templateIds)
        .order('updated_at', { ascending: false });
        
      if (assignmentsError) throw assignmentsError;
      
      const assignments_data = assignments || [];
      const results: SearchResult[] = [];

      // Get employee data for assignees
      const assigneeIds = assignments_data.map(a => a.assignee_id).filter(Boolean);
      let profileMap: Record<string, Profile> = {};
      
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase.rpc(
          'get_profiles_with_emails_by_ids',
          { profile_ids: assigneeIds }
        );
        profileMap = (profiles || []).reduce((acc: Record<string, Profile>, profile: Profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      for (const assignment of assignments_data) {
        const employee = profileMap[assignment.assignee_id];
        const template = assignment.task_template;
        
        const searchableText = [
          template?.title,
          employee ? `${employee.first_name} ${employee.last_name}` : '',
          assignment.demo_email,
          assignment.ident_code,
          assignment.status
        ].filter(Boolean).join(' ');

        const relevance = this.calculateRelevance(searchableText, searchTerm);
        
        if (relevance >= this.MIN_RELEVANCE_SCORE) {
          results.push({
            id: assignment.id,
            type: 'bankdrop',
            title: template?.title || 'Bankdrop',
            subtitle: employee ? `${employee.first_name} ${employee.last_name}` : 'Unbekannter Mitarbeiter',
            description: `Status: ${assignment.status} • ${assignment.demo_email ? `Demo: ${assignment.demo_email}` : 'Keine Demo-Daten'}`,
            url: `/admin/bankdrops/${assignment.id}`,
            relevanceScore: relevance,
            metadata: {
              status: assignment.status,
              employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
              demoEmail: assignment.demo_email,
              identCode: assignment.ident_code
            },
            createdAt: assignment.created_at,
            updatedAt: assignment.updated_at
          });
        }
      }

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, this.MAX_RESULTS_PER_CATEGORY);
        
    } catch (error) {
      console.error('Error searching bankdrops:', error);
      return [];
    }
  }

  /**
   * Search tasks/task templates
   */
  async searchTasks(searchTerm: string): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) return [];

    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const templates = data || [];
      const results: SearchResult[] = [];

      for (const template of templates) {
        const searchableText = [
          template.title,
          template.description,
          template.type,
          template.id
        ].filter(Boolean).join(' ');

        const relevance = this.calculateRelevance(searchableText, searchTerm);
        
        if (relevance >= this.MIN_RELEVANCE_SCORE) {
          results.push({
            id: template.id,
            type: 'task',
            title: template.title || 'Unbenannte Aufgabe',
            subtitle: `Typ: ${template.type || 'Standard'}`,
            description: template.description || 'Keine Beschreibung verfügbar',
            url: `/admin/task-templates/${template.id}`,
            relevanceScore: relevance,
            metadata: {
              type: template.type,
              isStarterJob: template.is_starter_job,
              createdBy: template.created_by
            },
            createdAt: template.created_at,
            updatedAt: template.updated_at
          });
        }
      }

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, this.MAX_RESULTS_PER_CATEGORY);
        
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }

  /**
   * Search phone numbers
   */
  async searchPhoneNumbers(searchTerm: string): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) return [];

    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const phoneNumbers = data || [];
      const results: SearchResult[] = [];

      for (const phone of phoneNumbers) {
        const searchableText = [
          phone.phone_number,
          phone.service,
          phone.country,
          phone.provider,
          phone.status,
          phone.id
        ].filter(Boolean).join(' ');

        const relevance = this.calculateRelevance(searchableText, searchTerm);
        
        if (relevance >= this.MIN_RELEVANCE_SCORE) {
          results.push({
            id: phone.id,
            type: 'phone',
            title: phone.phone_number || 'Unbekannte Nummer',
            subtitle: `${phone.service} • ${phone.country}`,
            description: `Provider: ${phone.provider} • Status: ${phone.status}`,
            url: `/admin/phone-numbers`,
            relevanceScore: relevance,
            metadata: {
              service: phone.service,
              country: phone.country,
              provider: phone.provider,
              status: phone.status,
              assigneeId: phone.assignee_id
            },
            createdAt: phone.created_at,
            updatedAt: phone.updated_at
          });
        }
      }

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, this.MAX_RESULTS_PER_CATEGORY);
        
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      return [];
    }
  }

  /**
   * Search all categories
   */
  async searchAll(searchTerm: string): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) return [];

    try {
      const [employees, bankdrops, tasks, phoneNumbers] = await Promise.all([
        this.searchEmployees(searchTerm),
        this.searchBankdrops(searchTerm),
        this.searchTasks(searchTerm),
        this.searchPhoneNumbers(searchTerm)
      ]);

      const allResults = [...employees, ...bankdrops, ...tasks, ...phoneNumbers];
      
      // Sort by relevance across all categories
      return allResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 50); // Limit total results
        
    } catch (error) {
      console.error('Error in global search:', error);
      return [];
    }
  }

  /**
   * Get available search categories with counts
   */
  getSearchCategories(): SearchCategory[] {
    return [
      {
        id: 'all',
        name: 'Alle Ergebnisse',
        type: 'all',
        icon: 'Search'
      },
      {
        id: 'employees',
        name: 'Mitarbeiter',
        type: 'employee',
        icon: 'Users'
      },
      {
        id: 'bankdrops',
        name: 'Bankdrops',
        type: 'bankdrop',
        icon: 'Database'
      },
      {
        id: 'tasks',
        name: 'Aufgaben',
        type: 'task',
        icon: 'Briefcase'
      },
      {
        id: 'phones',
        name: 'Telefonnummern',
        type: 'phone',
        icon: 'Phone'
      }
    ];
  }
}

export const globalSearchService = new GlobalSearchService();
export default globalSearchService; 