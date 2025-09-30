import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiChevronDown, FiChevronUp, FiUser, FiFileText, FiCreditCard, FiPhone, FiShield, FiSettings } from 'react-icons/fi';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

// FAQ Item component
interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  icon?: React.ReactNode;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left focus:outline-none"
      >
        <div className="flex items-center">
          {icon && <span className="mr-3 text-accent">{icon}</span>}
          <span className="font-app font-app-medium text-gray-900 dark:text-white">{question}</span>
        </div>
        <span className="ml-6 flex-shrink-0 text-accent">
          {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </span>
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="pb-4 text-gray-600 dark:text-gray-300 pl-9"
        >
          {answer}
        </motion.div>
      )}
    </div>
  );
};

// FAQ Category component
interface FAQCategoryProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const FAQCategory: React.FC<FAQCategoryProps> = ({ title, icon, children }) => {
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="h-1 w-full bg-accent dark:bg-accent/80"></div>
      <div className="p-6">
        <h2 className="text-xl font-app font-app-medium text-gray-900 dark:text-white mb-4 flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </h2>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {children}
        </div>
      </div>
    </Card>
  );
};

const Support: React.FC = () => {

  // Employee FAQs for account management
  const accountFAQs = (
    <>
      <FAQCategory title="Profil & Konto" icon={<FiUser size={20} className="text-accent" />}>
        <FAQItem
          question="Wie kann ich mein Passwort ändern?"
          answer={
            <div className="space-y-2">
              <p>Um Ihr Passwort zu ändern, folgen Sie diesen Schritten:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu Ihrem Profil, indem Sie auf Ihren Namen in der oberen rechten Ecke klicken und "Profil" auswählen</li>
                <li>Klicken Sie auf die Schaltfläche "Passwort ändern" neben "Profil bearbeiten"</li>
                <li>Geben Sie Ihr aktuelles Passwort und zweimal Ihr neues Passwort ein</li>
                <li>Klicken Sie auf "Passwort ändern", um den Vorgang abzuschließen</li>
              </ol>
            </div>
          }
          icon={<FiSettings size={18} />}
        />
        <FAQItem
          question="Wie kann ich meine persönlichen Daten aktualisieren?"
          answer={
            <div className="space-y-2">
              <p>Um Ihre persönlichen Daten zu aktualisieren:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu Ihrem Profil, indem Sie auf Ihren Namen in der oberen rechten Ecke klicken und "Profil" auswählen</li>
                <li>Klicken Sie auf die Schaltfläche "Profil bearbeiten"</li>
                <li>Aktualisieren Sie Ihre Informationen in den verschiedenen Tabs (Persönliche Daten, Adresse, Finanzielle Daten, Lohnabrechnung)</li>
                <li>Klicken Sie auf "Speichern", um Ihre Änderungen zu übernehmen</li>
              </ol>
            </div>
          }
          icon={<FiUser size={18} />}
        />
        <FAQItem
          question="Wie verifiziere ich meine Identität?"
          answer={
            <div className="space-y-2">
              <p>Um Ihre Identität zu verifizieren:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zur Seite "Identitätsverifizierung", indem Sie entweder:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Auf die Schaltfläche "Zur Verifizierung" im gelben Banner oben auf Ihrer Profilseite klicken, oder</li>
                    <li>Zum Abschnitt "Identitätsverifizierung" am Ende Ihrer Profilseite scrollen</li>
                  </ul>
                </li>
                <li>Wählen Sie einen Ausweistyp (Personalausweis, Reisepass oder Führerschein)</li>
                <li>Laden Sie klare Fotos oder Scans Ihrer Dokumente hoch</li>
                <li>Klicken Sie auf "Dokumente einreichen", um den Verifizierungsprozess zu starten</li>
              </ol>
              <p>Ihr Verifizierungsstatus wird aktualisiert, sobald Ihre Dokumente überprüft wurden.</p>
            </div>
          }
          icon={<FiShield size={18} />}
        />
      </FAQCategory>
    </>
  );

  // Task and project FAQs
  const taskFAQs = (
    <>
      <FAQCategory title="Aufgaben & Projekte" icon={<FiFileText size={20} className="text-accent" />}>
        <FAQItem
          question="Wie nehme ich eine neue Aufgabe an?"
          answer={
            <div className="space-y-2">
              <p>Um eine neue Aufgabe anzunehmen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Aufgaben" im Hauptmenü</li>
                <li>Im Tab "Verfügbare Aufgaben" sehen Sie alle Aufgaben, die Sie annehmen können</li>
                <li>Klicken Sie auf eine Aufgabe, um Details anzuzeigen</li>
                <li>Klicken Sie auf "Aufgabe annehmen", um mit der Arbeit zu beginnen</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie reiche ich eine abgeschlossene Aufgabe ein?"
          answer={
            <div className="space-y-2">
              <p>Um eine abgeschlossene Aufgabe einzureichen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Aufgaben" im Hauptmenü</li>
                <li>Wählen Sie die Aufgabe aus dem Tab "In Bearbeitung"</li>
                <li>Folgen Sie den Anweisungen auf dem Bildschirm, um alle erforderlichen Informationen einzugeben</li>
                <li>Laden Sie alle notwendigen Nachweise hoch (falls erforderlich)</li>
                <li>Klicken Sie auf "Aufgabe abschließen", um Ihre Arbeit einzureichen</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie führe ich einen Videoanruf für eine Aufgabe durch?"
          answer={
            <div className="space-y-2">
              <p>Für Aufgaben, die einen Videoanruf erfordern:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Öffnen Sie die entsprechende Aufgabe in "Meine Aufgaben"</li>
                <li>Navigieren Sie zum Schritt, der den Videoanruf erfordert</li>
                <li>Klicken Sie auf "Videoanruf starten", wenn Sie bereit sind</li>
                <li>Erlauben Sie den Zugriff auf Kamera und Mikrofon, wenn Sie dazu aufgefordert werden</li>
                <li>Nach dem Anruf können Sie Ihre Bewertung abgeben und zum nächsten Schritt übergehen</li>
              </ol>
            </div>
          }
          icon={<FiPhone size={18} />}
        />
      </FAQCategory>

      <FAQCategory title="Verträge & Zahlungen" icon={<FiCreditCard size={20} className="text-accent" />}>
        <FAQItem
          question="Wie kann ich meine Verträge einsehen?"
          answer={
            <div className="space-y-2">
              <p>Um Ihre Verträge einzusehen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Verträge" im Hauptmenü</li>
                <li>Hier finden Sie eine Liste aller Ihrer Verträge mit ihrem aktuellen Status</li>
                <li>Klicken Sie auf einen Vertrag, um die Details anzuzeigen</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie unterschreibe ich einen neuen Vertrag?"
          answer={
            <div className="space-y-2">
              <p>Um einen neuen Vertrag zu unterschreiben:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Verträge" im Hauptmenü</li>
                <li>Suchen Sie den Vertrag mit dem Status "Ausstehend"</li>
                <li>Öffnen Sie den Vertrag und lesen Sie ihn sorgfältig durch</li>
                <li>Scrollen Sie zum Ende des Dokuments</li>
                <li>Klicken Sie auf "Unterschreiben", wenn Sie mit den Bedingungen einverstanden sind</li>
                <li>Folgen Sie den Anweisungen, um Ihre elektronische Unterschrift zu erstellen</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie sehe ich meine Zahlungshistorie ein?"
          answer={
            <div className="space-y-2">
              <p>Um Ihre Zahlungshistorie einzusehen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Aufgaben" im Hauptmenü</li>
                <li>Wechseln Sie zum Tab "Abgeschlossen"</li>
                <li>Hier sehen Sie alle abgeschlossenen Aufgaben mit den entsprechenden Zahlungsbeträgen</li>
                <li>Für detailliertere Informationen können Sie sich an den Support wenden</li>
              </ol>
            </div>
          }
          icon={<FiCreditCard size={18} />}
        />
      </FAQCategory>
    </>
  );

  // Contract and payment FAQs
  const contractFAQs = (
    <>
      <FAQCategory title="Verträge & Zahlungen" icon={<FiCreditCard size={20} className="text-accent" />}>
        <FAQItem
          question="Wie kann ich meine Verträge einsehen?"
          answer={
            <div className="space-y-2">
              <p>Um Ihre Verträge einzusehen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Verträge" im Hauptmenü</li>
                <li>Hier finden Sie eine Liste aller Ihrer Verträge mit ihrem aktuellen Status</li>
                <li>Klicken Sie auf einen Vertrag, um die Details anzuzeigen</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie unterschreibe ich einen neuen Vertrag?"
          answer={
            <div className="space-y-2">
              <p>Um einen neuen Vertrag zu unterschreiben:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Verträge" im Hauptmenü</li>
                <li>Suchen Sie den Vertrag mit dem Status "Ausstehend"</li>
                <li>Öffnen Sie den Vertrag und lesen Sie ihn sorgfältig durch</li>
                <li>Scrollen Sie zum Ende des Dokuments</li>
                <li>Klicken Sie auf "Unterschreiben", wenn Sie mit den Bedingungen einverstanden sind</li>
                <li>Folgen Sie den Anweisungen, um Ihre elektronische Unterschrift zu erstellen</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie sehe ich meine Zahlungshistorie ein?"
          answer={
            <div className="space-y-2">
              <p>Um Ihre Zahlungshistorie einzusehen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Meine Aufgaben" im Hauptmenü</li>
                <li>Wechseln Sie zum Tab "Abgeschlossen"</li>
                <li>Hier sehen Sie alle abgeschlossenen Aufgaben mit den entsprechenden Zahlungsbeträgen</li>
                <li>Für detailliertere Informationen können Sie sich an den Support wenden</li>
              </ol>
            </div>
          }
          icon={<FiCreditCard size={18} />}
        />
        <FAQItem
          question="Wann erhalte ich meine Zahlung für abgeschlossene Aufgaben?"
          answer={
            <div className="space-y-2">
              <p>Der Zahlungsprozess für abgeschlossene Aufgaben funktioniert wie folgt:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Nach erfolgreicher Überprüfung Ihrer eingereichten Aufgabe wird die Zahlung freigegeben</li>
                <li>Zahlungen werden in der Regel innerhalb von 3-5 Werktagen nach Freigabe auf Ihr hinterlegtes Bankkonto überwiesen</li>
                <li>Sie erhalten eine Benachrichtigung, sobald die Zahlung veranlasst wurde</li>
                <li>Alle Zahlungen werden in Ihrer Zahlungshistorie aufgeführt</li>
              </ol>
              <p>Bei Fragen zu Ihren Zahlungen wenden Sie sich bitte an den Support.</p>
            </div>
          }
          icon={<FiCreditCard size={18} />}
        />
        <FAQItem
          question="Was passiert, wenn ich einen Vertrag ablehne?"
          answer={
            <div className="space-y-2">
              <p>Wenn Sie einen Vertrag ablehnen:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Der Vertrag wird als "Abgelehnt" markiert</li>
                <li>Sie können optional einen Grund für die Ablehnung angeben</li>
                <li>Das Admin-Team wird über Ihre Entscheidung informiert</li>
                <li>Sie können möglicherweise keinen Zugriff auf bestimmte Aufgaben haben, die diesen Vertrag erfordern</li>
                <li>In einigen Fällen kann ein alternativer Vertrag angeboten werden</li>
              </ul>
              <p>Wenn Sie Fragen zu einem Vertrag haben, empfehlen wir, vor der Ablehnung den Support zu kontaktieren.</p>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
      </FAQCategory>
    </>
  );

  return (
    <div className="space-y-8 w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-app font-app-semibold text-gray-900 dark:text-white flex items-center">
              <FiHelpCircle className="mr-2" size={24} />
              Hilfe & Support
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Hier finden Sie Antworten auf häufig gestellte Fragen und Hilfe zur Nutzung der Plattform.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Account management FAQs */}
      {accountFAQs}

      {/* Task FAQs */}
      {taskFAQs}
      
      {/* Contract FAQs */}
      {contractFAQs}

      {/* Contact Support Section */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1 w-full bg-accent dark:bg-accent/80"></div>
        <div className="p-6">
          <h2 className="text-xl font-app font-app-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <FiHelpCircle size={20} className="text-accent mr-2" />
            <span>Kontakt zum Support</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Haben Sie eine Frage, die hier nicht beantwortet wird? Kontaktieren Sie unseren Support.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="font-app font-app-medium text-gray-900 dark:text-white">Support-Team</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Montag bis Freitag, 9:00 - 17:00 Uhr</p>
              </div>
              <div className="mt-4 md:mt-0">
                <a 
                  href="mailto:support@magicdrops.de" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-app font-app-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                >
                  E-Mail an Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Support;
