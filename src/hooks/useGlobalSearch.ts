import { useCallback } from 'react';
import { useSearch } from '../context/SearchContext';
import { useNavigate } from 'react-router-dom';

/**
 * Simplified hook for global search functionality
 * Provides common search actions and state
 */
export const useGlobalSearch = () => {
  const navigate = useNavigate();
  const searchContext = useSearch();

  const {
    searchTerm,
    searchResults,
    isSearching,
    executeSearch,
    clearSearch,
    searchHistory
  } = searchContext;

  // Quick search function that automatically navigates to results
  const quickSearch = useCallback((term: string) => {
    if (term.trim()) {
      executeSearch(term);
      navigate(`/admin/search?q=${encodeURIComponent(term)}`);
    }
  }, [executeSearch, navigate]);

  // Search with category filter
  const searchInCategory = useCallback((term: string, category: string) => {
    if (term.trim()) {
      executeSearch(term, category);
      navigate(`/admin/search?q=${encodeURIComponent(term)}&category=${category}`);
    }
  }, [executeSearch, navigate]);

  // Get search suggestions (top 5 results)
  const getSearchSuggestions = useCallback((term: string) => {
    return searchResults.slice(0, 5);
  }, [searchResults]);

  // Check if there are any results
  const hasResults = searchResults.length > 0;

  // Get results count by category
  const getResultsCount = useCallback((category?: string) => {
    if (!category || category === 'all') {
      return searchResults.length;
    }
    return searchResults.filter(result => result.type === category).length;
  }, [searchResults]);

  // Get top result (highest relevance)
  const getTopResult = useCallback(() => {
    return searchResults.length > 0 ? searchResults[0] : null;
  }, [searchResults]);

  return {
    // State
    searchTerm,
    searchResults,
    isSearching,
    hasResults,
    searchHistory,

    // Actions
    executeSearch,
    quickSearch,
    searchInCategory,
    clearSearch,

    // Utilities
    getSearchSuggestions,
    getResultsCount,
    getTopResult,

    // Access to full context if needed
    searchContext
  };
};

export default useGlobalSearch; 