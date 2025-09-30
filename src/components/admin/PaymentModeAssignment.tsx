import React, { useState } from 'react';
import { CreditCard, FileText, User, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Profile } from '../../types/database';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import AnimatedButton from '../ui/AnimatedButton';
import { toast } from 'react-hot-toast';
import { ensurePaymentModeColumns, testPaymentModeUpdate } from '../../utils/paymentModeUtils';

interface PaymentModeAssignmentProps {
  employee: Profile;
  onUpdate: () => void;
  onClose: () => void;
}

const PaymentModeAssignment: React.FC<PaymentModeAssignmentProps> = ({
  employee,
  onUpdate,
  onClose
}) => {
  const { profile: currentUser } = useAuth();
  const { colors } = useSettingsContext();
  const [selectedMode, setSelectedMode] = useState<'vertragsbasis' | 'verguetung'>(
    employee.payment_mode || 'vertragsbasis'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const paymentModes = [
    {
      value: 'vertragsbasis' as const,
      title: 'Vertragsbasis',
      subtitle: 'Traditioneller Arbeitsvertrag',
      icon: FileText,
      description: 'Mitarbeiter erhalten einen Arbeitsvertrag mit festem Stundenlohn und regulären Gehaltsauszahlungen.',
      features: [
        'Fester Arbeitsvertrag',
        'Stundenlohn-basierte Bezahlung',
        'Monatliche Gehaltsauszahlung',
        'Arbeitsrechtlicher Schutz'
      ],
      color: 'blue'
    },
    {
      value: 'verguetung' as const,
      title: 'Vergütung pro Aufgabe',
      subtitle: 'Aufgaben-basierte Bezahlung',
      icon: CreditCard,
      description: 'Mitarbeiter erhalten Bezahlung pro abgeschlossener Aufgabe und können flexible Auszahlungen beantragen.',
      features: [
        'Bezahlung pro Aufgabe',
        'Flexible Auszahlungen',
        'Guthaben-System',
        'Leistungsbasierte Vergütung'
      ],
      color: 'emerald'
    }
  ];

  const handleAssignMode = async () => {
    if (!currentUser) {
      toast.error('Nicht autorisiert');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔄 Updating payment mode for user:', employee.id, 'to mode:', selectedMode);
      
      // First, ensure the payment mode columns exist
      const columnsExist = await ensurePaymentModeColumns();
      if (!columnsExist) {
        toast.error('Datenbankschema-Fehler: Zahlungsmodus-Spalten fehlen. Bitte kontaktieren Sie den Administrator.');
        return;
      }

      // Test if we can update this user
      const canUpdate = await testPaymentModeUpdate(employee.id);
      if (!canUpdate) {
        toast.error('Benutzer kann nicht aktualisiert werden. Bitte kontaktieren Sie den Administrator.');
        return;
      }
      
      // Update user's payment mode using admin client to bypass RLS
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          payment_mode: selectedMode,
          payment_mode_set_at: new Date().toISOString(),
          payment_mode_set_by: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id)
        .select();

      console.log('📊 Update result:', updateResult);
      console.log('❌ Update error:', updateError);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        throw new Error('No rows were updated - user may not exist or columns may be missing');
      }

      // If switching to task-based mode, create worker balance if it doesn't exist
      if (selectedMode === 'verguetung') {
        const { data: existingBalance } = await supabase
          .from('worker_balances')
          .select('id')
          .eq('worker_id', employee.id)
          .single();

        if (!existingBalance) {
          const { error: balanceError } = await supabaseAdmin
            .from('worker_balances')
            .insert({
              worker_id: employee.id,
              current_balance: 0.00,
              total_earned: 0.00,
              total_paid_out: 0.00
            });

          if (balanceError) {
            console.error('Error creating worker balance:', balanceError);
            toast.error('Zahlungsmodus zugewiesen, aber Guthaben-Erstellung fehlgeschlagen');
          }
        }
      }

      toast.success(`Zahlungsmodus erfolgreich auf "${paymentModes.find(m => m.value === selectedMode)?.title}" gesetzt`);
      
      // Clear session storage cache to force fresh data fetch
      sessionStorage.removeItem('employeesList');
      
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error assigning payment mode:', error);
      toast.error('Fehler beim Zuweisen des Zahlungsmodus');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedModeData = paymentModes.find(m => m.value === selectedMode);

  if (showConfirmation) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 transition-opacity"
              onClick={() => setShowConfirmation(false)}
            />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative z-50 inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle max-w-md w-full"
            >
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="text-center mb-6">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: colors.accent }} />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Zahlungsmodus zuweisen?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Möchten Sie {employee.first_name} {employee.last_name} wirklich den Zahlungsmodus 
                    <strong className="text-gray-900 dark:text-white"> "{selectedModeData?.title}"</strong> zuweisen?
                  </p>
                </div>

                <div className="flex space-x-4">
                  <AnimatedButton
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1"
                  >
                    Abbrechen
                  </AnimatedButton>
                  <AnimatedButton
                    variant="primary"
                    onClick={handleAssignMode}
                    isLoading={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Wird zugewiesen...' : 'Bestätigen'}
                  </AnimatedButton>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 transition-opacity"
            onClick={onClose}
          />

          <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle max-w-2xl w-full"
          >
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <User className="h-6 w-6" style={{ color: colors.primary }} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Zahlungsmodus zuweisen
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      {employee.first_name} {employee.last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ focusRingColor: `${colors.primary}50` }}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {employee.payment_mode && (
                <div 
                  className="border rounded-lg p-4 mb-6"
                  style={{ 
                    backgroundColor: `${colors.primary}10`, 
                    borderColor: `${colors.primary}30` 
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: colors.primary }} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Aktueller Modus: {paymentModes.find(m => m.value === employee.payment_mode)?.title}
                    </span>
                  </div>
                  {employee.payment_mode_set_at && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Zugewiesen am: {new Date(employee.payment_mode_set_at).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4 mb-8">
                {paymentModes.map((mode) => {
                  const IconComponent = mode.icon;
                  const isSelected = selectedMode === mode.value;
                  
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setSelectedMode(mode.value)}
                      className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-200 dark:bg-gray-700 ${
                        isSelected
                          ? 'shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      style={{
                        borderColor: isSelected ? colors.primary : undefined,
                        backgroundColor: isSelected ? `${colors.primary}10` : undefined
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: mode.color === 'blue' ? `${colors.primary}20` : `${colors.accent}20`
                          }}
                        >
                          <IconComponent 
                            className="h-6 w-6"
                            style={{
                              color: mode.color === 'blue' ? colors.primary : colors.accent
                            }}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{mode.title}</h3>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5" style={{ color: colors.primary }} />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{mode.subtitle}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{mode.description}</p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {mode.features.map((feature, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <div 
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: colors.primary }}
                                ></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <AnimatedButton
                  variant="outline"
                  onClick={onClose}
                  size="lg"
                >
                  Abbrechen
                </AnimatedButton>
                
                <AnimatedButton
                  variant="primary"
                  onClick={() => setShowConfirmation(true)}
                  disabled={selectedMode === employee.payment_mode}
                  size="lg"
                >
                  {selectedMode === employee.payment_mode ? 'Bereits zugewiesen' : 'Modus zuweisen'}
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModeAssignment;
