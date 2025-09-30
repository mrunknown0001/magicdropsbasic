import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  MessageSquare,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Edit,
  User,
  FileText,
  CheckCircle
} from 'lucide-react';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { KnowledgeArticle, KnowledgeCategory } from '../../types/database';
import { useSettingsContext } from '../../context/SettingsContext';
import { supabase } from '../../lib/supabase';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../hooks/useToast';

const AIKnowledgeManagement: React.FC = () => {
  const { showToast } = useToast();
  const { colors } = useSettingsContext();
  
  // Knowledge base hook with AI features
  const { 
    categories, 
    articles, 
    knowledgeMetrics,
    loading, 
    error,
    fetchCategories,
    fetchArticles,
    createArticle,
    updateArticle,
    trackAIUsage,
    getAIAnalytics,
    exportTrainingData,
    updateEffectivenessScore,
    generateEmbeddings
  } = useKnowledgeBase();

  // Component state
  const [activeTab, setActiveTab] = useState<'overview' | 'wissensdatenbank' | 'training' | 'analytics' | 'optimization'>('overview');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [semanticSearchQuery, setSemanticSearchQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<KnowledgeArticle[]>([]);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [localArticleUpdates, setLocalArticleUpdates] = useState<Record<string, Partial<KnowledgeArticle>>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, NodeJS.Timeout>>({});

  // Load data on mount
  useEffect(() => {
    fetchCategories();
    fetchArticles();
    getAIAnalytics();
  }, [fetchCategories, fetchArticles, getAIAnalytics]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingUpdates).forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };
  }, [pendingUpdates]);

  // Calculate AI statistics
  const aiStats = {
    totalArticles: articles.length,
    aiEnabledArticles: articles.filter(a => a.ai_training_enabled).length,
    highPriorityArticles: articles.filter(a => a.context_priority && a.context_priority >= 8).length,
    articlesWithTemplates: articles.filter(a => a.response_template).length,
    averageEffectiveness: articles.length > 0 
      ? (articles.reduce((sum, a) => sum + (a.ai_effectiveness_score || 0), 0) / articles.length).toFixed(2)
      : '0.00',
    totalAIUsage: articles.reduce((sum, a) => sum + (a.ai_usage_count || 0), 0)
  };

  // Merge articles with local updates for immediate UI feedback
  const articlesWithLocalUpdates = articles.map(article => ({
    ...article,
    ...localArticleUpdates[article.id]
  }));

  // Filter articles based on priority (using merged data)
  const filteredArticles = articlesWithLocalUpdates.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || 
      (priorityFilter === 'high' && (article.context_priority || 0) >= 8) ||
      (priorityFilter === 'medium' && (article.context_priority || 0) >= 4 && (article.context_priority || 0) < 8) ||
      (priorityFilter === 'low' && (article.context_priority || 0) < 4);
    
    return matchesSearch && matchesPriority;
  });

  // Handle priority update with debouncing
  const handlePriorityUpdate = (articleId: string, newPriority: number) => {
    // Update local state immediately for UI responsiveness
    setLocalArticleUpdates(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], context_priority: newPriority }
    }));

    // Clear existing timeout
    if (pendingUpdates[articleId]) {
      clearTimeout(pendingUpdates[articleId]);
    }

    // Set new timeout for debounced update
    const timeoutId = setTimeout(async () => {
      try {
        await updateArticle(articleId, { context_priority: newPriority });
        showToast({ title: 'Erfolg', message: 'Priorität aktualisiert', type: 'success' });
        
        // Clear local update after successful save
        setLocalArticleUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[articleId];
          return newUpdates;
        });
      } catch (error) {
        showToast({ title: 'Fehler', message: 'Fehler beim Aktualisieren der Priorität', type: 'error' });
        // Revert local state on error
        setLocalArticleUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[articleId];
          return newUpdates;
        });
      }
      
      // Clear pending update
      setPendingUpdates(prev => {
        const newPending = { ...prev };
        delete newPending[articleId];
        return newPending;
      });
    }, 1000); // 1 second debounce

    // Store timeout reference
    setPendingUpdates(prev => ({
      ...prev,
      [articleId]: timeoutId
    }));
  };

  // Handle effectiveness update with debouncing
  const handleEffectivenessUpdate = (articleId: string, score: number) => {
    // Update local state immediately
    setLocalArticleUpdates(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], ai_effectiveness_score: score }
    }));

    // Clear existing timeout
    if (pendingUpdates[`${articleId}_effectiveness`]) {
      clearTimeout(pendingUpdates[`${articleId}_effectiveness`]);
    }

    // Set new timeout for debounced update
    const timeoutId = setTimeout(async () => {
      try {
        await updateEffectivenessScore(articleId, score);
        
        // Clear local update after successful save
        setLocalArticleUpdates(prev => {
          const newUpdates = { ...prev };
          if (newUpdates[articleId]) {
            delete newUpdates[articleId].ai_effectiveness_score;
            if (Object.keys(newUpdates[articleId]).length === 0) {
              delete newUpdates[articleId];
            }
          }
          return newUpdates;
        });
      } catch (error) {
        // Revert local state on error
        setLocalArticleUpdates(prev => {
          const newUpdates = { ...prev };
          if (newUpdates[articleId]) {
            delete newUpdates[articleId].ai_effectiveness_score;
            if (Object.keys(newUpdates[articleId]).length === 0) {
              delete newUpdates[articleId];
            }
          }
          return newUpdates;
        });
      }
      
      // Clear pending update
      setPendingUpdates(prev => {
        const newPending = { ...prev };
        delete newPending[`${articleId}_effectiveness`];
        return newPending;
      });
    }, 1000); // 1 second debounce

    // Store timeout reference
    setPendingUpdates(prev => ({
      ...prev,
      [`${articleId}_effectiveness`]: timeoutId
    }));
  };

  // Handle AI training toggle (immediate update - less disruptive)
  const handleAITrainingToggle = async (articleId: string, enabled: boolean) => {
    try {
      await updateArticle(articleId, { ai_training_enabled: enabled });
      showToast({ title: 'Erfolg', message: `AI-Training ${enabled ? 'aktiviert' : 'deaktiviert'}`, type: 'success' });
    } catch (error) {
      showToast({ title: 'Fehler', message: 'Fehler beim Aktualisieren der AI-Einstellung', type: 'error' });
    }
  };

  // Handle export training data
  const handleExportTrainingData = async () => {
    try {
      setIsExporting(true);
      await exportTrainingData();
    } catch (error) {
      // Error is already handled in the hook
    } finally {
      setIsExporting(false);
    }
  };

  // Handle generate embeddings for article
  const handleGenerateEmbeddings = async (articleId: string) => {
    try {
      await generateEmbeddings(articleId);
    } catch (error) {
      // Error is already handled in the hook
    }
  };


  // Handle semantic search
  const handleSemanticSearch = async () => {
    if (!semanticSearchQuery.trim()) {
      setSemanticResults([]);
      return;
    }

    try {
      setIsSemanticSearching(true);
      const response = await fetch('/api/ai-knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          query: semanticSearchQuery,
          limit: 10,
          threshold: 0.5
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSemanticResults(result.results || []);
        showToast({ 
          title: 'Semantic Search', 
          message: `${result.results?.length || 0} Artikel gefunden (${result.searchType})`, 
          type: 'success' 
        });
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      showToast({ 
        title: 'Fehler', 
        message: 'Semantic Search fehlgeschlagen', 
        type: 'error' 
      });
    } finally {
      setIsSemanticSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <User 
              className="h-8 w-8 mr-3" 
              style={{ color: colors.primary }}
            />
            AI Training & Wissensdatenbank
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verwalte die Wissensdatenbank und optimiere den AI-Assistenten
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={() => {
              fetchArticles();
              getAIAnalytics();
            }}
          >
            Aktualisieren
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download size={16} />}
            onClick={handleExportTrainingData}
            disabled={isExporting}
          >
            {isExporting ? 'Exportiere...' : 'Export'}
          </Button>
          {activeTab === 'wissensdatenbank' && (
            <Button
              leftIcon={<FileText size={16} />}
              onClick={() => {
                setSelectedArticle(null);
                setEditModalOpen(true);
              }}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className="hover:opacity-90 transition-opacity"
            >
              Artikel erstellen
            </Button>
          )}
          
          {activeTab === 'optimization' && (
            <Button
              variant="outline"
              leftIcon={<Upload size={16} />}
              onClick={async () => {
                try {
                  for (const article of articles.filter(a => a.ai_training_enabled)) {
                    await handleGenerateEmbeddings(article.id);
                  }
                  showToast({ title: 'Erfolg', message: 'Alle Embeddings generiert', type: 'success' });
                } catch (error) {
                  showToast({ title: 'Fehler', message: 'Fehler beim Generieren der Embeddings', type: 'error' });
                }
              }}
            >
              Alle Embeddings
            </Button>
          )}
        </div>
      </div>

      {/* AI Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${colors.primary}15` }}
            >
              <FileText 
                className="h-6 w-6" 
                style={{ color: colors.primary }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aiStats.totalArticles}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Gesamt Artikel
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${colors.accent}15` }}
            >
              <User 
                className="h-6 w-6" 
                style={{ color: colors.accent }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aiStats.aiEnabledArticles}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              AI-Training Aktiv
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${colors.primaryDark || colors.primary}15` }}
            >
              <Search 
                className="h-6 w-6" 
                style={{ color: colors.primaryDark || colors.primary }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aiStats.highPriorityArticles}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Hohe Priorität
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `#8B5CF615` }}
            >
              <MessageSquare 
                className="h-6 w-6" 
                style={{ color: '#8B5CF6' }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aiStats.articlesWithTemplates}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mit Templates
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `#F59E0B15` }}
            >
              <CheckCircle 
                className="h-6 w-6" 
                style={{ color: '#F59E0B' }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aiStats.averageEffectiveness}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Ø Effektivität
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `#EAB30815` }}
            >
              <Upload 
                className="h-6 w-6" 
                style={{ color: '#EAB308' }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aiStats.totalAIUsage}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              AI Verwendungen
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Übersicht', icon: <CheckCircle size={16} /> },
            { key: 'wissensdatenbank', label: 'Wissensdatenbank', icon: <FileText size={16} /> },
            { key: 'training', label: 'AI Training', icon: <User size={16} /> },
            { key: 'analytics', label: 'Analytics', icon: <CheckCircle size={16} /> },
            { key: 'optimization', label: 'Optimierung', icon: <Settings size={16} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.key
                  ? 'border-current dark:border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
              style={activeTab === tab.key ? { 
                color: colors.primary,
                borderColor: colors.primary 
              } : {}}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            articles={filteredArticles}
            categories={categories}
            colors={colors}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            onPriorityUpdate={handlePriorityUpdate}
            onAITrainingToggle={handleAITrainingToggle}
            onEffectivenessUpdate={handleEffectivenessUpdate}
            onEditArticle={(article) => {
              setSelectedArticle(article);
              setEditModalOpen(true);
            }}
            onSelectArticle={setSelectedArticle}
            pendingUpdates={pendingUpdates}
          />
        )}

        {activeTab === 'wissensdatenbank' && (
          <WissensdatenbankTab 
            articles={articles}
            categories={categories}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelectArticle={setSelectedArticle}
            selectedArticle={selectedArticle}
            onEditArticle={(article) => {
              setSelectedArticle(article);
              setEditModalOpen(true);
            }}
          />
        )}

        {activeTab === 'training' && (
          <TrainingTab 
            articles={articles}
            selectedArticle={selectedArticle}
            setSelectedArticle={setSelectedArticle}
            onOpenTrainingModal={() => setTrainingModalOpen(true)}
            onGenerateEmbeddings={handleGenerateEmbeddings}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            articles={articles}
            metrics={knowledgeMetrics}
            loading={loading}
          />
        )}

        {activeTab === 'optimization' && (
          <OptimizationTab 
            articles={articles}
            onOptimize={() => {/* TODO: Implement optimization */}}
            semanticSearchQuery={semanticSearchQuery}
            setSemanticSearchQuery={setSemanticSearchQuery}
            semanticResults={semanticResults}
            isSemanticSearching={isSemanticSearching}
            onSemanticSearch={handleSemanticSearch}
            onGenerateEmbeddings={handleGenerateEmbeddings}
          />
        )}
      </div>

      {/* Edit/Create Article Modal */}
      {editModalOpen && (
        <EditArticleModal
          article={selectedArticle}
          categories={categories}
          colors={colors}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedArticle(null);
          }}
          onSave={async (updates) => {
            if (selectedArticle) {
              // Edit existing article
              await updateArticle(selectedArticle.id, updates);
            } else {
              // Create new article
              await createArticle(updates);
            }
            setEditModalOpen(false);
            setSelectedArticle(null);
          }}
        />
      )}

      {/* Training Modal */}
      {trainingModalOpen && selectedArticle && (
        <TrainingModal
          article={selectedArticle}
          colors={colors}
          isOpen={trainingModalOpen}
          onClose={() => setTrainingModalOpen(false)}
          onSave={async (updates) => {
            await updateArticle(selectedArticle.id, updates);
            setTrainingModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Wissensdatenbank Tab Component (Knowledge Base Browser)
const WissensdatenbankTab: React.FC<{
  articles: KnowledgeArticle[];
  categories: KnowledgeCategory[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectArticle: (article: KnowledgeArticle | null) => void;
  selectedArticle: KnowledgeArticle | null;
  onEditArticle: (article: KnowledgeArticle) => void;
}> = ({ 
  articles, 
  categories, 
  loading, 
  searchTerm, 
  setSearchTerm, 
  onSelectArticle,
  selectedArticle,
  onEditArticle
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Filter articles by search and category
  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.summary || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || article.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory && article.is_published;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Wissensdatenbank durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">Alle Kategorien</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Knowledge Base Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Articles List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Artikel ({filteredArticles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredArticles.map((article) => (
                    <div 
                      key={article.id}
                      onClick={() => onSelectArticle(article)}
                      className={`
                        p-4 rounded-lg border cursor-pointer transition-colors
                        ${selectedArticle?.id === article.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {article.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {article.summary || article.content.substring(0, 100) + '...'}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Aufrufe: {article.view_count}</span>
                            <span>Hilfreich: {article.helpful_votes}</span>
                            {article.ai_training_enabled && (
                              <span className="text-blue-600 dark:text-blue-400">AI Training</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Edit size={12} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditArticle(article);
                            }}
                          >
                            Bearbeiten
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredArticles.length === 0 && !loading && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Keine Artikel gefunden
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Article Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Artikel-Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedArticle ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {selectedArticle.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {selectedArticle.summary}
                    </p>
                  </div>
                  
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedArticle.content.substring(0, 500)}
                        {selectedArticle.content.length > 500 && '...'}
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Kategorie:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-2">
                        {selectedArticle.category?.name || 'Unbekannt'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-medium ml-2 ${
                        selectedArticle.is_published 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {selectedArticle.is_published ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">AI Priorität:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-2">
                        {selectedArticle.context_priority || 5}/10
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">AI Nutzung:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-2">
                        {selectedArticle.ai_usage_count || 0}x
                      </span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      leftIcon={<Edit size={16} />}
                      onClick={() => onEditArticle(selectedArticle)}
                      className="w-full"
                    >
                      Artikel bearbeiten
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Wähle einen Artikel zur Vorschau
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  articles: KnowledgeArticle[];
  categories: KnowledgeCategory[];
  colors: any;
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  setPriorityFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void;
  onPriorityUpdate: (id: string, priority: number) => void;
  onAITrainingToggle: (id: string, enabled: boolean) => void;
  onEffectivenessUpdate: (id: string, score: number) => void;
  onEditArticle: (article: KnowledgeArticle) => void;
  onSelectArticle: (article: KnowledgeArticle | null) => void;
  pendingUpdates: Record<string, NodeJS.Timeout>;
}> = ({ 
  articles, 
  categories, 
  colors,
  loading, 
  searchTerm, 
  setSearchTerm, 
  priorityFilter, 
  setPriorityFilter,
  onPriorityUpdate,
  onAITrainingToggle,
  onEffectivenessUpdate,
  onEditArticle,
  onSelectArticle,
  pendingUpdates
}) => {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Artikel durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">Alle Prioritäten</option>
          <option value="high">Hoch (8-10)</option>
          <option value="medium">Mittel (4-7)</option>
          <option value="low">Niedrig (1-3)</option>
        </select>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Card key={article.id} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {article.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${article.is_published 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }
                      `}>
                        {article.is_published ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                      
                      {article.ai_training_enabled && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                          <User size={12} className="mr-1" />
                          AI Training
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                  {article.summary || article.content.substring(0, 150) + '...'}
                </p>
                
                {/* AI Metrics */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Kontext-Priorität:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={article.context_priority || 5}
                        onChange={(e) => onPriorityUpdate(article.id, parseInt(e.target.value))}
                        className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${((article.context_priority || 5) / 10) * 100}%, #e5e7eb ${((article.context_priority || 5) / 10) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white w-6">
                        {article.context_priority || 5}
                        {pendingUpdates[article.id] && (
                          <span className="text-xs text-yellow-600 ml-1">●</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">AI Effektivität:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={article.ai_effectiveness_score || 0}
                        onChange={(e) => onEffectivenessUpdate(article.id, parseFloat(e.target.value))}
                        className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((article.ai_effectiveness_score || 0) / 10) * 100}%, #e5e7eb ${((article.ai_effectiveness_score || 0) / 10) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white w-8">
                        {(article.ai_effectiveness_score || 0).toFixed(1)}
                        {pendingUpdates[`${article.id}_effectiveness`] && (
                          <span className="text-xs text-yellow-600 ml-1">●</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">AI Verwendungen:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {article.ai_usage_count || 0}
                    </span>
                  </div>
                </div>

                {/* AI Training Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    AI Training
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={article.ai_training_enabled ?? true}
                      onChange={(e) => onAITrainingToggle(article.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div 
                      className={`w-11 h-6 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${
                        article.ai_training_enabled 
                          ? 'bg-gray-200 peer-focus:ring-4' 
                          : 'bg-gray-200 peer-focus:ring-4'
                      }`}
                      style={article.ai_training_enabled ? { 
                        backgroundColor: colors.primary,
                        boxShadow: `0 0 0 4px ${colors.primary}20`
                      } : {}}
                    ></div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FileText size={14} />}
                    onClick={() => onSelectArticle(article)}
                    className="flex-1"
                  >
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Edit size={14} />}
                    onClick={() => onEditArticle(article)}
                  >
                    Bearbeiten
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Training Tab Component
const TrainingTab: React.FC<{
  articles: KnowledgeArticle[];
  selectedArticle: KnowledgeArticle | null;
  setSelectedArticle: (article: KnowledgeArticle | null) => void;
  onOpenTrainingModal: () => void;
  onGenerateEmbeddings: (articleId: string) => void;
}> = ({ articles, selectedArticle, setSelectedArticle, onOpenTrainingModal, onGenerateEmbeddings }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Article List */}
      <Card>
        <CardHeader>
          <CardTitle>AI Training Artikel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {articles.filter(a => a.ai_training_enabled).map(article => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={`
                  w-full text-left p-3 rounded-lg border transition-colors
                  ${selectedArticle?.id === article.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {article.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Priorität: {article.context_priority || 5}/10
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Training Details */}
      <Card>
        <CardHeader>
          <CardTitle>Training Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedArticle ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {selectedArticle.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedArticle.summary}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Priorität:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">
                    {selectedArticle.context_priority || 5}/10
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Effektivität:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">
                    {(selectedArticle.ai_effectiveness_score || 0).toFixed(1)}/10
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Verwendungen:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">
                    {selectedArticle.ai_usage_count || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Letzte Nutzung:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">
                    {selectedArticle.last_ai_usage 
                      ? new Date(selectedArticle.last_ai_usage).toLocaleDateString('de-DE')
                      : 'Nie'
                    }
                  </span>
                </div>
              </div>

              {selectedArticle.response_template && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Response Template:
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
                    {selectedArticle.response_template}
                  </div>
                </div>
              )}

              <div className="pt-4 space-x-2">
                <Button
                  leftIcon={<Edit size={16} />}
                  onClick={onOpenTrainingModal}
                >
                  Training bearbeiten
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Upload size={16} />}
                  onClick={() => selectedArticle && onGenerateEmbeddings(selectedArticle.id)}
                >
                  Embeddings generieren
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Wähle einen Artikel für Training-Details
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab: React.FC<{
  articles: KnowledgeArticle[];
  metrics: any[];
  loading: boolean;
}> = ({ articles, metrics, loading }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Analytics Dashboard wird implementiert...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Optimization Tab Component
const OptimizationTab: React.FC<{
  articles: KnowledgeArticle[];
  onOptimize: () => void;
  semanticSearchQuery: string;
  setSemanticSearchQuery: (query: string) => void;
  semanticResults: KnowledgeArticle[];
  isSemanticSearching: boolean;
  onSemanticSearch: () => void;
  onGenerateEmbeddings: (articleId: string) => void;
}> = ({ 
  articles, 
  onOptimize, 
  semanticSearchQuery, 
  setSemanticSearchQuery, 
  semanticResults, 
  isSemanticSearching, 
  onSemanticSearch,
  onGenerateEmbeddings 
}) => {
  return (
    <div className="space-y-6">
      {/* Semantic Search Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Semantic Search Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Teste semantische Suche... (z.B. 'Probleme mit Upload')"
                  value={semanticSearchQuery}
                  onChange={(e) => setSemanticSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSemanticSearch()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <Button 
                onClick={onSemanticSearch}
                disabled={isSemanticSearching || !semanticSearchQuery.trim()}
                leftIcon={<Search size={16} />}
              >
                {isSemanticSearching ? 'Suche...' : 'Suchen'}
              </Button>
            </div>

            {/* Search Results */}
            {semanticResults.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Suchergebnisse ({semanticResults.length})
                </h4>
                <div className="space-y-2">
                  {semanticResults.map((result: any) => (
                    <div key={result.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {result.title}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {result.summary || result.content?.substring(0, 100) + '...'}
                          </p>
                          {result.similarity_score && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              Relevanz: {(result.similarity_score * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Embeddings Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Embeddings Verwaltung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Generiere Embeddings für bessere semantische Suche und AI-Performance.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {articles.filter(a => a.ai_training_enabled).map(article => (
                <div key={article.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {article.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Priorität: {article.context_priority || 5}/10
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Upload size={14} />}
                      onClick={() => onGenerateEmbeddings(article.id)}
                    >
                      Embeddings
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Optimization Tools */}
      <Card>
        <CardHeader>
          <CardTitle>AI Optimierung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Erweiterte Optimierungs-Tools werden implementiert...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Edit/Create Article Modal Component
const EditArticleModal: React.FC<{
  article: KnowledgeArticle | null;
  categories: KnowledgeCategory[];
  colors: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<KnowledgeArticle>) => Promise<void>;
}> = ({ article, categories, colors, isOpen, onClose, onSave }) => {
  const isCreating = !article;
  
  const [formData, setFormData] = useState({
    title: article?.title || '',
    summary: article?.summary || '',
    content: article?.content || '',
    context_priority: article?.context_priority || 5,
    response_template: article?.response_template || '',
    category_id: article?.category_id || '',
    is_published: article?.is_published ?? true,
    ai_training_enabled: article?.ai_training_enabled ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validation for new articles
    if (isCreating) {
      if (!formData.title.trim()) {
        alert('Titel ist erforderlich');
        return;
      }
      if (!formData.content.trim()) {
        alert('Inhalt ist erforderlich');
        return;
      }
      if (!formData.category_id) {
        alert('Kategorie ist erforderlich');
        return;
      }
    }
    
    try {
      setSaving(true);
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isCreating ? 'Artikel erstellen' : 'Artikel bearbeiten'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zusammenfassung
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
              />
            </div>

            {isCreating && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategorie
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
                  required
                >
                  <option value="">Kategorie wählen...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Inhalt
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                placeholder="Artikel-Inhalt in Markdown..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kontext-Priorität: {formData.context_priority}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.context_priority}
                onChange={(e) => setFormData({ ...formData, context_priority: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(formData.context_priority / 10) * 100}%, #e5e7eb ${(formData.context_priority / 10) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response Template
              </label>
              <textarea
                value={formData.response_template}
                onChange={(e) => setFormData({ ...formData, response_template: e.target.value })}
                rows={4}
                placeholder="Vordefinierte Antwort für AI..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className="hover:opacity-90 transition-opacity"
            >
              {saving ? (isCreating ? 'Erstelle...' : 'Speichere...') : (isCreating ? 'Erstellen' : 'Speichern')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Training Modal Component
const TrainingModal: React.FC<{
  article: KnowledgeArticle;
  colors: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<KnowledgeArticle>) => Promise<void>;
}> = ({ article, colors, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    conversation_examples: article.conversation_examples || []
  });
  const [saving, setSaving] = useState(false);
  const [newExample, setNewExample] = useState({ question: '', answer: '' });

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addExample = () => {
    if (newExample.question.trim() && newExample.answer.trim()) {
      setFormData({
        ...formData,
        conversation_examples: [
          ...formData.conversation_examples,
          { ...newExample, id: Date.now() }
        ]
      });
      setNewExample({ question: '', answer: '' });
    }
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      conversation_examples: formData.conversation_examples.filter((_, i) => i !== index)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Training bearbeiten: {article.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Existing Examples */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Training-Beispiele ({formData.conversation_examples.length})
              </h3>
              
              {formData.conversation_examples.map((example: any, index: number) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Frage:</span>
                        <p className="text-gray-900 dark:text-white">{example.question}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Antwort:</span>
                        <p className="text-gray-900 dark:text-white">{example.answer}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeExample(index)}
                      className="text-red-500 hover:text-red-700 ml-3"
                    >
                      <User size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Example */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Neues Beispiel hinzufügen
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frage
                  </label>
                  <input
                    type="text"
                    value={newExample.question}
                    onChange={(e) => setNewExample({ ...newExample, question: e.target.value })}
                    placeholder="Beispielfrage..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Erwartete Antwort
                  </label>
                  <textarea
                    value={newExample.answer}
                    onChange={(e) => setNewExample({ ...newExample, answer: e.target.value })}
                    placeholder="Erwartete AI-Antwort..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 dark:bg-gray-700 dark:text-white"
                style={{ '--tw-ring-color': `${colors.primary}50` } as any}
                  />
                </div>
                
                <Button
                  onClick={addExample}
                  disabled={!newExample.question.trim() || !newExample.answer.trim()}
                  size="sm"
                  style={{ backgroundColor: colors.accent, color: 'white' }}
                  className="hover:opacity-90 transition-opacity"
                >
                  Beispiel hinzufügen
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className="hover:opacity-90 transition-opacity"
            >
              {saving ? 'Speichere...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIKnowledgeManagement;
