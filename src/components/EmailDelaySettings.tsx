import React from 'react';
import { AlertTriangle, Mail, Settings } from 'lucide-react';

interface EmailDelaySettingsProps {
  className?: string;
}

export const EmailDelaySettings: React.FC<EmailDelaySettingsProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">E-Mail Verzögerung</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Veraltet
        </span>
      </div>

      {/* Deprecation Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              Diese Funktion ist nicht mehr verfügbar
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              Das automatische E-Mail-System wurde durch ein manuelles Genehmigungssystem ersetzt. 
              E-Mail-Verzögerungen sind nicht mehr relevant, da E-Mails nur noch manuell von Administratoren versendet werden.
            </p>
            <div className="text-sm text-yellow-700">
              <strong>Neues System:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Bewerbungen werden ohne automatische E-Mails eingereicht</li>
                <li>Administratoren genehmigen oder lehnen Bewerbungen manuell ab</li>
                <li>E-Mails werden sofort beim Genehmigen/Ablehnen versendet</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Wo finde ich die neuen E-Mail-Funktionen?
            </h4>
            <div className="text-sm text-blue-700">
              <div className="flex items-center space-x-2 mb-2">
                <span>Gehen Sie zu:</span>
                <span>→</span>
                <span className="font-medium">Bewerbungen verwalten</span>
              </div>
              <p>
                Dort können Sie Bewerbungen einzeln genehmigen oder ablehnen. 
                Die entsprechenden E-Mails werden automatisch versendet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy Settings Display (Read-only) */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Alte Einstellungen (nur zur Ansicht)
        </h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>E-Mail Verzögerung:</span>
            <span className="text-gray-400">Nicht mehr verwendet</span>
          </div>
          <div className="flex justify-between">
            <span>Verzögerungszeit:</span>
            <span className="text-gray-400">Nicht mehr verwendet</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Diese Einstellungen haben keine Auswirkung mehr auf das System.
        </p>
      </div>
    </div>
  );
}; 