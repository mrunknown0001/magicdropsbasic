import { useEffect } from 'react';

interface UseDocumentTitleOptions {
  title?: string;
  suffix?: string;
  fallback?: string;
  loading?: boolean;
}

export const useDocumentTitle = ({ 
  title, 
  suffix, 
  fallback = '', 
  loading = false 
}: UseDocumentTitleOptions) => {
  useEffect(() => {
    // Don't update title while loading to avoid flicker
    if (loading) return;
    
    let newTitle = '';
    
    if (title) {
      newTitle = suffix ? `${title} - ${suffix}` : title;
    } else {
      newTitle = suffix ? `${fallback} - ${suffix}` : fallback;
    }
    
    // Only update if the title is actually different
    if (document.title !== newTitle) {
      document.title = newTitle;
    }
  }, [title, suffix, fallback, loading]);
}; 