import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchResult, SearchCategory, SearchFilters, SearchState } from '../types/database';
import { globalSearchService } from '../services/globalSearch.service';

interface SearchContextType {
  // State
  searchTerm: string;
  searchResults: SearchResult[];
  categories: SearchCategory[];
  filters: SearchFilters;
  isSearching: boolean;
  searchHistory: string[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  executeSearch: (term: string, category?: string) => Promise<void>;
  clearSearch: () => void;
  updateFilters: (newFilters: Partial<SearchFilters>) => void;
  addToHistory: (term: string) => void;
  clearHistory: () => void;
  
  // Utility
  getResultsByCategory: (category: string) => SearchResult[];
  getCategoryCount: (category: string) => number;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const SEARCH_HISTORY_KEY = 'globalSearchHistory';
const MAX_HISTORY_ITEMS = 10;

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  
  // Initialize search state
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: '',
    results: [],
    categories: globalSearchService.getSearchCategories(),
    filters: {
      category: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc'
    },
    isSearching: false,
    lastSearchTime: 0,
    searchHistory: []
  });

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        setSearchState(prev => ({ ...prev, searchHistory: history }));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchState.searchHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, [searchState.searchHistory]);

  const setSearchTerm = useCallback((term: string) => {
    setSearchState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const executeSearch = useCallback(async (term: string, category?: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchState(prev => ({ ...prev, results: [], searchTerm: term }));
      return;
    }



    setSearchState(prev => ({ 
      ...prev, 
      isSearching: true, 
      searchTerm: term,
      filters: category ? { ...prev.filters, category: category as any } : prev.filters
    }));

    try {
      let results: SearchResult[] = [];
      const targetCategory = category || searchState.filters.category;

      // Execute search based on category
      switch (targetCategory) {
        case 'employee':
          results = await globalSearchService.searchEmployees(term);
          break;
        case 'bankdrop':
          results = await globalSearchService.searchBankdrops(term);
          break;
        case 'task':
          results = await globalSearchService.searchTasks(term);
          break;
        case 'phone':
          results = await globalSearchService.searchPhoneNumbers(term);
          break;
        case 'all':
        default:
          results = await globalSearchService.searchAll(term);
          break;
      }

      // Apply sorting
      const sortedResults = sortResults(results, searchState.filters.sortBy, searchState.filters.sortOrder);

      // Update categories with result counts
      const updatedCategories = updateCategoryCounts(searchState.categories, results);

      setSearchState(prev => ({
        ...prev,
        results: sortedResults,
        categories: updatedCategories,
        isSearching: false,
        lastSearchTime: Date.now()
      }));

      // Add to search history
      addToHistory(term);

    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({ 
        ...prev, 
        results: [], 
        isSearching: false 
      }));
    }
  }, [searchState.filters]);

  const clearSearch = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      searchTerm: '',
      results: [],
      categories: globalSearchService.getSearchCategories(),
      isSearching: false
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setSearchState(prev => {
      const updatedFilters = { ...prev.filters, ...newFilters };
      const sortedResults = sortResults(prev.results, updatedFilters.sortBy, updatedFilters.sortOrder);
      
      return {
        ...prev,
        filters: updatedFilters,
        results: sortedResults
      };
    });
  }, []);

  const addToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setSearchState(prev => {
      const newHistory = [
        term,
        ...prev.searchHistory.filter(item => item !== term)
      ].slice(0, MAX_HISTORY_ITEMS);
      
      return { ...prev, searchHistory: newHistory };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchState(prev => ({ ...prev, searchHistory: [] }));
  }, []);

  const getResultsByCategory = useCallback((category: string) => {
    if (category === 'all') return searchState.results;
    return searchState.results.filter(result => result.type === category);
  }, [searchState.results]);

  const getCategoryCount = useCallback((category: string) => {
    if (category === 'all') return searchState.results.length;
    return searchState.results.filter(result => result.type === category).length;
  }, [searchState.results]);

  // Helper function to sort results
  const sortResults = (results: SearchResult[], sortBy?: string, sortOrder?: string): SearchResult[] => {
    const sorted = [...results];
    
    switch (sortBy) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'de'));
        break;
      default:
        break;
    }
    
    if (sortOrder === 'asc') {
      sorted.reverse();
    }
    
    return sorted;
  };

  // Helper function to update category counts
  const updateCategoryCounts = (categories: SearchCategory[], results: SearchResult[]): SearchCategory[] => {
    return categories.map(category => ({
      ...category,
      count: category.type === 'all' 
        ? results.length 
        : results.filter(result => result.type === category.type).length
    }));
  };

  const contextValue: SearchContextType = {
    // State
    searchTerm: searchState.searchTerm,
    searchResults: searchState.results,
    categories: searchState.categories,
    filters: searchState.filters,
    isSearching: searchState.isSearching,
    searchHistory: searchState.searchHistory,
    
    // Actions
    setSearchTerm,
    executeSearch,
    clearSearch,
    updateFilters,
    addToHistory,
    clearHistory,
    
    // Utility
    getResultsByCategory,
    getCategoryCount
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export default SearchContext; 