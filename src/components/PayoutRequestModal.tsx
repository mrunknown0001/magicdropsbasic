import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { WorkerBalance } from '../types/database';
import { motion, AnimatePresence } from 'framer-motion';

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: WorkerBalance | null;
  onSubmit: (amount: number, paymentMethod?: Record<string, any>) => Promise<boolean>;
}

const PayoutRequestModal: React.FC<PayoutRequestModalProps> = ({
  isOpen,
  onClose,
  balance,
  onSubmit
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxAmount = balance?.current_balance || 0;
  const minAmount = 10; // Minimum payout amount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const requestAmount = parseFloat(amount);
    
    // Validation
    if (!requestAmount || requestAmount <= 0) {
      setError('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }
    
    if (requestAmount < minAmount) {
      setError(`Mindestbetrag für Auszahlungen: €${minAmount}`);
      return;
    }
    
    if (requestAmount > maxAmount) {
      setError('Betrag übersteigt verfügbares Guthaben');
      return;
    }

    if (paymentMethod === 'bank') {
      if (!iban.trim()) {
        setError('IBAN ist erforderlich');
        return;
      }
      if (!recipientName.trim()) {
        setError('Empfängername ist erforderlich');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const paymentMethodData = paymentMethod === 'bank' ? {
        type: 'bank',
        iban: iban.trim(),
        bic: bic.trim(),
        recipient_name: recipientName.trim()
      } : undefined;

      const success = await onSubmit(requestAmount, paymentMethodData);
      
      if (success) {
        setSuccess(true);
        // Reset form
        setAmount('');
        setIban('');
        setBic('');
        setRecipientName('');
        // Close modal after short delay
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen der Auszahlungsanfrage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <CreditCard className="mr-2" size={20} />
              Auszahlung beantragen
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {success ? (
            <div className="p-6 text-center">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Auszahlung beantragt!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ihre Auszahlungsanfrage wurde erfolgreich eingereicht und wird von einem Administrator geprüft.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Balance Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Verfügbares Guthaben
                    </h3>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      €{maxAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auszahlungsbetrag (€)
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={minAmount}
                  max={maxAmount}
                  step="0.01"
                  required
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Mindestbetrag: €{minAmount} • Maximum: €{maxAmount.toFixed(2)}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auszahlungsmethode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="bank">Banküberweisung</option>
                </select>
              </div>

              {/* Bank Details */}
              {paymentMethod === 'bank' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="iban" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      IBAN *
                    </label>
                    <Input
                      id="iban"
                      type="text"
                      value={iban}
                      onChange={(e) => setIban(e.target.value.toUpperCase())}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="bic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      BIC (optional)
                    </label>
                    <Input
                      id="bic"
                      type="text"
                      value={bic}
                      onChange={(e) => setBic(e.target.value.toUpperCase())}
                      placeholder="COBADEFFXXX"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Empfängername *
                    </label>
                    <Input
                      id="recipientName"
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Max Mustermann"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Fehler
                      </h3>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                  className="flex-1"
                >
                  {isSubmitting ? 'Wird eingereicht...' : 'Auszahlung beantragen'}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PayoutRequestModal;
