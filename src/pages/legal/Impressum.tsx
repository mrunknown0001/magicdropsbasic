import React from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { Header, Footer } from '../landing/components';

const Impressum = () => {
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
      const message = encodeURIComponent('Hallo! Ich habe eine Frage bezüglich des Impressums.');
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
            <p className="text-gray-500">Lade Impressum...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Impressum</h1>
        
        {settings?.impressum_content ? (
          // Use custom impressum content if available
          <div 
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: settings.impressum_content }}
          />
        ) : (
          // Fallback to dynamic template
          <div className="space-y-6 text-gray-600">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Angaben gemäß § 5 TMG</h2>
              <p>
                {settings?.company_name}<br />
                {settings?.company_address || '[Firmenadresse nicht konfiguriert]'}<br />
                {settings?.postal_code || '[PLZ]'} {settings?.city || '[Stadt]'}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Vertreten durch</h2>
              <p>Geschäftsführer: {settings?.managing_director || '[Geschäftsführer nicht konfiguriert]'}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Kontakt</h2>
              <p>
                {(settings?.contact_phone || settings?.support_phone) && (
                  <>Telefon: {settings?.contact_phone || settings?.support_phone}<br /></>
                )}
                {(settings?.contact_email || settings?.support_email) && (
                  <>E-Mail: {settings?.contact_email || settings?.support_email}</>
                )}
                {!settings?.contact_phone && !settings?.support_phone && !settings?.contact_email && !settings?.support_email && (
                  <span className="text-red-600 dark:text-red-400 text-sm">
                    [Kontaktdaten nicht konfiguriert - bitte in den Einstellungen ergänzen]
                  </span>
                )}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Registereintrag</h2>
              <p>
                Eintragung im Handelsregister.<br />
                Registergericht: {settings?.court_location || '[Registergericht nicht konfiguriert]'}<br />
                Registernummer: {settings?.registration_number || '[Registernummer nicht konfiguriert]'}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Umsatzsteuer-ID</h2>
              <p>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                {settings?.euid || '[Umsatzsteuer-ID nicht konfiguriert]'}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <p>
                {settings?.responsible_person || settings?.managing_director || '[Verantwortliche Person nicht konfiguriert]'}<br />
                {settings?.company_address || '[Firmenadresse nicht konfiguriert]'}<br />
                {settings?.postal_code || '[PLZ]'} {settings?.city || '[Stadt]'}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Streitschlichtung</h2>
              <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-[#f4a261] hover:text-[#e76f51] underline">https://ec.europa.eu/consumers/odr/</a>.<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
              
              <p className="mt-2">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Haftung für Inhalte</h2>
              <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
              
              <p className="mt-2">Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Haftung für Links</h2>
              <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.</p>
              
              <p className="mt-2">Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Urheberrecht</h2>
              <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.</p>
              
              <p className="mt-2">Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.</p>
            </section>
          </div>
        )}

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

export default Impressum; 