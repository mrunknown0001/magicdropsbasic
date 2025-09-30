import { Building, Mail, Phone, Menu, X, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface HeaderProps {
  settings: any;
  scrollToTop: () => void;
  scrollToSection: (sectionId: string) => void;
  handleWhatsAppClick: () => void;
}

function Header({ settings, scrollToTop, scrollToSection, handleWhatsAppClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if we're on the landing page
  const isOnLandingPage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleApplyClick = () => {
    navigate('/bewerbung');
    setIsMobileMenuOpen(false);
  };

  // Handle navigation - either scroll on landing page or navigate to landing page with section
  const handleNavigation = (action: 'top' | string) => {
    if (isOnLandingPage) {
      // We're on the landing page, use scroll functions
      if (action === 'top') {
        scrollToTop();
      } else {
        scrollToSection(action);
      }
    } else {
      // We're on a subpage, navigate to landing page with hash
      if (action === 'top') {
        navigate('/');
      } else {
        navigate(`/#${action}`);
        // After navigation, try to scroll to section
        setTimeout(() => {
          const element = document.getElementById(action);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { label: 'Home', action: 'top' },
    { label: 'Vorteile', action: 'vorteile' },
    { label: 'Jobs', action: 'positionen' },
    { label: 'Bewertungen', action: 'testimonials' },
    { label: 'FAQ', action: 'faq' },
  ];

  return (
    <>
      {/* Minimal Top Bar */}
      <div className="bg-gray-100 border-b border-gray-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-dynamic via-accent-dynamic to-primary-dynamic"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            {/* Left side - Trust indicator */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Jetzt einsteigen</span>
              </div>
              <span className="text-xs text-gray-500 hidden sm:inline">
                Über 1.200 aktive Remote-Mitarbeiter • Durchschnitt 2.800€/Monat
              </span>
            </div>
            
            {/* Right side - Key benefits */}
            <div className="flex items-center space-x-4 text-xs">
              <a 
                href={`mailto:${settings?.contact_email}`} 
                className="hidden md:flex items-center space-x-1.5 text-gray-500 hover:text-primary-dynamic transition-colors group"
              >
                <Mail className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                <span>{settings?.contact_email}</span>
              </a>
              <div className="hidden lg:flex items-center space-x-1.5 text-gray-500">
                <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <span>Sofortiger Einstieg möglich</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Main Navigation */}
      <nav className={`bg-white sticky top-0 z-50 border-b border-gray-200 transition-all duration-300 ${
        isScrolled 
          ? 'shadow-lg shadow-gray-900/8 py-3' 
          : 'shadow-md shadow-gray-900/5 py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <button 
              onClick={() => handleNavigation('top')}
              className="flex items-center space-x-3 group"
            >
              <div className="relative">
                {settings?.logo_url ? (
                  <div className="relative overflow-hidden rounded-xl">
                    <img 
                      src={settings.logo_url} 
                      alt={`${settings?.website_name} Logo`}
                      className={`object-contain transition-all duration-300 ${
                        isScrolled ? 'h-10 w-10' : 'h-12 w-12'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-dynamic/10 to-accent-dynamic/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  </div>
                ) : (
                  <div className={`bg-gradient-to-br from-primary-dynamic to-accent-dynamic rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-105 ${
                    isScrolled ? 'h-10 w-10' : 'h-12 w-12'
                  }`}>
                    <Building className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <h1 className={`font-bold text-gray-900 transition-all duration-300 group-hover:text-primary-dynamic ${
                  isScrolled ? 'text-lg' : 'text-xl'
                }`}>
                  {settings?.website_name}
                </h1>
                <p className="text-xs text-gray-500 font-medium text-left">Remote Karriere Solutions</p>
              </div>
            </button>

            {/* Navigation Links */}
            <div className="hidden lg:flex items-center space-x-2">
              {navItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.action)}
                  className="relative px-6 py-3 text-base font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-all duration-200 group"
                >
                  <span>{item.label}</span>
                  <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-primary-dynamic group-hover:w-8 group-hover:left-1/2 group-hover:-translate-x-1/2 transition-all duration-300 rounded-full"></div>
                </button>
              ))}
            </div>

            {/* CTA Section */}
            <div className="flex items-center space-x-3">
              {/* Primary CTA */}
              <button
                onClick={handleApplyClick}
                className="hidden sm:inline-flex items-center space-x-2 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                }}
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                <span className="relative z-10">Jetzt bewerben</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-700" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden absolute top-full left-0 right-0 bg-white shadow-xl border-t border-gray-100 transition-all duration-300 ${
          isMobileMenuOpen 
            ? 'opacity-100 translate-y-0 visible' 
            : 'opacity-0 -translate-y-4 invisible'
        }`}>
          <div className="px-6 py-6 space-y-1">
            {navItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.action)}
                className="flex items-center w-full text-left px-3 py-3 text-gray-700 hover:text-primary-dynamic hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
            
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleApplyClick}
                className="w-full text-white px-4 py-3 rounded-lg font-semibold text-sm shadow-md transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                }}
              >
                Jetzt bewerben
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Header; 