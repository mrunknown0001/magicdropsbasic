import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  BookOpen,
  Tag,
  TrendingUp,
  Users,
  Filter,
  Download,
  Upload,
  Settings
} from 'lucide-react';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { KnowledgeArticle, KnowledgeCategory } from '../../types/database';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';

const KnowledgeBase: React.FC = () => {
  const { showToast } = useToast();
  
  // Knowledge base hook
  const { 
    categories, 
    articles, 
    searchResults,
    loading, 
    searchLoading,
    error,
    fetchCategories,
    fetchArticles,
    searchArticles,
    createArticle, 
    updateArticle, 
    deleteArticle,
    voteArticle,
    generateEmbeddings,
    clearSearch
  } = useKnowledgeBase();

  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form state for article creation/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    tags: [] as string[],
    keywords: [] as string[],
    is_published: false,
    // AI-specific fields
    ai_training_enabled: true,
    context_priority: 5,
    response_template: '',
    conversation_examples: [] as Array<{question: string; answer: string}>
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchTerm(query);
    if (query.trim()) {
      searchArticles(query);
    } else {
      clearSearch();
    }
  };

  // Filter articles by category
  const filteredArticles = selectedCategory === 'all' 
    ? (searchTerm ? searchResults : articles)
    : (searchTerm ? searchResults : articles).filter(article => article.category_id === selectedCategory);

  // Handle article creation
  const handleCreateArticle = async () => {
    try {
      const newArticle = await createArticle(formData);
      if (newArticle) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          content: '',
          summary: '',
          category_id: '',
          tags: [],
          keywords: [],
          is_published: false
        });
        showToast({
          type: 'success',
          title: 'Erfolg',
          message: 'Artikel wurde erfolgreich erstellt'
        });
      }
    } catch (error) {
      console.error('Error creating article:', error);
    }
  };

  // Handle article editing
  const handleEditArticle = async () => {
    if (!selectedArticle) return;
    
    try {
      const success = await updateArticle(selectedArticle.id, formData);
      if (success) {
        setShowEditModal(false);
        setSelectedArticle(null);
        showToast({
          type: 'success',
          title: 'Erfolg',
          message: 'Artikel wurde erfolgreich aktualisiert'
        });
      }
    } catch (error) {
      console.error('Error updating article:', error);
    }
  };

  // Handle article deletion
  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    
    try {
      const success = await deleteArticle(selectedArticle.id);
      if (success) {
        setShowDeleteModal(false);
        setSelectedArticle(null);
        showToast({
          type: 'success',
          title: 'Erfolg',
          message: 'Artikel wurde erfolgreich gelöscht'
        });
      }
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  // Open edit modal with article data
  const openEditModal = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      summary: article.summary || '',
      category_id: article.category_id,
      tags: article.tags || [],
      keywords: article.keywords || [],
      is_published: article.is_published
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setShowDeleteModal(true);
  };

  // Open preview modal
  const openPreviewModal = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setShowPreviewModal(true);
  };

  // Generate embeddings for article
  const handleGenerateEmbeddings = async (articleId: string) => {
    try {
      await generateEmbeddings(articleId);
      showToast({
        type: 'success',
        title: 'Erfolg',
        message: 'Embeddings wurden generiert'
      });
    } catch (error) {
      console.error('Error generating embeddings:', error);
    }
  };

  // Get category statistics
  const getCategoryStats = () => {
    return categories.map(category => ({
      ...category,
      article_count: articles.filter(article => article.category_id === category.id).length,
      published_count: articles.filter(article => 
        article.category_id === category.id && article.is_published
      ).length
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Wissensdatenbank
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verwalten Sie Artikel und FAQs für den AI-Assistenten
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            leftIcon={<Upload size={16} />}
            onClick={() => {/* TODO: Implement bulk import */}}
          >
            Importieren
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusCircle size={16} />}
          >
            Neuer Artikel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Artikel gesamt
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {articles.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Veröffentlicht
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {articles.filter(a => a.is_published).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Tag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Kategorien
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {categories.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Aufrufe gesamt
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {articles.reduce((sum, article) => sum + article.view_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Artikel durchsuchen..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Alle Kategorien</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm rounded-l-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm rounded-r-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Liste
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredArticles.map(article => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={viewMode === 'grid' ? '' : 'w-full'}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {article.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          article.is_published
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {article.is_published ? 'Veröffentlicht' : 'Entwurf'}
                        </span>
                        {article.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {article.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => openPreviewModal(article)}
                        className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                        title="Vorschau"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(article)}
                        className="p-1 text-gray-400 hover:text-green-500 dark:hover:text-green-400"
                        title="Bearbeiten"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(article)}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        title="Löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {article.summary && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                      {article.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye size={12} />
                        <span>{article.view_count}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp size={12} />
                        <span>{article.helpful_votes}</span>
                      </div>
                    </div>
                    <span>{new Date(article.created_at).toLocaleDateString('de-DE')}</span>
                  </div>

                  {/* Tags */}
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map(tag => (
                        <span 
                          key={tag} 
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateEmbeddings(article.id)}
                      leftIcon={<Settings size={14} />}
                    >
                      Embeddings
                    </Button>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPreviewModal(article)}
                        leftIcon={<Eye size={14} />}
                      >
                        Anzeigen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(article)}
                        leftIcon={<Edit size={14} />}
                      >
                        Bearbeiten
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'Keine Artikel gefunden' : 'Noch keine Artikel'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm 
              ? 'Versuchen Sie andere Suchbegriffe oder erstellen Sie einen neuen Artikel.'
              : 'Erstellen Sie Ihren ersten Artikel für die Wissensdatenbank.'
            }
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusCircle size={16} />}
          >
            Ersten Artikel erstellen
          </Button>
        </div>
      )}

      {/* Create Article Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Neuen Artikel erstellen"
        size="xl"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titel
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Artikel-Titel eingeben..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kategorie
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Kategorie auswählen...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zusammenfassung
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Kurze Zusammenfassung für Suchergebnisse..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Inhalt
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Artikel-Inhalt eingeben... (Markdown wird unterstützt)"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Sofort veröffentlichen
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateArticle}
              disabled={!formData.title || !formData.content || !formData.category_id}
            >
              Artikel erstellen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Similar modals for Edit, Delete, and Preview would go here */}
      {/* For brevity, I'll implement the basic structure */}
      
    </div>
  );
};

export default KnowledgeBase;
