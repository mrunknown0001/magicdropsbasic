import React from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { Header, Footer } from '../landing/components';

const AGB = () => {
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
      const message = encodeURIComponent('Hallo! Ich habe eine Frage bezüglich der AGB.');
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
          <p className="text-gray-500">Lade AGB...</p>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Allgemeine Geschäftsbedingungen</h1>
      
      {settings?.terms_content ? (
        // Use custom terms content if available
        <div 
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: settings.terms_content }}
        />
      ) : (
        // Fallback to dynamic template
        <div className="space-y-6 text-gray-600">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">1. Geltungsbereich</h2>
          <p>1.1 Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") gelten für alle Verträge zwischen der {settings?.company_name} (nachfolgend "Anbieter") und den Nutzern (nachfolgend "Mitarbeiter" oder "Sie") der {settings?.website_name} Plattform-Dienstleistungen (nachfolgend "Dienste").</p>
          
          <p className="mt-2">1.2 Abweichende Bedingungen des Mitarbeiters werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">2. Vertragsgegenstand</h2>
          <p>2.1 Der Anbieter bietet Mitarbeitern die Möglichkeit, als unabhängige Dienstleister über die {settings?.website_name} Plattform Bankdrop-Management-Aufgaben zu übernehmen und zu bearbeiten.</p>
          
          <p className="mt-2">2.2 Die genauen Leistungen, Vergütung und Arbeitszeiten werden in separaten Auftragsvereinbarungen festgelegt, die diese AGB ergänzen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">3. Registrierung und Vertragsschluss</h2>
          <p>3.1 Die Registrierung als Mitarbeiter erfolgt durch Ausfüllen und Absenden des Bewerbungsformulars auf der Website des Anbieters.</p>
          
          <p className="mt-2">3.2 Mit dem Absenden der Bewerbung gibt der Mitarbeiter ein Angebot zum Abschluss eines Rahmenvertrages ab. Der Anbieter nimmt dieses Angebot durch ausdrückliche Bestätigung oder durch Übersendung der ersten Aufgabe an.</p>
          
          <p className="mt-2">3.3 Der Anbieter behält sich das Recht vor, Bewerbungen ohne Angabe von Gründen abzulehnen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">4. Rechte und Pflichten des Mitarbeiters</h2>
          <p>4.1 Der Mitarbeiter verpflichtet sich, die ihm übertragenen Aufgaben sorgfältig, gewissenhaft und nach bestem Wissen und Gewissen durchzuführen.</p>
          
          <p className="mt-2">4.2 Der Mitarbeiter ist verpflichtet, die Aufgaben persönlich zu erbringen. Eine Übertragung an Dritte ist nicht gestattet.</p>
          
          <p className="mt-2">4.3 Der Mitarbeiter verpflichtet sich zur Verschwiegenheit über alle ihm im Rahmen seiner Tätigkeit bekannt gewordenen vertraulichen Informationen, insbesondere über Geschäftsgeheimnisse, Kundendaten und technische Details der Plattform.</p>
          
          <p className="mt-2">4.4 Der Mitarbeiter ist verpflichtet, seine Kontaktdaten aktuell zu halten und Änderungen unverzüglich mitzuteilen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">5. Rechte und Pflichten des Anbieters</h2>
          <p>5.1 Der Anbieter stellt dem Mitarbeiter alle notwendigen Informationen und Materialien zur Verfügung, die für die Durchführung der Aufgaben erforderlich sind.</p>
          
          <p className="mt-2">5.2 Der Anbieter verpflichtet sich, die vereinbarte Vergütung nach ordnungsgemäßer Durchführung der Aufgaben zu zahlen.</p>
          
          <p className="mt-2">5.3 Der Anbieter behält sich das Recht vor, die Qualität der durchgeführten Arbeiten zu überprüfen und bei mangelhafter Leistung Nachbesserungen zu verlangen oder die Vergütung angemessen zu kürzen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">6. Vergütung und Zahlungsbedingungen</h2>
          <p>6.1 Die Höhe der Vergütung richtet sich nach der jeweiligen Auftragsvereinbarung und wird in der Regel nach Stunden oder pro abgeschlossener Aufgabe berechnet.</p>
          
          <p className="mt-2">6.2 Die Abrechnung erfolgt monatlich. Der Mitarbeiter reicht hierzu eine Aufstellung der durchgeführten Arbeiten bzw. geleisteten Stunden ein.</p>
          
          <p className="mt-2">6.3 Die Zahlung erfolgt innerhalb von 14 Tagen nach Rechnungsstellung auf das vom Mitarbeiter angegebene Konto.</p>
          
          <p className="mt-2">6.4 Der Mitarbeiter ist für die Versteuerung seiner Einkünfte sowie für etwaige Sozialversicherungsbeiträge selbst verantwortlich.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">7. Laufzeit und Kündigung</h2>
          <p>7.1 Der Rahmenvertrag wird auf unbestimmte Zeit geschlossen und kann von beiden Seiten mit einer Frist von 14 Tagen zum Monatsende gekündigt werden.</p>
          
          <p className="mt-2">7.2 Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</p>
          
          <p className="mt-2">7.3 Die Kündigung bedarf der Textform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">8. Haftung</h2>
          <p>8.1 Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer vorsätzlichen oder fahrlässigen Pflichtverletzung des Anbieters, seiner gesetzlichen Vertreter oder Erfüllungsgehilfen beruhen.</p>
          
          <p className="mt-2">8.2 Für sonstige Schäden haftet der Anbieter nur, wenn sie auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Anbieters, seiner gesetzlichen Vertreter oder Erfüllungsgehilfen beruhen.</p>
          
          <p className="mt-2">8.3 Der Mitarbeiter haftet für Schäden, die er durch vorsätzliche oder grob fahrlässige Verletzung seiner Pflichten verursacht.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">9. Datenschutz</h2>
          <p>9.1 Der Anbieter erhebt und verarbeitet personenbezogene Daten des Mitarbeiters gemäß seiner Datenschutzerklärung, die unter <Link to="/legal/datenschutz" className="text-[#f4a261] hover:text-[#e76f51] underline">Datenschutzerklärung</Link> eingesehen werden kann.</p>
          
          <p className="mt-2">9.2 Der Mitarbeiter verpflichtet sich, alle datenschutzrechtlichen Bestimmungen einzuhalten und insbesondere personenbezogene Daten, die ihm im Rahmen seiner Tätigkeit bekannt werden, vertraulich zu behandeln.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">10. Schlussbestimmungen</h2>
          <p>10.1 Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</p>
          
          <p className="mt-2">10.2 Erfüllungsort und Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist {settings?.city || 'Berlin'}, soweit der Mitarbeiter Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.</p>
          
          <p className="mt-2">10.3 Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
          
          <p className="mt-2">10.4 Änderungen oder Ergänzungen dieser AGB bedürfen der Textform. Dies gilt auch für die Änderung dieser Textformklausel.</p>
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

export default AGB; 