import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FiFileText, FiRefreshCw, FiEye, FiCheck, FiDownload, FiCalendar, FiAlertTriangle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMyContractsStats } from '../../hooks/useMyContractsStats';
import Button from '../../components/ui/Button';
import AnimatedButton from '../../components/ui/AnimatedButton';
import ShimmerEffect from '../../components/ui/ShimmerEffect';
import SignContractModal from '../../components/admin/SignContractModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { Contract } from '../../types/database';
import { generateContractPDF } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Utility function for retrying operations with exponential backoff
const retryOperation = async <T,>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};

const MyContracts: React.FC = () => {
  const { user } = useAuth();
  const { colors, settings } = useSettingsContext();
  const { isNewNavigation } = useNavigation();
  const hasInitialFetchRef = useRef(false);
  
  // Use the hook
  const {
    assignedContracts,
    loading,
    error,
    fetchAssignedContracts,
    getContractById,
    signContract
  } = useMyContractsStats();
  
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentStatus, setSelectedAssignmentStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchAssignedContracts(true);
    toast.success('Aktualisiere Vertragsdaten...');
  };
  
  // Add navigation-based refresh
  useEffect(() => {
    // Only fetch data when navigating to this view and we haven't fetched yet
    if (isNewNavigation('/mitarbeiter/contracts') && !hasInitialFetchRef.current) {
      console.log('Navigation to MyContracts detected, fetching data...');
      fetchAssignedContracts();
      hasInitialFetchRef.current = true;
    }
  }, [isNewNavigation, fetchAssignedContracts]);

  const handleViewContract = async (contractId: string, assignmentId: string, status: string) => {
    try {
      setIsSubmitting(true);
      const contract = await getContractById(contractId);
      setSelectedContract(contract);
      setIsSignModalOpen(true);
      setSelectedAssignmentId(assignmentId);
      setSelectedAssignmentStatus(status);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error('Fehler beim Laden des Vertrags');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignContract = async (contractId: string, signatureData: string) => {
    try {
      setIsSubmitting(true);
      // Use the actual signature data from the signature pad and the correct assignment ID
      await signContract(selectedAssignmentId, signatureData);
      setIsSignModalOpen(false);
      setSelectedContract(null);
      
      toast.success('Vertrag erfolgreich unterschrieben');
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Fehler beim Unterschreiben des Vertrags');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async (contract: Contract | undefined) => {
    if (!contract) {
      toast.error('Vertrag nicht gefunden');
      return;
    }
    
    if (!user?.id) {
      toast.error('Benutzer nicht angemeldet');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Show loading toast
      const loadingToast = toast.loading('PDF wird generiert...');
      
      // Dispatch event for loading indicator (following our standardized pattern)
      window.dispatchEvent(new CustomEvent('fetch-start', { 
        detail: { operation: 'contract-pdf-generation' } 
      }));
      
      // First get the signature data and user profile data from the contract assignment
      console.log('Fetching signature data for contract:', contract.id, 'for user:', user.id);
      
      // Get user profile data first to include in the PDF
      const getProfileData = async () => {
        return await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      };
      
      const { data: profileData, error: profileError } = await retryOperation(getProfileData, 3);
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        toast.error('Fehler beim Abrufen der Benutzerdaten');
        toast.dismiss(loadingToast);
        return;
      }
      
      // Use retryOperation for better reliability when fetching assignment data
      const getAssignmentData = async () => {
        return await supabase
          .from('contract_assignments')
          .select('signature_data, status, assigned_at')
          .eq('contract_id', contract.id)
          .eq('user_id', user.id)
          .single();
      };
      
      const { data: assignmentData, error: assignmentError } = await retryOperation(getAssignmentData, 3);
      
      if (assignmentError) {
        console.error('Error fetching signature data:', assignmentError);
        toast.error('Fehler beim Abrufen der Vertragsdaten');
        toast.dismiss(loadingToast);
        return;
      }
      
      if (!assignmentData) {
        console.error('No assignment data found');
        toast.error('Keine Vertragszuweisung gefunden');
        toast.dismiss(loadingToast);
        return;
      }
      
      if (!assignmentData.signature_data && assignmentData.status === 'signed') {
        console.warn('Contract is marked as signed but no signature data found');
        toast.error('Unterschrift nicht gefunden. Bitte unterschreiben Sie den Vertrag erneut.');
        toast.dismiss(loadingToast);
        return;
      }
      
      console.log('Assignment data retrieved successfully');
      
      // Make sure we have the user's complete information
      const userName = profileData?.first_name && profileData?.last_name 
        ? `${profileData.first_name} ${profileData.last_name}`.trim()
        : user.user_metadata?.name || user.email || 'Unbekannter Benutzer';
      
      // Prepare user data for template variables
      const userData = {
        name: userName,
        firstName: profileData?.first_name || '',
        lastName: profileData?.last_name || '',
        email: profileData?.email || user.email || '',
        street: profileData?.street || '',
        city: profileData?.city || '',
        postalCode: profileData?.postal_code || '',
        dateOfBirth: profileData?.date_of_birth 
          ? new Date(profileData.date_of_birth).toLocaleDateString('de-DE') 
          : '',
      };
      
      // Ensure the contract has template_data property with user information
      if (!contract.template_data) {
        contract.template_data = {};
      }
      
      // Add user data to contract template_data for variable replacement
      Object.assign(contract.template_data, userData);
      
      try {
        // Prepare company settings for PDF generation
        const companySettings = settings ? {
          company_name: settings.company_name || '',
          company_address: settings.company_address || '',
          postal_code: settings.postal_code || '',
          city: settings.city || '',
          country: settings.country || '',
          contact_email: settings.contact_email || ''
        } : undefined;
        
        // Generate PDF with the signature data and user information
        const pdfBlob = await generateContractPDF(
          contract, 
          userName,
          assignmentData.signature_data,
          companySettings
        );
        
        if (!pdfBlob) {
          throw new Error('PDF generation failed');
        }
        
        // Create a download link with a meaningful filename
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create a filename with the contract title, user name and date
        const cleanTitle = contract.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
        const cleanName = userName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
        const date = new Date().toISOString().split('T')[0];
        
        a.download = `Vertrag_${cleanTitle}_${cleanName}_${date}.pdf`;
        a.click();
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        toast.dismiss(loadingToast);
        toast.success('PDF erfolgreich generiert und heruntergeladen');
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        toast.dismiss(loadingToast);
        toast.error('Fehler beim Generieren der PDF. Bitte versuchen Sie es erneut.');
      } finally {
        // Dispatch event for loading indicator completion
        window.dispatchEvent(new CustomEvent('fetch-end', { 
          detail: { operation: 'contract-pdf-generation' } 
        }));
      }
    } catch (error) {
      console.error('Unexpected error in handleDownloadPDF:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
      
      // Ensure fetch-end is always dispatched
      window.dispatchEvent(new CustomEvent('fetch-end', { 
        detail: { operation: 'contract-pdf-generation' } 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Get current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('de-DE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Show error state if contract fetching failed
  if (error) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Meine Verträge</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
                Hier finden Sie alle Verträge, die Ihnen zugewiesen wurden.
              </p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 mb-6 shadow-sm"
        >
          <div className="flex items-center mb-4">
            <FiRefreshCw className="mr-2 text-red-600" size={20} />
            <p className="font-app">Fehler beim Laden der Verträge.</p>
          </div>
          <div className="mt-2">
            <AnimatedButton
              onClick={() => fetchAssignedContracts(true)}
              variant="danger"
              icon={<FiRefreshCw size={16} />}
              disabled={loading}
            >
              Daten neu laden
            </AnimatedButton>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show loading state while fetching contracts
  if (loading && assignedContracts.length === 0) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <ShimmerEffect width="250px" height="32px" className="mb-2" />
              <ShimmerEffect width="350px" height="20px" />
            </div>
          </div>
        </motion.div>
        
        <Card className="shadow-sm border-0 overflow-hidden">
          <div className={`h-1 w-full bg-[${colors.primaryDark}] dark:bg-[${colors.primaryLight}]`}></div>
          <CardHeader>
            <ShimmerEffect width="200px" height="24px" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <ShimmerEffect width="40px" height="40px" borderRadius="9999px" />
                      <div>
                        <ShimmerEffect width="200px" height="20px" className="mb-2" />
                        <ShimmerEffect width="120px" height="16px" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ShimmerEffect width="180px" height="36px" borderRadius="0.375rem" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Meine Verträge</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
              Hier finden Sie alle Verträge, die Ihnen zugewiesen wurden.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex items-center bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm">
              <FiCalendar className="text-accent mr-2" size={16} />
              <p className="text-sm font-app text-gray-700 dark:text-gray-300">
                {formattedDate}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              leftIcon={<FiRefreshCw className="h-4 w-4" />}
            >
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>
      
      {loading && assignedContracts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-6"
        >
          <LoadingSpinner size="lg" />
        </motion.div>
      )}
      
      <Card className="shadow-sm border-0 overflow-hidden">
        <div className={`h-1 w-full bg-[${colors.primaryDark}] dark:bg-[${colors.primaryLight}]`}></div>

        <CardContent className="px-6 pt-6 pb-6">
          {assignedContracts.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-3 w-12 h-12 flex items-center justify-center">
                <FiFileText className="text-gray-500 dark:text-gray-400" size={24} />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-app">Ihnen wurden noch keine Verträge zugewiesen.</p>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {assignedContracts.map((assignment) => (
                <motion.div 
                  key={assignment.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  variants={item}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full ${assignment.status === 'signed' ? `bg-[${colors.accent}]/10 text-[${colors.accent}]` : `bg-[${colors.primary}]/10 text-[${colors.primary}]`} dark:bg-gray-700 dark:text-white`}>
                        <FiFileText size={20} />
                      </div>
                      <div>
                        <h3 className="font-app font-app-medium text-gray-900 dark:text-white">
                          {assignment.contract?.title || assignment.contract_title}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="text-sm font-app text-gray-500 dark:text-gray-400">
                            Zugewiesen: {formatDistanceToNow(new Date(assignment.assigned_at), { addSuffix: true, locale: de })}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-app font-app-semibold shadow-sm border ${
                            assignment.status === 'signed' 
                              ? `bg-gradient-to-r from-[${colors.accent}]/10 to-[${colors.accent}]/20 text-[${colors.accent}] border-[${colors.accent}]/20 dark:bg-gradient-to-r dark:from-[${colors.accent}]/20 dark:to-[${colors.accent}]/30 dark:text-white dark:border-[${colors.accent}]/30` 
                              : `bg-gradient-to-r from-[${colors.primary}]/10 to-[${colors.primary}]/20 text-[${colors.primary}] border-[${colors.primary}]/20 dark:bg-gradient-to-r dark:from-[${colors.primary}]/20 dark:to-[${colors.primary}]/30 dark:text-white dark:border-[${colors.primary}]/30`
                          }`}>
                            {assignment.status === 'signed' 
                              ? <>
                                <FiCheck size={12} className="flex-shrink-0 dark:text-white" />
                                <span>Unterschrieben</span>
                                </>
                              : <>
                                <span className="relative flex h-2 w-2">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[${colors.primary}] opacity-75 dark:bg-white dark:opacity-50`}></span>
                                  <span className={`relative inline-flex rounded-full h-2 w-2 bg-[${colors.primary}] dark:bg-white`}></span>
                                </span>
                                <span>Ausstehend</span>
                                </>
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex mt-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <AnimatedButton
                        onClick={() => handleViewContract(assignment.contract_id, assignment.id, assignment.status)}
                        className={`bg-[${colors.primary}] hover:bg-[${colors.primary}]/90`}
                        icon={<FiEye size={16} />}
                        isLoading={isSubmitting}
                      >
                        Ansehen
                      </AnimatedButton>
                      
                      {assignment.status !== 'signed' ? (
                        <AnimatedButton
                          onClick={() => handleViewContract(assignment.contract_id, assignment.id, assignment.status)}
                          className={`bg-[${colors.accent}] hover:bg-[${colors.accent}]/90`}
                          icon={<FiCheck size={16} />}
                          isLoading={isSubmitting}
                        >
                          Unterschreiben
                        </AnimatedButton>
                      ) : (
                        <AnimatedButton
                          onClick={() => assignment.contract ? handleDownloadPDF(assignment.contract) : null}
                          className={`bg-[${colors.primaryDark}] hover:bg-[${colors.primaryDark}]/90`}
                          icon={<FiDownload size={16} />}
                          isLoading={isSubmitting}
                        >
                          Herunterladen
                        </AnimatedButton>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
      
      {selectedContract && (
        <SignContractModal
          isOpen={isSignModalOpen}
          onClose={() => {
            setIsSignModalOpen(false);
            setSelectedContract(null);
          }}
          onSubmit={handleSignContract}
          contract={selectedContract}
          employeeName={user?.user_metadata?.name || ''}
          isLoading={isSubmitting}
          assignmentId={selectedAssignmentId}
          status={selectedAssignmentStatus}
        />
      )}
    </div>
  );
};

export default MyContracts;