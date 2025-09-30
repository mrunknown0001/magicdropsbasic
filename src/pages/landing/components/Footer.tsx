import { Building, Mail, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface FooterProps {
  settings: any;
  scrollToTop: () => void;
  scrollToSection: (sectionId: string) => void;
  handleWhatsAppClick: () => void;
}

function Footer({ settings, scrollToTop, scrollToSection }: FooterProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on the landing page
  const isOnLandingPage = location.pathname === '/';

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
  };

  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: `linear-gradient(90deg, var(--primary-color), var(--accent-color), var(--primary-color))` }}
        ></div>
        <div 
          className="absolute bottom-0 right-0 w-96 h-96 opacity-10 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, var(--primary-color), transparent)` }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Company Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                {settings?.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt="Company Logo"
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))` }}
                  >
                    <Building className="h-7 w-7 text-white" />
                  </div>
                )}
                <div>
                  <div className="text-2xl font-bold text-white">
                    {settings?.website_name || 'Company Name'}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">Remote Karriere Solutions</div>
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed mb-8 max-w-md">
                Ihre Plattform für professionelle Remote-Arbeit. Attraktive Vergütung, 
                maximale Flexibilität und ein Team, das Sie unterstützt.
              </p>
              
              {/* Trust Elements */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Zertifiziert & Geprüft</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">98% Zufriedenheit</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">
                Navigation
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Startseite', action: 'top' },
                  { label: 'Vorteile', action: 'vorteile' },
                  { label: 'Arbeitsmodelle', action: 'positionen' },
                  { label: 'Erfahrungsberichte', action: 'testimonials' },
                  { label: 'Häufige Fragen', action: 'faq' }
                ].map((item, index) => (
                  <li key={index}>
                    <button 
                      onClick={() => handleNavigation(item.action)}
                      className="text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium flex items-center group"
                    >
                      <div className="w-1 h-1 bg-gray-500 group-hover:bg-white rounded-full mr-3 transition-colors duration-200"></div>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Contact */}
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">
                Rechtliches
              </h4>
              
              <ul className="space-y-3 mb-8">
                {[
                  { label: 'Impressum', path: '/legal/impressum' },
                  { label: 'Datenschutz', path: '/legal/datenschutz' },
                  { label: 'AGB', path: '/legal/agb' },
                  { label: 'Cookies', path: '/legal/cookies' }
                ].map((item, index) => (
                  <li key={index}>
                    <Link 
                      to={item.path}
                      className="text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium flex items-center group"
                    >
                      <div className="w-1 h-1 bg-gray-500 group-hover:bg-white rounded-full mr-3 transition-colors duration-200"></div>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${settings?.contact_email || 'info@company.com'}`} 
                     className="text-gray-300 hover:text-white transition-colors text-sm">
                    {settings?.contact_email || 'info@company.com'}
                  </a>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">
                    Mo-Fr: 9-18 Uhr
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © 2025 {settings?.company_name || settings?.website_name || 'Company Name'}. Alle Rechte vorbehalten.
            </div>
            <div className="text-gray-500 text-xs">
              Professionelle Remote-Arbeit • Made in Germany
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 