import React, { useState } from 'react';
import { CreditCard, FileText, Users, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Profile } from '../../types/database';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import AnimatedButton from '../ui/AnimatedButton';
import { toast } from 'react-hot-toast';
import { ensurePaymentModeColumns } from '../../utils/paymentModeUtils';

interface BulkPaymentModeAssignmentProps {
  selectedEmployees: Profile[];
  onUpdate: () => void;
  onClose: () => void;
}

const BulkPaymentModeAssignment: React.FC<BulkPaymentModeAssignmentProps> = ({
  selectedEmployees,
  onUpdate,
  onClose
}) => {
  const { profile: currentUser } = useAuth();
  const { colors } = useSettingsContext();
  const [selectedMode, setSelectedMode] = useState<'vertragsbasis' | 'verguetung'>('vertragsbasis');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const paymentModes = [
    {
      value: 'vertragsbasis' as const,
      title: 'Vertragsbasis',
      description: 'Traditioneller Arbeitsvertrag mit festem Stundenlohn',
      icon: FileText,
      color: 'blue'
    },
    {
      value: 'verguetung' as const,
      title: 'Vergütung pro Aufgabe',
      description: 'Aufgaben-basierte Bezahlung mit flexiblen Auszahlungen',
      icon: CreditCard,
      color: 'emerald'
    }
  ];

  const handleBulkAssignment = async () => {
    if (!currentUser) {
      toast.error('Nicht autorisiert');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔄 Bulk updating payment mode for users to mode:', selectedMode);
      
      // First, ensure the payment mode columns exist
      const columnsExist = await ensurePaymentModeColumns();
      if (!columnsExist) {
        toast.error('Datenbankschema-Fehler: Zahlungsmodus-Spalten fehlen. Bitte kontaktieren Sie den Administrator.');
        return;
      }

      const userIds = selectedEmployees.map(emp => emp.id);
      const now = new Date().toISOString();

      console.log('🔄 Proceeding with bulk update for users:', userIds);

      // Update all selected users' payment modes using admin client to bypass RLS
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          payment_mode: selectedMode,
          payment_mode_set_at: now,
          payment_mode_set_by: currentUser.id,
          updated_at: now
        })
        .in('id', userIds)
        .select();

      console.log('📊 Bulk update result:', updateResult);
      console.log('❌ Bulk update error:', updateError);

      if (updateError) {
        console.error('Database bulk update error:', updateError);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        throw new Error('No rows were updated - users may not exist or columns may be missing');
      }

      // If switching to task-based mode, create worker balances for users who don't have them
      if (selectedMode === 'verguetung') {
        // Get existing balance user IDs
        const { data: existingBalances } = await supabase
          .from('worker_balances')
          .select('worker_id')
          .in('worker_id', userIds);

        const existingBalanceUserIds = existingBalances?.map(b => b.worker_id) || [];
        const usersNeedingBalances = userIds.filter(id => !existingBalanceUserIds.includes(id));

        if (usersNeedingBalances.length > 0) {
          const balanceInserts = usersNeedingBalances.map(userId => ({
            worker_id: userId,
            current_balance: 0.00,
            total_earned: 0.00,
            total_paid_out: 0.00
          }));

          const { error: balanceError } = await supabaseAdmin
            .from('worker_balances')
            .insert(balanceInserts);

          if (balanceError) {
            console.error('Error creating worker balances:', balanceError);
            toast.error('Zahlungsmodi zugewiesen, aber einige Guthaben-Erstellungen fehlgeschlagen');
          }
        }
      }

      const modeTitle = paymentModes.find(m => m.value === selectedMode)?.title;
      toast.success(`${selectedEmployees.length} Mitarbeiter erfolgreich auf "${modeTitle}" gesetzt`);
      
      // Clear session storage cache to force fresh data fetch
      sessionStorage.removeItem('employeesList');
      
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error in bulk payment mode assignment:', error);
      toast.error('Fehler beim Zuweisen der Zahlungsmodi');
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
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4" style={{ color: colors.accent }} />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Bulk-Zuweisung bestätigen
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Möchten Sie wirklich <strong>{selectedEmployees.length} Mitarbeiter</strong> den Zahlungsmodus 
                    <strong className="text-gray-900 dark:text-white"> "{selectedModeData?.title}"</strong> zuweisen?
                  </p>
                </div>

                <div 
                  className="rounded-lg p-4 mb-6"
                  style={{ backgroundColor: `${colors.primary}10` }}
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Betroffene Mitarbeiter:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedEmployees.map((emp, index) => (
                      <div key={emp.id} className="text-sm text-gray-600 dark:text-gray-400">
                        {index + 1}. {emp.first_name} {emp.last_name}
                      </div>
                    ))}
                  </div>
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
                    onClick={handleBulkAssignment}
                    isLoading={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Wird zugewiesen...' : 'Zuweisen'}
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
            className="relative z-50 inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle max-w-3xl w-full"
          >
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6" style={{ color: colors.primary }} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Bulk Zahlungsmodus-Zuweisung
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      {selectedEmployees.length} Mitarbeiter ausgewählt
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

              <div 
                className="rounded-lg p-4 mb-6"
                style={{ backgroundColor: `${colors.primary}10` }}
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Ausgewählte Mitarbeiter:</h4>
                <div className="max-h-24 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedEmployees.map((emp, index) => (
                      <div key={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zahlungsmodus auswählen:</h3>
                
                {paymentModes.map((mode) => {
                  const IconComponent = mode.icon;
                  const isSelected = selectedMode === mode.value;
                  
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setSelectedMode(mode.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 dark:bg-gray-700 ${
                        isSelected
                          ? 'shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      style={{
                        borderColor: isSelected ? colors.primary : undefined,
                        backgroundColor: isSelected ? `${colors.primary}10` : undefined
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: mode.color === 'blue' ? `${colors.primary}20` : `${colors.accent}20`
                          }}
                        >
                          <IconComponent 
                            className="h-5 w-5"
                            style={{
                              color: mode.color === 'blue' ? colors.primary : colors.accent
                            }}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-bold text-gray-900 dark:text-white">{mode.title}</h4>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4" style={{ color: colors.primary }} />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{mode.description}</p>
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
                  size="lg"
                >
                  {selectedEmployees.length} Mitarbeiter zuweisen
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default BulkPaymentModeAssignment;
