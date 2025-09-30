import React, { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import AnimatedButton from '../ui/AnimatedButton';
import { TaskAssignment } from '../../types/database';
import { Video, X, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingsContext } from '../../context/SettingsContext';

interface VideoCallDecisionProps {
  taskAssignment: TaskAssignment;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  isLoading?: boolean;
}

const VideoCallDecision: React.FC<VideoCallDecisionProps> = ({ 
  taskAssignment,
  onAccept,
  onDecline,
  isLoading = false
}) => {
  const { settings } = useSettingsContext();
  const primaryColor = settings?.primary_color || '#ee1d3c';
  const accentColor = settings?.accent_color || '#231f20';
  
  const [hoverButton, setHoverButton] = useState<'accept' | 'decline' | null>(null);

  // Animation variants for hover effects
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div 
      className="w-full h-full flex flex-col"
      initial="initial"
      animate="animate"
      variants={cardVariants}
    >
      <Card className="w-full h-full flex flex-col shadow-lg border border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="flex items-center justify-center mb-4">
            <div 
              className="flex-shrink-0 rounded-full w-16 h-16 flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Video style={{ color: primaryColor }} size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            Möchtest du den Video-Chat durchführen?
          </CardTitle>
          <p className="text-center text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
            Der Video-Chat ist ein wichtiger Teil des Bewertungsprozesses. Bitte lies dir die folgenden Hinweise sorgfältig durch.
          </p>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-auto py-6 px-6 md:px-8">
        <div className="max-w-none mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hinweise für den Video-Chat</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">Damit du den Anmeldeprozess realistisch bewerten kannst, bitten wir dich, dich wie ein echter Neukunde zu verhalten. Deine Angaben dienen ausschließlich der internen Bewertung – sie sind nicht rechtsverbindlich.</p>
            
            <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Gesetzlich vorgeschriebene Fragen im Chat</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-3">Während des Video-Chats kann dir der/die Mitarbeiter:in Sicherheitsfragen stellen, z. B.:</p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-3">
              <p className="italic text-gray-600 dark:text-gray-400 mb-1">„Wirst du gezwungen, einen Account zu eröffnen?"</p>
              <p className="italic text-gray-600 dark:text-gray-400">„Steht jemand bei dir, der dich zur Anmeldung drängt?"</p>
            </div>
            
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">Diese Fragen musst du immer mit „Nein" beantworten.</p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">Falls keine solchen Fragen gestellt werden, vermerke das bitte im Bewertungsbogen.</p>
            
            <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Wichtige Hinweise zur Durchführung</h4>
            <ul className="text-gray-700 dark:text-gray-300 space-y-2">
              <li>Wähle eine ruhige Umgebung mit guter Beleuchtung, funktionierender Webcam und stabiler Internetverbindung.</li>
              <li>Folge den Anweisungen des Video-Chat-Systems bzw. der Mitarbeiterin oder des Mitarbeiters Schritt für Schritt.</li>
              <li>Sollte etwas unklar oder technisch problematisch sein, notiere es bitte im Bewertungsbogen.</li>
            </ul>
          </div>
          

        </div>
        
        <div className="flex items-center justify-center mt-6">
          <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center">
            <AlertCircle className="text-amber-500 mr-3 flex-shrink-0" size={24} />
            <p className="text-sm text-amber-800 dark:text-amber-300 m-0">
              Bei Ablehnung wird die Bewertung als nicht erfolgreich gewertet und fließt nicht in deine Leistungen ein.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-gray-100 dark:border-gray-800 p-6">
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <Button
            variant="outline"
            className="flex-1 py-2 px-6 border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 text-sm sm:text-base min-w-[200px]"
            onClick={onDecline}
            disabled={isLoading}
            onMouseEnter={() => setHoverButton('decline')}
            onMouseLeave={() => setHoverButton(null)}
          >
            <div className="flex items-center justify-center space-x-2">
              <X className="text-red-500 flex-shrink-0" size={16} />
              <span className="whitespace-nowrap">Ablehnen – Ich möchte nicht teilnehmen</span>
            </div>
          </Button>
          
          <AnimatedButton
            className="flex-1 py-2 px-6 text-sm sm:text-base min-w-[220px]"
            onClick={onAccept}
            disabled={isLoading}
            onMouseEnter={() => setHoverButton('accept')}
            onMouseLeave={() => setHoverButton(null)}
            style={{
              backgroundColor: primaryColor,
              color: 'white'
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <Check className="flex-shrink-0" size={16} />
              <span className="whitespace-nowrap">Einverstanden – Ich führe den Video-Chat durch</span>
            </div>
          </AnimatedButton>
        </div>
      </CardFooter>
    </Card>
    </motion.div>
  );
};

export default VideoCallDecision;
