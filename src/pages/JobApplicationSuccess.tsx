import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSettingsContext } from '../context/SettingsContext';

const JobApplicationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { settings, colors } = useSettingsContext();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg text-center">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                <CheckCircle className="text-green-600 dark:text-green-400" size={48} />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Bewerbung erfolgreich eingereicht!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200 text-lg mb-4">
                Vielen Dank für Ihre Bewerbung bei {settings?.website_name || 'unserem Unternehmen'}!
              </p>
              <p className="text-green-700 dark:text-green-300">
                Wir haben Ihre Bewerbung erhalten und werden sie sorgfältig prüfen. 
                Wir werden Sie per E-Mail über das Ergebnis informieren und Ihnen weitere Schritte mitteilen.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Wie geht es weiter?
              </h3>
              <div className="text-left space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">1</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Wir prüfen Ihre Bewerbungsunterlagen innerhalb 24h
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">2</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Bei positiver Rückmeldung erhalten Sie per E-Mail einen Arbeitsvertrag und weitere Anweisungen zum Start
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => navigate('/')}
                leftIcon={<Home size={16} />}
                style={{ backgroundColor: colors.primary, color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                Zur Startseite
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobApplicationSuccess; 