import React from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { Header, Footer } from '../landing/components';

const Datenschutz = () => {
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
      const message = encodeURIComponent('Hallo! Ich habe eine Frage bezüglich der Datenschutzerklärung.');
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
            <p className="text-gray-500">Lade Datenschutzerklärung...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
        
        {settings?.privacy_policy_content ? (
          // Use custom privacy policy content if available
          <div 
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: settings.privacy_policy_content }}
          />
        ) : (
          // Fallback to dynamic template
          <div className="space-y-6 text-gray-600">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">1. Datenschutz auf einen Blick</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Allgemeine Hinweise</h3>
              <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Datenerfassung auf dieser Website</h3>
              <p><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
              <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.</p>
              
              <p className="mt-2"><strong>Wie erfassen wir Ihre Daten?</strong></p>
              <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben.</p>
              <p>Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.</p>
              
              <p className="mt-2"><strong>Wofür nutzen wir Ihre Daten?</strong></p>
              <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.</p>
              
              <p className="mt-2"><strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong></p>
              <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.</p>
              <p>Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">2. Hosting</h2>
              <p>Wir hosten die Inhalte unserer Website bei folgendem Anbieter:</p>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Externes Hosting</h3>
              <p>Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.</p>
              <p>Das externe Hosting erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren potenziellen und bestehenden Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO). Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG, soweit die Einwilligung die Speicherung von Cookies oder den Zugriff auf Informationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des TTDSG umfasst. Die Einwilligung ist jederzeit widerrufbar.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">3. Allgemeine Hinweise und Pflichtinformationen</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Datenschutz</h3>
              <p>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
              <p>Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.</p>
              <p>Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.</p>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Hinweis zur verantwortlichen Stelle</h3>
              <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
              <p>
                {settings?.company_name}<br />
                {settings?.company_address || '[Firmenadresse nicht konfiguriert]'}<br />
                {settings?.postal_code || '[PLZ]'} {settings?.city || '[Stadt]'}
              </p>
              <p>
                {(settings?.contact_phone || settings?.support_phone) && (
                  <>Telefon: {settings?.contact_phone || settings?.support_phone}<br /></>
                )}
                {(settings?.privacy_contact_email || settings?.contact_email || settings?.support_email) && (
                  <>E-Mail: {settings?.privacy_contact_email || settings?.contact_email || settings?.support_email}</>
                )}
                {!settings?.contact_phone && !settings?.support_phone && !settings?.privacy_contact_email && !settings?.contact_email && !settings?.support_email && (
                  <span className="text-red-600 dark:text-red-400 text-sm">
                    [Kontaktdaten nicht konfiguriert - bitte in den Einstellungen ergänzen]
                  </span>
                )}
              </p>
              <p>Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">4. Datenerfassung auf dieser Website</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Cookies</h3>
              <p>Unsere Internetseiten verwenden so genannte "Cookies". Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch gelöscht. Permanente Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese selbst löschen oder eine automatische Löschung durch Ihren Webbrowser erfolgt.</p>
              <p>Teilweise können auch Cookies von Drittunternehmen auf Ihrem Endgerät gespeichert werden, wenn Sie unsere Seite betreten (Third-Party-Cookies). Diese ermöglichen uns oder Ihnen die Nutzung bestimmter Dienstleistungen des Drittunternehmens (z. B. Cookies zur Abwicklung von Zahlungsdienstleistungen).</p>
              <p>Cookies haben verschiedene Funktionen. Zahlreiche Cookies sind technisch notwendig, da bestimmte Websitefunktionen ohne diese nicht funktionieren würden (z. B. die Warenkorbfunktion oder die Anzeige von Videos). Andere Cookies dienen dazu, das Nutzerverhalten auszuwerten oder Werbung anzuzeigen.</p>
              <p>Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs, zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen (z. B. für die Warenkorbfunktion) oder zur Optimierung der Website (z. B. Cookies zur Messung des Webpublikums) erforderlich sind (notwendige Cookies), werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine andere Rechtsgrundlage angegeben wird. Der Websitebetreiber hat ein berechtigtes Interesse an der Speicherung von notwendigen Cookies zur technisch fehlerfreien und optimierten Bereitstellung seiner Dienste. Sofern eine Einwilligung zur Speicherung von Cookies und vergleichbaren Wiedererkennungstechnologien abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage dieser Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG); die Einwilligung ist jederzeit widerrufbar.</p>
              <p>Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und Cookies nur im Einzelfall erlauben, die Annahme von Cookies für bestimmte Fälle oder generell ausschließen sowie das automatische Löschen der Cookies beim Schließen des Browsers aktivieren. Bei der Deaktivierung von Cookies kann die Funktionalität dieser Website eingeschränkt sein.</p>
              <p>Soweit Cookies von Drittunternehmen oder zu Analysezwecken eingesetzt werden, werden wir Sie hierüber im Rahmen dieser Datenschutzerklärung gesondert informieren und ggf. eine Einwilligung abfragen.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">5. Plattform-spezifische Datenverarbeitung</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Mitarbeiter-Dashboard</h3>
              <p>Wenn Sie sich als Mitarbeiter auf unserer Plattform registrieren, erheben wir zusätzliche Daten, die für die Durchführung der Arbeitsaufträge erforderlich sind. Dazu gehören:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Persönliche Identifikationsdaten (Name, Adresse, Geburtsdatum)</li>
                <li>Kontaktinformationen (E-Mail, Telefonnummer)</li>
                <li>Bankverbindung für Auszahlungen</li>
                <li>Arbeitszeiten und Leistungsdaten</li>
                <li>Kommunikationsdaten innerhalb der Plattform</li>
              </ul>
              <p className="mt-2">Diese Daten werden ausschließlich zur Vertragserfüllung und Abrechnung verwendet und nicht an Dritte weitergegeben.</p>
              
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Aufgabenverwaltung</h3>
              <p>Zur Verwaltung und Zuweisung von Arbeitsaufgaben speichern wir Informationen über:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Zugewiesene Aufgaben und deren Status</li>
                <li>Arbeitsfortschritt und Ergebnisse</li>
                <li>Kommunikation zwischen Mitarbeitern und Administratoren</li>
                <li>Zeiterfassung und Leistungsbewertungen</li>
              </ul>
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

export default Datenschutz; 