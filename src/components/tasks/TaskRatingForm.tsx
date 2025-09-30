import React, { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import AnimatedButton from '../ui/AnimatedButton';
import { TaskAssignment } from '../../types/database';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface TaskRatingFormProps {
  taskAssignment: TaskAssignment;
  onSubmit: (ratingData: any) => Promise<void>;
  onBack: () => void;
}

const TaskRatingForm: React.FC<TaskRatingFormProps> = ({ 
  taskAssignment,
  onSubmit,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Simple state for each field
  const [designAndLayout, setDesignAndLayout] = useState('');
  const [usability, setUsability] = useState('');
  const [content, setContent] = useState('');
  const [overallImpression, setOverallImpression] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      designAndLayout,
      usability,
      content,
      overallImpression
    };
    
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Bewertung konnte nicht gespeichert werden');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center mb-2">
          <MessageSquare className="text-blue-500 mr-2" size={24} />
          <CardTitle className="text-xl font-bold">Bewertung der Website/App</CardTitle>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Bitte bewerte deine Erfahrung und beantworte die folgenden Fragen
        </p>
      </CardHeader>
      
      <CardContent className="overflow-auto">
        <form onSubmit={handleSubmit}>
          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="block font-semibold text-lg text-gray-800 dark:text-gray-100">
              1. Design und Layout
            </label>
            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-4">
              Wie empfindest du das Design und das visuelle Erscheinungsbild der Website oder App? Was gefällt dir besonders gut oder was wirkt eher unübersichtlich oder veraltet?
            </p>
            <textarea
              value={designAndLayout}
              onChange={(e) => setDesignAndLayout(e.target.value)}
              className="w-full p-4 border-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              rows={4}
              placeholder="Das Design ist modern und aufgeräumt. Besonders gefallen mir die klaren Farben und großen Buttons. In manchen Bereichen wirkt es aber etwas textlastig."
              disabled={isSubmitting}
            />
          </div>
          
          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="block font-semibold text-lg text-gray-800 dark:text-gray-100">
              2. Benutzerfreundlichkeit
            </label>
            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-4">
              Wie gut lässt sich die Website oder App bedienen? Gab es etwas, das unklar war oder dich beim Navigieren gestört hat?
            </p>
            <textarea
              value={usability}
              onChange={(e) => setUsability(e.target.value)}
              className="w-full p-4 border-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              rows={4}
              placeholder="Die Navigation war intuitiv und ich habe alle Funktionen schnell gefunden. Die App-Menüs könnten aber etwas größer sein – auf kleineren Bildschirmen ist es manchmal fummelig."
              disabled={isSubmitting}
            />
          </div>
          
          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="block font-semibold text-lg text-gray-800 dark:text-gray-100">
              3. Inhalte und Informationsgehalt
            </label>
            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-4">
              Wie hilfreich und verständlich sind die Inhalte? Gibt es Informationen oder Funktionen, die fehlen oder überflüssig wirken?
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 border-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              rows={4}
              placeholder="Alle Inhalte waren verständlich geschrieben und gut gegliedert. Ich hätte mir allerdings eine ausführlichere FAQ-Sektion gewünscht."
              disabled={isSubmitting}
            />
          </div>
          
          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="block font-semibold text-lg text-gray-800 dark:text-gray-100">
              4. Gesamteindruck
            </label>
            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-4">
              Wie ist dein Gesamteindruck der Website oder App? Würdest du sie weiterempfehlen? Warum (nicht)?
            </p>
            <textarea
              value={overallImpression}
              onChange={(e) => setOverallImpression(e.target.value)}
              className="w-full p-4 border-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              rows={4}
              placeholder="Der Gesamteindruck ist positiv. Die App ist übersichtlich, funktioniert stabil und sieht gut aus. Ich würde sie auf jeden Fall weiterempfehlen."
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex justify-between mt-8 border-t pt-6">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '120px', padding: '8px 16px' }}
            >
              ← Zurück
            </Button>
            
            <AnimatedButton
              type="submit"
              disabled={isSubmitting || !designAndLayout || !usability || !content || !overallImpression}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-base font-medium whitespace-nowrap min-w-[180px]"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>{isSubmitting ? 'Wird gespeichert...' : 'Bewertung abschicken'}</span>
              </div>
            </AnimatedButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskRatingForm;
