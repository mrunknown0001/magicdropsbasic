import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiDownload, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import AnimatedButton from '../ui/AnimatedButton';
import { Contract } from '../../types/database';
import { generateContractPDF } from '../../utils/pdfGenerator';
import SignaturePad from '../contracts/SignaturePad';
import { processContractVariables } from '../../utils/contractUtils';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface SignContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contractId: string, signatureData: string) => Promise<void>;
  contract: Contract | null;
  employeeName: string;
  isLoading: boolean;
  assignmentId?: string;
  status?: string;
}

const SignContractModal: React.FC<SignContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  employeeName,
  isLoading,
  assignmentId,
  status = 'pending'
}) => {
  if (!isOpen || !contract) return null;
  
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureError, setSignatureError] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { profile } = useAuth();
  const { settings } = useSettingsContext();
  
  // Determine if contract is already signed
  const isSigned = status === 'signed';
  
  const handleSignatureChange = (data: string) => {
    setSignatureData(data);
    if (data) {
      setSignatureError('');
    }
  };
  
  const handleSubmit = async () => {
    if (!contract) return;
    
    // Validate signature
    if (!signatureData) {
      setSignatureError('Bitte unterschreiben Sie den Vertrag');
      return;
    }
    
    try {
      await onSubmit(contract.id, signatureData);
    } catch (error) {
      console.error('Error signing contract:', error);
    }
  };
  
  const handleDownloadPDF = async () => {
    if (!contract) return;
    
    try {
      setIsGeneratingPDF(true);
      const loadingToast = toast.loading('PDF wird generiert...');
      
      // Get employee name from profile if available
      const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : employeeName;
      
      // Prepare employee data object for the contract template
      const employeeData = {
        name: fullName,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || '',
        street: profile?.street || '',
        city: profile?.city || '',
        postalCode: profile?.postal_code || '',
        dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('de-DE') : '',
      };
      
      // Ensure the contract has template_data property
      if (!contract.template_data) {
        contract.template_data = {};
      }
      
      // Add user data to contract template_data for variable replacement
      Object.assign(contract.template_data, employeeData);
      
      // Use signature data depending on the contract state
      let signatureToUse: string | undefined;
      
      if (isSigned) {
        // For already signed contracts, we need to fetch the signature from the database
        try {
          console.log('Attempting to retrieve signature for contract:', contract.id);
          
          // First try with assignment ID if available
          let query = supabase.from('contract_assignments').select('signature_data, status');
          
          if (assignmentId) {
            console.log('Using assignment ID for signature lookup:', assignmentId);
            query = query.eq('id', assignmentId);
          } else {
            console.log('No assignment ID, looking up by contract ID and status');
            query = query
              .eq('contract_id', contract.id)
              .eq('status', 'signed');
          }
          
          const { data, error } = await query.single();
            
          if (error) {
            console.error('Error in first signature query:', error);
            
            // Fallback: try direct query by contract ID only
            console.log('Trying fallback query by contract ID only');
            const fallbackResult = await supabase
              .from('contract_assignments')
              .select('signature_data')
              .eq('contract_id', contract.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
              
            if (fallbackResult.error) {
              throw fallbackResult.error;
            }
            
            if (fallbackResult.data && fallbackResult.data.signature_data) {
              console.log('Retrieved signature from fallback query');
              signatureToUse = fallbackResult.data.signature_data;
            } else {
              throw new Error('No signature found in fallback query');
            }
          } else if (data && data.signature_data) {
            console.log('Retrieved signature from primary query');
            signatureToUse = data.signature_data;
          } else {
            console.warn('No signature found in database for signed contract');
            toast.error('Unterschrift konnte nicht gefunden werden');
          }
        } catch (error) {
          console.error('Error fetching signature:', error);
          toast.error('Fehler beim Abrufen der Unterschrift');
        }
      } else if (signatureData) {
        // For contracts being signed now, use the signature from the pad
        console.log('Using signature from signature pad');
        signatureToUse = signatureData;
      }
      
      console.log('Generating PDF with signature:', signatureToUse ? 'Available' : 'Not available');
      
      // Prepare company settings for PDF generation
      const companySettings = settings ? {
        company_name: settings.company_name || '',
        company_address: settings.company_address || '',
        postal_code: settings.postal_code || '',
        city: settings.city || '',
        country: settings.country || '',
        contact_email: settings.contact_email || ''
      } : undefined;
      
      const pdfBlob = await generateContractPDF(contract, fullName, signatureToUse, companySettings);
      
      if (!pdfBlob) {
        throw new Error('PDF generation failed');
      }
      
      // Create a download link with a meaningful filename
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create a filename with contract title, user name and date
      const cleanTitle = contract.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
      const cleanName = fullName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0];
      
      a.download = `Vertrag_${cleanTitle}_${cleanName}_${date}.pdf`;
      a.click();
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.dismiss(loadingToast);
      toast.success('PDF erfolgreich generiert und heruntergeladen');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Fehler beim Generieren der PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  // Get employee name from profile if available
  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : employeeName;
  
  // Prepare employee data object for the contract template
  const employeeData = {
    name: fullName,
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || '',
    street: profile?.street || '',
    city: profile?.city || '',
    postalCode: profile?.postal_code || '',
    dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('de-DE') : '',
  };
  
  // Process contract content to replace all template variables
  const processedContent = processContractVariables(contract, employeeData);
  
  const modalVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isSigned ? 'Vertrag anzeigen' : 'Vertrag unterschreiben'}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <FiX size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Contract Preview with Company and Employee Sections */}
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{contract.title}</h3>
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div>
                <span className="font-medium">Erstellt am: </span>
                {new Date(contract.created_at).toLocaleDateString('de-DE')}
              </div>
              {isSigned && (
                <div>
                  <span className="text-green-600 font-medium">
                    ✓ Unterschrieben
                  </span>
                </div>
              )}
            </div>
            
            {/* Contract Between Section - Company and Employee */}
            <div className="mb-6">
              <h4 className="text-base font-medium mb-3 text-left">Vertrag zwischen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {/* Company Information */}
                <div>
                  <h5 className="text-sm font-semibold mb-2">Unternehmen:</h5>
                  <div className="space-y-1">
                    <p className="font-medium">{settings?.company_name}</p>
                    {settings?.company_address && <p>{settings.company_address}</p>}
                    {settings?.postal_code && settings?.city && (
                      <p>{settings.postal_code} {settings.city}</p>
                    )}
                    {settings?.country && <p>{settings.country}</p>}
                    {settings?.contact_email && <p>{settings.contact_email}</p>}
                  </div>
                </div>
                
                {/* Employee Information */}
                <div>
                  <h5 className="text-sm font-semibold mb-2">Mitarbeiter/in:</h5>
                  <div className="space-y-1">
                    <p className="font-medium">{fullName}</p>
                    {profile?.street && <p>{profile.street}</p>}
                    {profile?.postal_code && profile?.city && (
                      <p>{profile.postal_code} {profile.city}</p>
                    )}
                    {profile?.email && <p>{profile.email}</p>}
                    {profile?.date_of_birth && (
                      <p>Geburtsdatum: {new Date(profile.date_of_birth).toLocaleDateString('de-DE')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contract Content */}
            <div className="prose dark:prose-invert max-w-none">
              <div
                className="contract-content"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
          </div>
          
          {/* Only show signature pad if not already signed */}
          {!isSigned && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Ihre Unterschrift</h3>
            <SignaturePad 
              onChange={handleSignatureChange} 
              height={200} 
              className="mb-2"
            />
            {signatureError && (
              <div className="flex items-center text-red-500 mt-2">
                <FiAlertTriangle size={16} className="mr-2" />
                <span>{signatureError}</span>
              </div>
            )}
            {signatureData && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Vorschau Ihrer Unterschrift:</h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                  <img 
                    src={signatureData} 
                    alt="Signature Preview" 
                    className="h-16 mx-auto" 
                  />
                </div>
              </div>
            )}
          </div>
          )}
          
          <div className="flex justify-end gap-4">
            {!isSigned ? (
            <AnimatedButton
              onClick={handleSubmit}
              variant="primary"
              disabled={isLoading}
            >
              <FiCheck size={20} className="mr-2" />
              Unterschreiben
            </AnimatedButton>
            ) : null}
            
            <AnimatedButton
              onClick={handleDownloadPDF}
              variant="secondary"
              disabled={isLoading || isGeneratingPDF}
              isLoading={isGeneratingPDF}
            >
              <FiDownload size={20} className="mr-2" />
              Als PDF herunterladen
            </AnimatedButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignContractModal;
