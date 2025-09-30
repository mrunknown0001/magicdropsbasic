import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// Import all the components we're using
import {
  Header,
  HeroSection,
  IntroSection,
  BenefitsSection,
  JobOffersSection,
  FAQSection,
  TestimonialsSection,
  CTASection,
  Footer
} from './components';

function LandingPage() {
  const { settings, loading } = usePublicSettings();
  const location = useLocation();

  // Set document title using the custom hook
  useDocumentTitle({
    title: settings?.website_name,
    suffix: 'Professionelle Remote-Arbeit',
    loading: loading
  });

  // Dynamic colors from settings
  const primaryColor = settings?.primary_color || '#ee1d3c';
  const accentColor = settings?.accent_color || '#231f20';

  // Dynamic styles
  const dynamicStyles = {
    '--primary-color': primaryColor,
    '--accent-color': accentColor,
  } as React.CSSProperties;

  useEffect(() => {
    // Update favicon if available
    if (settings?.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = settings.favicon_url;
      } else {
        // Create favicon link if it doesn't exist
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = settings.favicon_url;
        document.head.appendChild(newFavicon);
      }
    }
  }, [settings?.favicon_url]);

  // Handle hash-based navigation when landing page loads
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace('#', '');
      // Wait a bit for the page to fully render
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, [location.hash, loading]); // Re-run when hash changes or loading completes

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWhatsAppClick = () => {
    // WhatsApp number and pre-filled message - now dynamic from settings
    const phoneNumber = settings?.contact_phone || '+4915123456789'; // Fallback to default if not set
    const websiteName = settings?.website_name;
    const message = `Hallo, ich möchte mich als App-Tester bei ${websiteName} bewerben!`;
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Open in new tab
    window.open(whatsappUrl, '_blank');
  };

  // Show loading state while settings are being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50/50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-dynamic mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Seite...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100" style={dynamicStyles}>
      {/* Header */}
      <Header 
        settings={settings}
        scrollToTop={scrollToTop}
        scrollToSection={scrollToSection}
        handleWhatsAppClick={handleWhatsAppClick}
      />

      {/* Hero Section */}
      <HeroSection 
        settings={settings}
        handleWhatsAppClick={handleWhatsAppClick}
      />

      {/* Intro Section */}
      <IntroSection />

      {/* Job Offers Section */}
      <JobOffersSection scrollToSection={scrollToSection} />

      {/* Benefits Section */}
      <BenefitsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section - Banner above footer */}
      <CTASection 
        settings={settings}
        handleWhatsAppClick={handleWhatsAppClick}
      />

      {/* Footer */}
      <Footer 
        settings={settings}
        scrollToTop={scrollToTop}
        scrollToSection={scrollToSection}
        handleWhatsAppClick={handleWhatsAppClick}
      />
    </div>
  );
}

export default LandingPage; 