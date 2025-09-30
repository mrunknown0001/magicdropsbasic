import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { usePublicSettings } from '../../hooks/usePublicSettings';

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { settings } = usePublicSettings();

  // Dynamic colors from settings
  const primaryColor = settings?.primary_color || '#ee1d3c';
  const accentColor = settings?.accent_color || '#231f20';

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Smooth scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          style={{
            backgroundColor: primaryColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = accentColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = primaryColor;
          }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6 group-hover:-translate-y-1 transition-transform duration-300" />
          
          {/* Animated ring on hover */}
          <div 
            className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300"
            style={{ borderColor: primaryColor }}
          ></div>
        </button>
      )}
    </>
  );
}

export default ScrollToTopButton;
