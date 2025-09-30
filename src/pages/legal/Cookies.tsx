import React from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { Header, Footer } from '../landing/components';

const Cookies = () => {
  const { settings, loading } = usePublicSettings();

  // Scroll functions for header/footer navigation
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    // On legal pages, just scroll to top since there are no sections
    scrollToTop();
  };

  const handleWhatsAppClick = () => {
    if (settings?.contact_phone) {
      const message = encodeURIComponent('Hallo! Ich habe eine Frage bezüglich der Cookie-Richtlinie.');
      window.open(`https://wa.me/${settings.contact_phone}?text=${message}`, '_blank');
    }
  };

  if (loading) {
    return (
      <>
        <Header 
          settings={settings} 
          scrollToTop={scrollToTop}
          scrollToSection={scrollToSection}
          handleWhatsAppClick={handleWhatsAppClick}
        />
        <div className="max-w-4xl mx-auto px-4 py-12 min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Lade Cookie-Richtlinie...</p>
          </div>
        </div>
        <Footer 
          settings={settings} 
          scrollToTop={scrollToTop}
          scrollToSection={scrollToSection}
          handleWhatsAppClick={handleWhatsAppClick}
        />
      </>
    );
  }

  return (
    <>
      <Header 
        settings={settings} 
        scrollToTop={scrollToTop}
        scrollToSection={scrollToSection}
        handleWhatsAppClick={handleWhatsAppClick}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-12 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cookie-Richtlinie</h1>
        
        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Was sind Cookies?</h2>
            <p>Cookies sind kleine Textdateien, die von Websites auf Ihrem Computer oder mobilen Gerät gespeichert werden. Sie werden häufig verwendet, um Websites funktionsfähig zu machen oder effizienter zu gestalten, sowie um Informationen an die Eigentümer der Website zu übermitteln.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Wie verwenden wir Cookies?</h2>
            <p>{settings?.company_name || settings?.website_name || 'Diese Website'} verwendet Cookies für verschiedene Zwecke:</p>
            
            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Notwendige Cookies</h3>
            <p>Diese Cookies sind für das Funktionieren der Website unerlässlich. Sie ermöglichen grundlegende Funktionen wie Seitennavigation und Zugriff auf sichere Bereiche der Website. Die Website kann ohne diese Cookies nicht ordnungsgemäß funktionieren.</p>
            
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Authentifizierung und Sitzungsverwaltung</li>
              <li>Sicherheitsfeatures</li>
              <li>Grundlegende Website-Funktionalität</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Funktionale Cookies</h3>
            <p>Diese Cookies ermöglichen es der Website, erweiterte Funktionalität und Personalisierung bereitzustellen. Sie können von uns oder von Drittanbietern gesetzt werden, deren Dienste wir zu unseren Seiten hinzugefügt haben.</p>
            
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Benutzereinstellungen und Präferenzen</li>
              <li>Sprachauswahl</li>
              <li>Regionale Einstellungen</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Analytische Cookies</h3>
            <p>Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren, indem sie Informationen anonym sammeln und melden. Dies hilft uns, die Website zu verbessern.</p>
            
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Besucherzahlen und Traffic-Quellen</li>
              <li>Beliebte Seiten und Inhalte</li>
              <li>Nutzungsverhalten und Navigation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Spezifische Cookies auf unserer Website</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cookie-Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Zweck</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dauer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm">session_token</td>
                    <td className="px-4 py-2 text-sm">Benutzerauthentifizierung</td>
                    <td className="px-4 py-2 text-sm">Sitzung</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm">user_preferences</td>
                    <td className="px-4 py-2 text-sm">Speichert Benutzereinstellungen</td>
                    <td className="px-4 py-2 text-sm">30 Tage</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm">analytics_id</td>
                    <td className="px-4 py-2 text-sm">Website-Analyse</td>
                    <td className="px-4 py-2 text-sm">2 Jahre</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Ihre Cookie-Einstellungen verwalten</h2>
            <p>Sie haben verschiedene Möglichkeiten, Cookies zu verwalten und zu kontrollieren:</p>
            
            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Browser-Einstellungen</h3>
            <p>Die meisten Webbrowser ermöglichen es Ihnen, Cookies über die Browsereinstellungen zu kontrollieren. Sie können:</p>
            
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Alle Cookies blockieren</li>
              <li>Nur Cookies von Drittanbietern blockieren</li>
              <li>Alle Cookies löschen, wenn Sie den Browser schließen</li>
              <li>Bestimmte Websites auf eine "Whitelist" setzen</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Auswirkungen der Cookie-Deaktivierung</h3>
            <p>Bitte beachten Sie, dass die Deaktivierung von Cookies die Funktionalität unserer Website beeinträchtigen kann. Insbesondere:</p>
            
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Sie können sich möglicherweise nicht anmelden</li>
              <li>Ihre Einstellungen werden nicht gespeichert</li>
              <li>Einige Features funktionieren möglicherweise nicht ordnungsgemäß</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Drittanbieter-Cookies</h2>
            <p>Unsere Website kann auch Cookies von Drittanbietern verwenden, um zusätzliche Funktionen bereitzustellen:</p>
            
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Supabase:</strong> Für Authentifizierung und Datenbankfunktionen</li>
              <li><strong>Analytics-Dienste:</strong> Für Website-Statistiken</li>
              <li><strong>CDN-Anbieter:</strong> Für verbesserte Ladezeiten</li>
            </ul>
            
            <p className="mt-2">Diese Drittanbieter haben ihre eigenen Datenschutzrichtlinien, die unabhängig von unseren sind.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Aktualisierungen dieser Richtlinie</h2>
            <p>Wir können diese Cookie-Richtlinie von Zeit zu Zeit aktualisieren, um Änderungen in unseren Praktiken oder aus anderen betrieblichen, rechtlichen oder regulatorischen Gründen zu berücksichtigen. Wir empfehlen Ihnen, diese Seite regelmäßig zu besuchen, um über unsere Verwendung von Cookies informiert zu bleiben.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Kontakt</h2>
            <p>Wenn Sie Fragen zu unserer Verwendung von Cookies haben, können Sie uns kontaktieren:</p>
            <p className="mt-2">
              {(settings?.privacy_contact_email || settings?.contact_email || settings?.support_email) && (
                <>E-Mail: {settings?.privacy_contact_email || settings?.contact_email || settings?.support_email}<br /></>
              )}
              {(settings?.contact_phone || settings?.support_phone) && (
                <>Telefon: {settings?.contact_phone || settings?.support_phone}</>
              )}
              {!settings?.contact_phone && !settings?.support_phone && !settings?.privacy_contact_email && !settings?.contact_email && !settings?.support_email && (
                <span className="text-red-600 dark:text-red-400 text-sm">
                  [Kontaktdaten nicht konfiguriert - bitte in den Einstellungen ergänzen]
                </span>
              )}
            </p>
          </section>
        </div>

        <div className="mt-12">
          <Link to="/" className="text-[#f4a261] hover:text-[#e76f51] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Zurück zur Startseite
          </Link>
        </div>
      </div>

      <Footer 
        settings={settings} 
        scrollToTop={scrollToTop}
        scrollToSection={scrollToSection}
        handleWhatsAppClick={handleWhatsAppClick}
      />
    </>
  );
};

export default Cookies; 