import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiChevronDown, FiChevronUp, FiUser, FiFileText, FiPhone, FiShield, FiSettings, FiDatabase, FiLayers } from 'react-icons/fi';
import Card from '../../components/ui/Card';

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

const AdminSupport: React.FC = () => {
  // Employee management FAQs
  const employeeFAQs = (
    <>
      <FAQCategory title="Mitarbeiterverwaltung" icon={<FiUser size={20} className="text-accent" />}>
        <FAQItem
          question="Wie kann ich Bewerbungen einsehen und verwalten?"
          answer={
            <div className="space-y-2">
              <p>Um Bewerbungen einzusehen und zu verwalten:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Bewerbungen" im Admin-Menü</li>
                <li>Hier sehen Sie alle eingegangenen Bewerbungen mit Status</li>
                <li>Klicken Sie auf eine Bewerbung, um Details anzuzeigen</li>
                <li>Sie können Bewerbungen "Genehmigen" oder "Ablehnen"</li>
                <li>Bei Genehmigung wird automatisch ein Mitarbeiterkonto erstellt</li>
              </ol>
            </div>
          }
          icon={<FiUser size={18} />}
        />
        <FAQItem
          question="Wie verwalte ich Mitarbeiter?"
          answer={
            <div className="space-y-2">
              <p>Um Mitarbeiter zu verwalten:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Mitarbeiter" im Admin-Menü</li>
                <li>Hier sehen Sie alle registrierten Mitarbeiter</li>
                <li>Klicken Sie auf einen Mitarbeiter, um dessen Profil anzuzeigen</li>
                <li>Sie können Profile bearbeiten, Kontaktdaten aktualisieren</li>
                <li>Nutzen Sie die Suchfunktion, um bestimmte Mitarbeiter zu finden</li>
              </ol>
            </div>
          }
          icon={<FiUser size={18} />}
        />
        <FAQItem
          question="Wie überprüfe ich KYC-Dokumente?"
          answer={
            <div className="space-y-2">
              <p>Um KYC-Dokumente zu überprüfen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "KYC-Prüfung" im Admin-Menü</li>
                <li>Hier sehen Sie alle eingereichten KYC-Dokumente</li>
                <li>Klicken Sie auf einen Eintrag, um die Dokumente zu überprüfen</li>
                <li>Prüfen Sie Personalausweis, Adressnachweis und andere Dokumente</li>
                <li>Klicken Sie auf "Genehmigen" oder "Ablehnen" je nach Prüfungsergebnis</li>
                <li>Bei Ablehnung können Sie einen Grund angeben</li>
              </ol>
              <p>Wichtig: Prüfen Sie sorgfältig, ob die Dokumente echt sind und die Angaben übereinstimmen.</p>
            </div>
          }
          icon={<FiShield size={18} />}
        />
      </FAQCategory>
    </>
  );

  // Task management FAQs
  const taskFAQs = (
    <>
      <FAQCategory title="Aufgabenverwaltung" icon={<FiFileText size={20} className="text-accent" />}>
        <FAQItem
          question="Wie erstelle ich Aufgabenvorlagen?"
          answer={
            <div className="space-y-2">
              <p>Um Aufgabenvorlagen zu erstellen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Aufträge" im Admin-Menü</li>
                <li>Klicken Sie auf "Neue Aufgabe erstellen"</li>
                <li>Geben Sie einen Titel und eine detaillierte Beschreibung ein</li>
                <li>Definieren Sie die erforderlichen Schritte</li>
                <li>Legen Sie den Zahlungsbetrag fest</li>
                <li>Wählen Sie die Priorität (Niedrig, Mittel, Hoch)</li>
                <li>Klicken Sie auf "Speichern"</li>
              </ol>
              <p>Tipp: Schreiben Sie klare, verständliche Anweisungen, um Verwirrung zu vermeiden.</p>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie überprüfe ich eingereichte Aufgaben?"
          answer={
            <div className="space-y-2">
              <p>Um eingereichte Aufgaben zu überprüfen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Aufgaben-Prüfung" im Admin-Menü</li>
                <li>Hier sehen Sie alle zur Überprüfung eingereichten Aufgaben</li>
                <li>Klicken Sie auf eine Einreichung, um Details anzuzeigen</li>
                <li>Überprüfen Sie die bereitgestellten Nachweise und Informationen</li>
                <li>Klicken Sie auf "Genehmigen" oder "Ablehnen"</li>
                <li>Bei Ablehnung fügen Sie Feedback hinzu, damit der Mitarbeiter korrigieren kann</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
        <FAQItem
          question="Wie verwalte ich Video-Chat Anfragen?"
          answer={
            <div className="space-y-2">
              <p>Um Video-Chat Anfragen zu verwalten:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Video-Chat Anfragen" im Admin-Menü</li>
                <li>Hier sehen Sie alle eingegangenen Video-Chat Anfragen</li>
                <li>Überprüfen Sie die Details der Anfrage</li>
                <li>Sie können Anfragen annehmen oder ablehnen</li>
                <li>Bei Annahme wird ein Video-Chat-Termin geplant</li>
              </ol>
            </div>
          }
          icon={<FiFileText size={18} />}
        />
      </FAQCategory>
    </>
  );

  // System management FAQs
  const systemFAQs = (
    <>
      <FAQCategory title="Systemverwaltung" icon={<FiDatabase size={20} className="text-accent" />}>
        <FAQItem
          question="Wie verwalte ich Telefonnummern?"
          answer={
            <div className="space-y-2">
              <p>Um Telefonnummern zu verwalten:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Telefonnummern" im Admin-Menü</li>
                <li>Hier können Sie neue Nummern mieten von verschiedenen Anbietern</li>
                <li>Wählen Sie Provider (SMS-Activate, GoGetSMS, etc.)</li>
                <li>Wählen Sie Service (WhatsApp, Telegram, etc.) und Land</li>
                <li>Klicken Sie auf "Nummer mieten"</li>
                <li>Verfolgen Sie den Status aller gemieteten Nummern</li>
                <li>Weisen Sie Nummern Mitarbeitern zu oder verwalten Sie sie zentral</li>
              </ol>
            </div>
          }
          icon={<FiPhone size={18} />}
        />
        <FAQItem
          question="Wie verwalte ich Bankdrops?"
          answer={
            <div className="space-y-2">
              <p>Um Bankdrops zu verwalten:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigieren Sie zu "Bankdrops" im Admin-Menü</li>
                <li>Hier sehen Sie alle verfügbaren Bankdrops</li>
                <li>Klicken Sie auf einen Bankdrop, um Details anzuzeigen</li>
                <li>Sie können Bankdrops Mitarbeitern zuweisen</li>
                <li>Verfolgen Sie den Status und die Nutzung</li>
              </ol>
            </div>
          }
          icon={<FiDatabase size={18} />}
        />
        <FAQItem
          question="Wie ändere ich Systemeinstellungen?"
          answer={
            <div className="space-y-2">
              <p>Die Systemeinstellungen finden Sie über das Zahnrad-Symbol im Header:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Klicken Sie auf das Einstellungen-Symbol (⚙️) im Header</li>
                <li>Hier können Sie verschiedene Bereiche verwalten:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><strong>Unternehmen:</strong> Firmenname und Website-Details</li>
                    <li><strong>Kontakt:</strong> E-Mail und Telefonnummern</li>
                    <li><strong>Logo:</strong> Firmenlogo hochladen</li>
                    <li><strong>Branding:</strong> Farben und Design anpassen</li>
                    <li><strong>KYC:</strong> KYC-Einstellungen verwalten</li>
                    <li><strong>Verträge:</strong> Vertragsvorlagen erstellen und bearbeiten</li>
                  </ul>
                </li>
                <li>Klicken Sie auf "Speichern", um Änderungen zu übernehmen</li>
              </ol>
            </div>
          }
          icon={<FiSettings size={18} />}
        />
        <FAQItem
          question="Wie erstelle ich Vertragsvorlagen?"
          answer={
            <div className="space-y-2">
              <p>Um Vertragsvorlagen zu erstellen:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Klicken Sie auf das Einstellungen-Symbol (⚙️) im Header</li>
                <li>Wählen Sie den Tab "Verträge"</li>
                <li>Klicken Sie auf "Neue Vorlage erstellen"</li>
                <li>Geben Sie einen Namen für die Vorlage ein</li>
                <li>Erstellen Sie den Vertragsinhalt im Editor</li>
                <li>Verwenden Sie Variablen wie &#123;&#123;mitarbeiterName&#125;&#125; für dynamische Inhalte</li>
                <li>Klicken Sie auf "Speichern"</li>
              </ol>
              <p>Tipp: Die Variablen werden automatisch mit den entsprechenden Mitarbeiterdaten ersetzt.</p>
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
              Administrator-Hilfe & Support
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Hier finden Sie Antworten auf häufig gestellte Fragen zur Verwaltung des Admin-Dashboards.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Employee management FAQs */}
      {employeeFAQs}

      {/* Task management FAQs */}
      {taskFAQs}

      {/* System management FAQs */}
      {systemFAQs}

      {/* Quick Reference Section */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1 w-full bg-accent dark:bg-accent/80"></div>
        <div className="p-6">
          <h2 className="text-xl font-app font-app-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <FiLayers size={20} className="text-accent mr-2" />
            <span>Schnellübersicht - Admin-Menü</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-app font-app-medium text-gray-900 dark:text-white mb-2">📊 Übersicht</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Dashboard - Hauptübersicht</li>
                <li>• Mitarbeiter - Alle Mitarbeiter</li>
                <li>• Bewerbungen - Neue Bewerbungen</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-app font-app-medium text-gray-900 dark:text-white mb-2">🔍 Prüfung</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Aufgaben-Prüfung</li>
                <li>• Video-Chat Anfragen</li>
                <li>• KYC-Prüfung</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-app font-app-medium text-gray-900 dark:text-white mb-2">⚙️ Verwaltung</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Aufträge - Aufgabenvorlagen</li>
                <li>• Telefonnummern</li>
                <li>• Bankdrops</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Tipp:</strong> Das Einstellungen-Symbol (⚙️) im Header führt zu den Systemeinstellungen für Unternehmen, Branding, Verträge und mehr.
            </p>
          </div>
        </div>
      </Card>

      {/* Contact Support Section */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1 w-full bg-accent dark:bg-accent/80"></div>
        <div className="p-6">
          <h2 className="text-xl font-app font-app-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <FiHelpCircle size={20} className="text-accent mr-2" />
            <span>Technischer Support</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Haben Sie ein technisches Problem oder benötigen Sie weitere Hilfe? Kontaktieren Sie unseren Support.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="font-app font-app-medium text-gray-900 dark:text-white">Support-Team</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Montag bis Freitag, 9:00 - 18:00 Uhr</p>
              </div>
              <div className="mt-4 md:mt-0">
                <a 
                  href="mailto:admin-support@magicdrops.de" 
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

export default AdminSupport;
