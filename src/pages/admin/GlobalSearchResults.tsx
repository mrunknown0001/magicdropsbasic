import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Users, 
  Database, 
  Briefcase, 
  Phone, 
  FileText,
  RefreshCw
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useSearch } from '../../context/SearchContext';
import { SearchResult, SearchResultType } from '../../types/database';

const GlobalSearchResults: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    searchTerm, 
    setSearchTerm,
    searchResults, 
    categories, 
    filters,
    isSearching,
    executeSearch,
    updateFilters,
    getResultsByCategory,
    getCategoryCount,
    searchHistory 
  } = useSearch();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const query = searchParams.get('q') || '';

  // Execute search when component mounts or query changes
  useEffect(() => {
    if (query && query !== searchTerm) {
      setSearchTerm(query);
      executeSearch(query, selectedCategory);
    }
  }, [query, selectedCategory, searchTerm, setSearchTerm, executeSearch]);

  // Update URL when category changes
  const handleCategoryChange = (categoryType: string) => {
    setSelectedCategory(categoryType);
    updateFilters({ category: categoryType as any });
    
    if (query) {
      executeSearch(query, categoryType);
    }
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    updateFilters({ sortBy: sortBy as any });
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
  };

  // Get filtered results for current category
  const filteredResults = getResultsByCategory(selectedCategory);

  // Get category icon
  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'employee': return Users;
      case 'bankdrop': return Database;
      case 'task': return Briefcase;
      case 'phone': return Phone;
      case 'submission': return FileText;
      default: return Search;
    }
  };

  // Get category color
  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'employee': return 'blue';
      case 'bankdrop': return 'green';
      case 'task': return 'purple';
      case 'phone': return 'orange';
      case 'submission': return 'indigo';
      default: return 'gray';
    }
  };

  // Format result metadata
  const formatResultMetadata = (result: SearchResult) => {
    const metadata = [];
    
    if (result.createdAt) {
      metadata.push(`Erstellt: ${new Date(result.createdAt).toLocaleDateString('de-DE')}`);
    }
    
    if (result.metadata?.status) {
      metadata.push(`Status: ${result.metadata.status}`);
    }
    
    if (result.metadata?.role) {
      metadata.push(`Rolle: ${result.metadata.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}`);
    }
    
    return metadata.join(' • ');
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Suchergebnisse
            </h1>
            {query && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {filteredResults.length} Ergebnisse für "{query}"
                {selectedCategory !== 'all' && (
                  <span className="text-accent">
                    {' '}in {categories.find(c => c.type === selectedCategory)?.name}
                  </span>
                )}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Sort Dropdown */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="relevance">Relevanz</option>
              <option value="date">Datum</option>
              <option value="title">Titel</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeSearch(query)}
              disabled={isSearching}
              leftIcon={<RefreshCw size={16} />}
            >
              Aktualisieren
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Kategorien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.type);
                const count = getCategoryCount(category.type);
                const isSelected = selectedCategory === category.type;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.type)}
                    className={`w-full flex items-center justify-between p-3 rounded-md text-left transition-colors ${
                      isSelected
                        ? 'bg-accent/10 text-accent border-l-4 border-accent'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={18} />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    {count > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Suchverlauf</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {searchHistory.slice(0, 5).map((term, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const newParams = new URLSearchParams();
                      newParams.set('q', term);
                      setSearchParams(newParams);
                    }}
                    className="w-full text-left p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3">
          {isSearching ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Keine Ergebnisse gefunden
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {query 
                    ? `Keine Ergebnisse für "${query}"${selectedCategory !== 'all' ? ` in ${categories.find(c => c.type === selectedCategory)?.name}` : ''}.`
                    : 'Geben Sie einen Suchbegriff ein, um Ergebnisse zu sehen.'
                  }
                </p>
                <Button
                  variant="outline"
                  onClick={() => handleCategoryChange('all')}
                  className="mr-2"
                >
                  Alle Kategorien durchsuchen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredResults.map((result, index) => {
                  const color = getCategoryColor(result.type);
                  const Icon = getCategoryIcon(result.type);
                  
                  return (
                    <motion.div
                      key={`${result.type}-${result.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div 
                            onClick={() => handleResultClick(result)}
                            className="flex items-start space-x-4"
                          >
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                              color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                              color === 'indigo' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                            }`}>
                              <Icon size={20} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {result.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {result.subtitle}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                                    {result.description}
                                  </p>
                                  
                                  {formatResultMetadata(result) && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                      {formatResultMetadata(result)}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                    color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                    color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                                    color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                                    color === 'indigo' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                                  }`}>
                                    {result.relevanceScore}% Match
                                  </span>
                                  <span className="text-gray-400">→</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchResults; 