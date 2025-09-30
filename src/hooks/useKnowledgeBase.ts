import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { KnowledgeArticle, KnowledgeCategory } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export interface AITrainingExample {
  id: string;
  article_id: string;
  question: string;
  expected_answer: string;
  context_tags: string[];
  difficulty_level: number;
  is_active: boolean;
}

export interface AIKnowledgeMetric {
  id: string;
  article_id: string;
  usage_type: 'context_included' | 'direct_reference' | 'similarity_match';
  relevance_score: number;
  user_feedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
  response_quality_score?: number;
  created_at: string;
}

export const useKnowledgeBase = () => {
  const { user } = useAuth();
  
  // State
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>([]);
  const [trainingExamples, setTrainingExamples] = useState<AITrainingExample[]>([]);
  const [knowledgeMetrics, setKnowledgeMetrics] = useState<AIKnowledgeMetric[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all categories
   */
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_base_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories');
      toast.error('Fehler beim Laden der Kategorien');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch articles with enhanced AI fields
   */
  const fetchArticles = useCallback(async (categoryId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('knowledge_base_articles')
        .select(`
          *,
          knowledge_base_categories!inner (name, color, icon)
        `)
        .order('created_at', { ascending: false });

      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to fetch articles');
      toast.error('Fehler beim Laden der Artikel');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search articles with semantic and text search
   */
  const searchArticles = useCallback(async (query: string, useSemanticSearch = true) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      
      if (useSemanticSearch) {
        // Try semantic search first
        try {
          const response = await fetch('/api/ai-knowledge/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              query,
              limit: 10,
              threshold: 0.5
            })
          });

          if (response.ok) {
            const result = await response.json();
            setSearchResults(result.results || []);
            return;
          }
        } catch (semanticError) {
          console.warn('Semantic search failed, falling back to text search:', semanticError);
        }
      }

      // Fallback to text search
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select(`
          *,
          knowledge_base_categories!inner (name, color, icon)
        `)
        .eq('is_published', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('helpful_votes', { ascending: false });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching articles:', err);
      setError('Search failed');
      toast.error('Suchfehler');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  /**
   * Create new article with AI fields
   */
  const createArticle = useCallback(async (articleData: Partial<KnowledgeArticle> & {
    ai_training_enabled?: boolean;
    context_priority?: number;
    response_template?: string;
    conversation_examples?: any[];
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .insert({
          ...articleData,
          created_by: user.id,
          ai_training_enabled: articleData.ai_training_enabled ?? true,
          context_priority: articleData.context_priority ?? 5,
          response_template: articleData.response_template || null,
          conversation_examples: articleData.conversation_examples || []
        })
        .select()
        .single();

      if (error) throw error;
      
      // Refresh articles
      await fetchArticles();
      toast.success('Artikel erfolgreich erstellt');
      return data;
    } catch (err) {
      console.error('Error creating article:', err);
      toast.error('Fehler beim Erstellen des Artikels');
      return null;
    }
  }, [user, fetchArticles]);

  /**
   * Update article with AI fields
   */
  const updateArticle = useCallback(async (
    articleId: string, 
    updates: Partial<KnowledgeArticle> & {
      ai_training_enabled?: boolean;
      context_priority?: number;
      response_template?: string;
      conversation_examples?: any[];
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh articles
      await fetchArticles();
      toast.success('Artikel erfolgreich aktualisiert');
      return data;
    } catch (err) {
      console.error('Error updating article:', err);
      toast.error('Fehler beim Aktualisieren des Artikels');
      return null;
    }
  }, [fetchArticles]);

  /**
   * Delete article
   */
  const deleteArticle = useCallback(async (articleId: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      
      // Refresh articles
      await fetchArticles();
      toast.success('Artikel erfolgreich gelöscht');
      return true;
    } catch (err) {
      console.error('Error deleting article:', err);
      toast.error('Fehler beim Löschen des Artikels');
      return false;
    }
  }, [fetchArticles]);

  /**
   * Vote on article helpfulness
   */
  const voteArticle = useCallback(async (articleId: string, isHelpful: boolean) => {
    try {
      const field = isHelpful ? 'helpful_votes' : 'unhelpful_votes';
      
      const { error } = await supabase
        .rpc('increment_article_vote', {
          article_id: articleId,
          vote_type: field
        });

      if (error) throw error;
      
      // Refresh articles
      await fetchArticles();
      toast.success('Bewertung gespeichert');
    } catch (err) {
      console.error('Error voting on article:', err);
      toast.error('Fehler beim Bewerten');
    }
  }, [fetchArticles]);

  /**
   * Generate embeddings for article (placeholder for now)
   */
  const generateEmbeddings = useCallback(async (articleId: string) => {
    try {
      const response = await fetch(`/api/ai-knowledge/embeddings/${articleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate embeddings');
      }
      
      const result = await response.json();
      toast.success(`Embeddings generiert (${result.embeddingSize} Dimensionen)`);
      return result;
    } catch (err) {
      console.error('Error generating embeddings:', err);
      toast.error('Fehler beim Generieren der Embeddings');
      throw err;
    }
  }, []);

  /**
   * Fetch AI training examples for an article
   */
  const fetchTrainingExamples = useCallback(async (articleId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_training_examples')
        .select('*')
        .eq('article_id', articleId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainingExamples(data || []);
    } catch (err) {
      console.error('Error fetching training examples:', err);
      setError('Failed to fetch training examples');
    }
  }, []);

  /**
   * Create AI training example
   */
  const createTrainingExample = useCallback(async (
    articleId: string,
    example: Omit<AITrainingExample, 'id' | 'article_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('ai_training_examples')
        .insert({
          article_id: articleId,
          ...example,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchTrainingExamples(articleId);
      toast.success('Training-Beispiel erstellt');
      return data;
    } catch (err) {
      console.error('Error creating training example:', err);
      toast.error('Fehler beim Erstellen des Training-Beispiels');
      return null;
    }
  }, [user, fetchTrainingExamples]);

  /**
   * Track AI knowledge usage
   */
  const trackAIUsage = useCallback(async (
    articleId: string,
    conversationId: string,
    usageType: 'context_included' | 'direct_reference' | 'similarity_match',
    relevanceScore: number
  ) => {
    try {
      // Insert usage metric
      await supabase
        .from('ai_knowledge_metrics')
        .insert({
          article_id: articleId,
          chat_conversation_id: conversationId,
          usage_type: usageType,
          relevance_score: relevanceScore
        });

      // Update article usage count and last usage
      await supabase
        .from('knowledge_base_articles')
        .update({
          ai_usage_count: supabase.raw('ai_usage_count + 1'),
          last_ai_usage: new Date().toISOString()
        })
        .eq('id', articleId);

    } catch (err) {
      console.error('Error tracking AI usage:', err);
    }
  }, []);

  /**
   * Get AI analytics for articles
   */
  const getAIAnalytics = useCallback(async (articleId?: string, timeframe = '7d') => {
    try {
      const response = await fetch(`/api/ai-knowledge/analytics?timeframe=${timeframe}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setKnowledgeMetrics(result.analytics || []);
      return result.analytics;
    } catch (err) {
      console.error('Error fetching AI analytics:', err);
      setError('Failed to fetch AI analytics');
      return [];
    }
  }, []);

  /**
   * Export AI training data
   */
  const exportTrainingData = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-knowledge/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export training data');
      }

      const result = await response.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-training-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Training-Daten exportiert (${result.data.total_articles} Artikel)`);
      return result.data;
    } catch (err) {
      console.error('Error exporting training data:', err);
      toast.error('Fehler beim Exportieren der Training-Daten');
      throw err;
    }
  }, []);

  /**
   * Update article AI effectiveness score
   */
  const updateEffectivenessScore = useCallback(async (articleId: string, score: number) => {
    try {
      const response = await fetch(`/api/ai-knowledge/effectiveness/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ effectivenessScore: score })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update effectiveness score');
      }

      toast.success('Effektivitäts-Score aktualisiert');
      await fetchArticles(); // Refresh articles
    } catch (err) {
      console.error('Error updating effectiveness score:', err);
      toast.error('Fehler beim Aktualisieren des Effektivitäts-Scores');
      throw err;
    }
  }, [fetchArticles]);

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, [fetchCategories, fetchArticles]);

  return {
    // State
    categories,
    articles,
    searchResults,
    trainingExamples,
    knowledgeMetrics,
    loading,
    searchLoading,
    error,
    
    // Actions
    fetchCategories,
    fetchArticles,
    searchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    voteArticle,
    generateEmbeddings,
    clearSearch,
    
    // AI-specific actions
    fetchTrainingExamples,
    createTrainingExample,
    trackAIUsage,
    getAIAnalytics,
    exportTrainingData,
    updateEffectivenessScore
  };
};
