import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Type,
  Hash,
  FileText,
  Lightbulb,
  Tag,
  Globe
} from 'lucide-react';
import { KnowledgeArticle, KnowledgeCategory } from '../../types/database';
import { KnowledgeBaseService } from '../../services/knowledgeBaseService';
import Button from '../ui/Button';
import Modal from '../common/Modal';

interface KnowledgeBaseEditorProps {
  article?: KnowledgeArticle;
  categories: KnowledgeCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (articleData: Partial<KnowledgeArticle>) => Promise<void>;
  mode: 'create' | 'edit';
}

export const KnowledgeBaseEditor: React.FC<KnowledgeBaseEditorProps> = ({
  article,
  categories,
  isOpen,
  onClose,
  onSave,
  mode
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    tags: [] as string[],
    keywords: [] as string[],
    is_published: false
  });

  // Editor state
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  // Initialize form data when article changes
  useEffect(() => {
    if (article && mode === 'edit') {
      setFormData({
        title: article.title,
        content: article.content,
        summary: article.summary || '',
        category_id: article.category_id,
        tags: article.tags || [],
        keywords: article.keywords || [],
        is_published: article.is_published
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        content: '',
        summary: '',
        category_id: '',
        tags: [],
        keywords: [],
        is_published: false
      });
    }
  }, [article, mode]);

  // Handle save
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.category_id) {
      return;
    }

    setIsSaving(true);
    try {
      // Auto-generate summary if not provided
      let summary = formData.summary;
      if (!summary.trim()) {
        summary = KnowledgeBaseService.generateSummary(formData.content);
      }

      // Auto-extract keywords if not provided
      let keywords = formData.keywords;
      if (keywords.length === 0) {
        keywords = KnowledgeBaseService.extractKeywords(formData.content + ' ' + formData.title);
      }

      await onSave({
        ...formData,
        summary,
        keywords
      });
    } catch (error) {
      console.error('Error saving article:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Add keyword
  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  // Remove keyword
  const removeKeyword = (keywordToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(keyword => keyword !== keywordToRemove)
    }));
  };

  // Render markdown preview
  const renderMarkdownPreview = (content: string) => {
    // Simple markdown rendering for preview
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```(.*?)```/gs, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mt-2 mb-2 overflow-x-auto"><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Neuen Artikel erstellen' : 'Artikel bearbeiten'}
      size="full"
    >
      <div className="flex h-[80vh]">
        {/* Editor Panel */}
        <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <FileText size={20} className="mr-2" />
                Grundinformationen
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="z.B. Wie lade ich KYC-Dokumente hoch?"
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/500 Zeichen
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategorie *
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
                <div className="text-xs text-gray-500 mt-1">
                  Wird automatisch generiert, falls leer gelassen
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Type size={20} className="mr-2" />
                  Inhalt
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  leftIcon={showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                >
                  {showPreview ? 'Editor' : 'Vorschau'}
                </Button>
              </div>

              <div className="relative">
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Artikel-Inhalt eingeben... (Markdown wird unterstützt)

Beispiele:
**Fett** für fette Schrift
*Kursiv* für kursive Schrift  
`Code` für Code-Blöcke
```
Mehrzeilige
Code-Blöcke
```"
                />
              </div>

              <div className="text-xs text-gray-500">
                Markdown wird unterstützt. Verwenden Sie **fett**, *kursiv*, `code`, und ```code-blöcke```
              </div>
            </div>

            {/* Tags and Keywords */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Tag size={20} className="mr-2" />
                Tags & Keywords
              </h3>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-blue-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tag hinzufügen..."
                  />
                  <Button size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                    Hinzufügen
                  </Button>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Suchbegriffe
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.keywords.map(keyword => (
                    <span 
                      key={keyword}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-2 hover:text-green-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Suchbegriff hinzufügen..."
                  />
                  <Button size="sm" onClick={addKeyword} disabled={!keywordInput.trim()}>
                    Hinzufügen
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Werden automatisch generiert, falls leer gelassen
                </div>
              </div>
            </div>

            {/* Publishing Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Globe size={20} className="mr-2" />
                Veröffentlichung
              </h3>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Artikel veröffentlichen (für AI-Assistent verfügbar machen)
                </label>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start">
                  <Lightbulb size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Hinweis:</strong> Veröffentlichte Artikel werden automatisch vom AI-Assistenten verwendet, um Mitarbeitern zu helfen. Stellen Sie sicher, dass der Inhalt korrekt und aktuell ist.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Vorschau
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Wörter: {formData.content.split(' ').filter(w => w.trim()).length}</span>
                <span>•</span>
                <span>Zeichen: {formData.content.length}</span>
              </div>
            </div>

            {/* Preview Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              {formData.title && (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {formData.title}
                </h1>
              )}

              {formData.summary && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-3 mb-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                    {formData.summary}
                  </p>
                </div>
              )}

              {formData.content && (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownPreview(formData.content)
                  }}
                />
              )}

              {/* Tags Preview */}
              {formData.tags.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!formData.title && !formData.content && (
                <div className="text-center py-12">
                  <FileText size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Beginnen Sie mit dem Schreiben, um eine Vorschau zu sehen
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Hash size={14} />
            <span>{formData.tags.length} Tags</span>
          </div>
          <div className="flex items-center space-x-1">
            <Tag size={14} />
            <span>{formData.keywords.length} Keywords</span>
          </div>
          {formData.category_id && (
            <div className="flex items-center space-x-1">
              <FileText size={14} />
              <span>{categories.find(c => c.id === formData.category_id)?.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.title.trim() || !formData.content.trim() || !formData.category_id || isSaving}
            leftIcon={isSaving ? undefined : <Save size={16} />}
            isLoading={isSaving}
          >
            {isSaving ? 'Speichern...' : mode === 'create' ? 'Artikel erstellen' : 'Änderungen speichern'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default KnowledgeBaseEditor;
