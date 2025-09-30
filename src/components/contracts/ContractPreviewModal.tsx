import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Contract } from '../../types/database';
import SignaturePad from './SignaturePad';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { processContractVariables } from '../../utils/contractUtils';
import { useSettingsContext } from '../../context/SettingsContext';

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  nationality?: string;
}

interface ContractPreviewModalProps {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: string) => Promise<void>;
  userData?: UserData;
}

const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSign,
  userData
}) => {
  const [signatureData, setSignatureData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'preview' | 'sign' | 'success'>('preview');
  const [signedDate, setSignedDate] = useState<string>('');
  const { settings } = useSettingsContext();

  const handleSign = async () => {
    if (!signatureData) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSign(signatureData);
      setSignedDate(new Date().toLocaleDateString());
      setCurrentStep('success');
    } catch (error) {
      console.error('Error signing contract:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    // Reset state when closing
    if (currentStep === 'success') {
      setTimeout(() => {
        setCurrentStep('preview');
        setSignatureData('');
      }, 300); // Delay to allow transition to complete
    }
    onClose();
  };

  // Function to render contract content with processed variables
  const renderContractContent = () => {
    if (!contract.content) return '';
    
    // Create custom values object from userData
    const customValues: Record<string, any> = {};
    
    if (userData) {
      customValues.firstName = userData.firstName || '';
      customValues.lastName = userData.lastName || '';
      customValues.email = userData.email || '';
      customValues.dateOfBirth = userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : '';
      customValues.street = userData.street || '';
      customValues.postalCode = userData.postalCode || '';
      customValues.city = userData.city || '';
      customValues.nationality = userData.nationality || '';
      customValues.Startdatum = new Date().toLocaleDateString();
    }
    
    // Use the utility function to process all variables properly
    return processContractVariables(contract, customValues);
  };

  // Add a style element for dark mode variables
  const darkModeStyles = `
    .contract-content {
      color: #1F2937;
    }
    
    .dark .contract-content {
      color: #E5E7EB;
    }
    
    .dark .contract-content *,
    .dark .contract-content h1,
    .dark .contract-content h2,
    .dark .contract-content h3,
    .dark .contract-content h4,
    .dark .contract-content h5,
    .dark .contract-content h6,
    .dark .contract-content p,
    .dark .contract-content li,
    .dark .contract-content span,
    .dark .contract-content div,
    .dark .contract-content td,
    .dark .contract-content th {
      color: #E5E7EB !important;
    }
    
    .dark .contract-content strong,
    .dark .contract-content b {
      color: #F3F4F6 !important;
    }
  `;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <style dangerouslySetInnerHTML={{ __html: darkModeStyles }} />
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={handleClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
          
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle bg-white dark:bg-gray-800 rounded-2xl shadow-xl transform transition-all">
              <div className="flex justify-between items-center">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  {currentStep === 'preview' ? 'Vertragsvorschau' : currentStep === 'sign' ? 'Vertrag unterschreiben' : 'Vertrag unterschrieben'}
                </Dialog.Title>
                <button
                  type="button"
                  className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                  onClick={handleClose}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4">
                {currentStep === 'preview' ? (
                  <div className="h-[600px] overflow-auto bg-white dark:bg-gray-900 p-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="max-w-3xl mx-auto">
                      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{contract.title}</h1>

                      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                          Vertrag zwischen
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Company Information */}
                          <div className="border-r-0 md:border-r border-gray-200 dark:border-gray-600 pr-0 md:pr-4">
                            <h3 className="text-md font-semibold mb-2 text-accent">Unternehmen</h3>
                            <div className="space-y-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {settings?.company_name}
                              </p>
                              {settings?.company_address && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {settings.company_address}
                              </p>
                              )}
                              {settings?.postal_code && settings?.city && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {settings.postal_code} {settings.city}
                              </p>
                              )}
                              {settings?.country && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {settings.country}
                              </p>
                              )}
                            </div>
                          </div>
                          
                          {/* User Information */}
                          <div className="pl-0 md:pl-4">
                            <h3 className="text-md font-semibold mb-2 text-accent">Mitarbeiter</h3>
                            {userData ? (
                              <div className="space-y-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {userData.firstName} {userData.lastName}
                                </p>
                                {userData.dateOfBirth && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Geboren am: {new Date(userData.dateOfBirth).toLocaleDateString()}
                                  </p>
                                )}
                                {userData.street && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {userData.street}
                                  </p>
                                )}
                                {userData.postalCode && userData.city && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {userData.postalCode} {userData.city}
                                  </p>
                                )}
                                {userData.nationality && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {userData.nationality}
                                  </p>
                                )}
                                {userData.email && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {userData.email}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500">Keine Benutzerdaten verfügbar</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {contract.template_data?.description && (
                        <div className="mb-6">
                          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Beschreibung</h2>
                          <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-200">{contract.template_data.description}</p>
                        </div>
                      )}
                      
                      {contract.template_data?.salary && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Vergütung</h2>
                          <p className="text-xl font-bold text-accent">
                            Monatliches Gehalt: {contract.template_data.salary}
                          </p>
                        </div>
                      )}

                      <div className="mb-6">
                        <div 
                          className="contract-content"
                          dangerouslySetInnerHTML={{ __html: renderContractContent() }}
                        />
                      </div>

                      {contract.template_data?.terms && (
                        <div className="mb-6">
                          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Vertragsbedingungen</h2>
                          <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-200">{contract.template_data.terms}</p>
                        </div>
                      )}

                      <div className="mb-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Datum: {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ) : currentStep === 'sign' ? (
                  <div className="mt-4">
                    <SignaturePad onChange={setSignatureData} className="mb-4" />
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="flex justify-center items-center flex-col">
                      <CheckCircleIcon className="w-12 h-12 text-green-600" />
                      <h2 className="text-lg font-bold mb-2">Vertrag erfolgreich unterschrieben!</h2>
                      <p className="text-sm text-gray-500">Datum: {signedDate}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {currentStep !== 'success' && (
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                    onClick={handleClose}
                  >
                    {currentStep === 'preview' ? 'Schließen' : 'Abbrechen'}
                  </button>
                )}

                {currentStep === 'preview' ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-md hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                    onClick={() => setCurrentStep('sign')}
                  >
                    Unterschreiben
                  </motion.button>
                ) : currentStep === 'sign' ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-md hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                    onClick={handleSign}
                    disabled={!signatureData || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wird gespeichert...
                      </>
                    ) : 'Vertrag unterschreiben'}
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={handleClose}
                  >
                    Fertig
                  </motion.button>
                )}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ContractPreviewModal;
