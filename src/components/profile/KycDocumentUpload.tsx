import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, X, Upload, FileText, ExternalLink, Clock, XCircle, AlertCircle, Building, User, Check } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { ensureKycDirectoryExists } from '../../lib/storageHelpers';
import { Profile } from '../../types/database';

export enum DocumentType {
  IDENTITY_CARD_FRONT = 'identity_card_front',
  IDENTITY_CARD_BACK = 'identity_card_back',
  PASSPORT = 'passport',
  DRIVERS_LICENSE_FRONT = 'drivers_license_front',
  DRIVERS_LICENSE_BACK = 'drivers_license_back',
  ADDRESS_PROOF = 'address_proof'
}

export enum IdentityDocType {
  IDENTITY_CARD = 'identity_card',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license'
}

interface IdentityTypeConfig {
  id: IdentityDocType;
  label: string;
  description: string;
  icon: React.ReactNode;
  documentTypes: DocumentType[];
}

interface DocumentTypeConfig {
  id: DocumentType;
  label: string;
  description: string;
  acceptedFileTypes: string;
  required: boolean;
}

// Configuration for identity document types
const identityTypes: IdentityTypeConfig[] = [
  {
    id: IdentityDocType.IDENTITY_CARD,
    label: 'Personalausweis',
    description: 'Vorder- und Rückseite Ihres Personalausweises',
    icon: <User className="h-5 w-5" />,
    documentTypes: [DocumentType.IDENTITY_CARD_FRONT, DocumentType.IDENTITY_CARD_BACK]
  },
  {
    id: IdentityDocType.PASSPORT,
    label: 'Reisepass',
    description: 'Hauptseite mit Ihrem Foto',
    icon: <Building className="h-5 w-5" />,
    documentTypes: [DocumentType.PASSPORT]
  },
  {
    id: IdentityDocType.DRIVERS_LICENSE,
    label: 'Führerschein',
    description: 'Vorder- und Rückseite Ihres Führerscheins',
    icon: <User className="h-5 w-5" />,
    documentTypes: [DocumentType.DRIVERS_LICENSE_FRONT, DocumentType.DRIVERS_LICENSE_BACK]
  }
];

// Configuration for individual document types
export const documentTypes: DocumentTypeConfig[] = [
  {
    id: DocumentType.IDENTITY_CARD_FRONT,
    label: 'Personalausweis (Vorderseite)',
    description: 'Vorderseite Ihres Personalausweises',
    acceptedFileTypes: 'image/jpeg,image/png,application/pdf',
    required: true
  },
  {
    id: DocumentType.IDENTITY_CARD_BACK,
    label: 'Personalausweis (Rückseite)',
    description: 'Rückseite Ihres Personalausweises',
    acceptedFileTypes: 'image/jpeg,image/png,application/pdf',
    required: true
  },
  {
    id: DocumentType.PASSPORT,
    label: 'Reisepass',
    description: 'Hauptseite mit Ihrem Foto',
    acceptedFileTypes: 'image/jpeg,image/png,application/pdf',
    required: true
  },
  {
    id: DocumentType.DRIVERS_LICENSE_FRONT,
    label: 'Führerschein (Vorderseite)',
    description: 'Vorderseite Ihres Führerscheins',
    acceptedFileTypes: 'image/jpeg,image/png,application/pdf',
    required: true
  },
  {
    id: DocumentType.DRIVERS_LICENSE_BACK,
    label: 'Führerschein (Rückseite)',
    description: 'Rückseite Ihres Führerscheins',
    acceptedFileTypes: 'image/jpeg,image/png,application/pdf',
    required: true
  },
  {
    id: DocumentType.ADDRESS_PROOF,
    label: 'Adressnachweis',
    description: 'Beispiel: Stromrechnung, Mietvertrag (nicht älter als 3 Monate)',
    acceptedFileTypes: 'image/jpeg,image/png,application/pdf',
    required: true
  }
];

interface KycDocumentUploadProps {
  onUploadComplete?: () => void;
}

interface UploadedDocument {
  path: string;
  type: DocumentType;
  name: string;
  size: number;
  created_at: string;
  url?: string;
}

const KycDocumentUpload: React.FC<KycDocumentUploadProps> = ({ onUploadComplete }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<Profile['kyc_status']>(profile?.kyc_status || 'pending');
  const [selectedIdentityType, setSelectedIdentityType] = useState<IdentityDocType | null>(null);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  
  // File input refs for direct trigger
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  
  useEffect(() => {
    if (user) {
      // Ensure the directory exists and then load documents
      ensureKycDirectoryExists(user.id).then(() => {
        loadExistingDocuments();
      });
    }
  }, [user]);
  
  useEffect(() => {
    // Update KYC status when profile changes
    if (profile?.kyc_status) {
      setKycStatus(profile.kyc_status);
    }
  }, [profile]);

  // Add effect to set up real-time profile updates
  useEffect(() => {
    if (!user) return;

    // Refresh immediately when component mounts
    refreshProfile();

    // Set up real-time subscription to listen for profile changes
    const subscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated via real-time subscription:', payload);
          // Refresh profile when we detect a change
          refreshProfile();
        }
      )
      .subscribe();

    // Set up periodic refresh as fallback (reduced frequency since we have real-time)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshProfile();
      }
    };

    // Refresh every 60 seconds as fallback while document is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshProfile();
      }
    }, 60000);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Clean up subscription
      supabase.removeChannel(subscription);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshProfile]);

  // Determine which identity document type is selected based on uploaded documents
  useEffect(() => {
    if (uploadedDocuments.length > 0) {
      // Check for ID card
      if (uploadedDocuments.some(doc => doc.type === DocumentType.IDENTITY_CARD_FRONT || doc.type === DocumentType.IDENTITY_CARD_BACK)) {
        setSelectedIdentityType(IdentityDocType.IDENTITY_CARD);
      } 
      // Check for passport
      else if (uploadedDocuments.some(doc => doc.type === DocumentType.PASSPORT)) {
        setSelectedIdentityType(IdentityDocType.PASSPORT);
      }
      // Check for driver's license
      else if (uploadedDocuments.some(doc => doc.type === DocumentType.DRIVERS_LICENSE_FRONT || doc.type === DocumentType.DRIVERS_LICENSE_BACK)) {
        setSelectedIdentityType(IdentityDocType.DRIVERS_LICENSE);
      }
    }
  }, [uploadedDocuments]);
  
  const loadExistingDocuments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('Loading existing documents for user:', user.id);
      // List all files in the user's folder
      const { data, error } = await supabase.storage
        .from('kyc_documents')
        .list(`${user.id}`, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
        
      if (error) throw error;
      
      console.log('Files found in storage:', data);
      
      // Extract document type from the filename (filter out .keep files)
      const documents: UploadedDocument[] = await Promise.all(
        (data || [])
          .filter(file => file.name !== '.keep') // Filter out .keep files
          .map(async (file) => {
        const path = `${user.id}/${file.name}`;
        
        // FIX: Properly extract document type from filename
        // Format is: documentType_filename.ext
        let docType: DocumentType;
        let displayName: string;
        
        // Try to match the document type from the filename
        const docTypeValues = Object.values(DocumentType);
        const docTypeFound = docTypeValues.find(type => file.name.startsWith(`${type}_`));
        
        if (docTypeFound) {
          docType = docTypeFound;
          // Remove the document type prefix to get the display name
          displayName = file.name.substring(docTypeFound.length + 1); // +1 for the underscore
        } else {
          // Fallback if we can't determine the document type
          console.warn('Could not determine document type from filename:', file.name);
          const nameParts = file.name.split('_');
          docType = nameParts[0] as DocumentType;
          displayName = nameParts.slice(1).join('_');
        }
        
        console.log(`Parsed document: type=${docType}, name=${displayName}, file=${file.name}`);
        
        // Get temporary URL for preview
        const { data: { publicUrl } } = supabase.storage
          .from('kyc_documents')
          .getPublicUrl(path);
          
        return {
          path,
          type: docType,
          name: displayName,
          size: file.metadata?.size || 0,
          created_at: file.created_at || new Date().toISOString(),
          url: publicUrl
        };
      }));
      
      console.log('Processed documents:', documents);
      setUploadedDocuments(documents);
    } catch (error) {
      console.error('Error loading existing documents:', error);
      toast.error('Fehler beim Laden der Dokumente');
    } finally {
      setIsLoading(false);
    }
  };
  
  const uploadDocument = async (type: DocumentType, file: File) => {
    if (!user) {
      toast.error('Sie müssen angemeldet sein, um Dokumente hochzuladen');
      return;
    }
    
    // Create a unique key for tracking this upload
    const uploadKey = `${type}_${Date.now()}`;
    
    // Update uploading state
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    
    try {
      // Try to ensure the directory exists, but continue even if this fails
      try {
        await ensureKycDirectoryExists(user.id);
      } catch (dirError) {
        console.error('Directory creation error, continuing anyway:', dirError);
        // Don't return - proceed with upload attempt
      }
      
      // Create the file path with document type prefix
      const fileName = `${type}_${file.name}`;
      const filePath = `${user.id}/${fileName}`;
      
      // Try to upload directly regardless of directory creation success
      console.log('Attempting to upload file to:', filePath);
      const { error } = await supabase.storage
        .from('kyc_documents')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });
        
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      // Generate public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(filePath);
      
      // CRITICAL FIX: Update the uploaded documents state locally immediately
      const newDocument: UploadedDocument = {
        path: filePath,
        type: type,
        name: file.name,
        size: file.size,
        created_at: new Date().toISOString(),
        url: publicUrl
      };
      
      // Update UI state with the new document
      setUploadedDocuments(prev => {
        // Remove any existing document of this type
        const filtered = prev.filter(doc => doc.type !== type);
        // Add the new document
        return [...filtered, newDocument];
      });
      
      toast.success(`Dokument "${docTypeToLabel(type)}" erfolgreich hochgeladen`);
      
      // Also try to refresh from server for consistency (but local update already happened)
      try {
        await loadExistingDocuments();
      } catch (loadError) {
        console.error('Error refreshing document list:', loadError);
        // Already updated local state, so continue
      }
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Fehler beim Hochladen des Dokuments');
    } finally {
      // Remove from uploading state
      setUploading(prev => {
        const newState = { ...prev };
        delete newState[uploadKey];
        return newState;
      });
    }
  };
  
  const deleteDocument = async (path: string, docType: DocumentType) => {
    try {
      setIsLoading(true);
      console.log('Deleting document:', path, 'of type:', docType);
      
      const { error } = await supabase.storage
        .from('kyc_documents')
        .remove([path]);
        
      if (error) throw error;
      
      toast.success('Dokument erfolgreich gelöscht. Sie können jetzt ein neues hochladen.');
      
      console.log('Document deleted successfully, updating UI');
      
      // Update the local state to remove the deleted document immediately
      setUploadedDocuments(prev => prev.filter(doc => doc.path !== path));
      
      // Check if we need to reset the selected identity type
      if (docType !== DocumentType.ADDRESS_PROOF) {
        const remainingIdDocs = uploadedDocuments.filter(
          doc => doc.path !== path && doc.type !== DocumentType.ADDRESS_PROOF
        );
        
        if (remainingIdDocs.length === 0) {
          setSelectedIdentityType(null);
        }
      }

      // Automatically trigger file input if we're on a desktop browser
      setTimeout(() => {
        if (window.innerWidth >= 768) {
          console.log('Triggering file input for replacement upload:', docType);
          triggerFileInput(docType);
        }
      }, 500);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Fehler beim Löschen des Dokuments');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Direct trigger for file input
  const triggerFileInput = (docType: DocumentType) => {
    console.log('Triggering file input for:', docType);
    
    // Use a short timeout to ensure the UI is ready
    setTimeout(() => {
      if (fileInputRefs.current[docType]) {
        console.log('File input found, clicking:', fileInputRefs.current[docType]);
        fileInputRefs.current[docType]?.click();
      } else {
        console.warn('File input ref not found for:', docType);
        // Fallback: try to find by ID
        const inputElement = document.getElementById(`file-input-${docType}`) as HTMLInputElement;
        if (inputElement) {
          console.log('Found input by ID, clicking instead');
          inputElement.click();
        } else {
          console.error('Could not find input element by ref or ID');
        }
      }
    }, 100);
  };
  
  const handleFileChange = (docType: DocumentType, event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`File input change for ${docType}:`, event.target.files);
    const file = event.target.files?.[0];
    if (!file) {
      console.warn('No file selected for upload');
      return;
    }
    
    console.log(`File selected for upload: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    // Process the upload
    uploadDocument(docType, file);
    
    // Reset the file input to allow selecting the same file again
    event.target.value = '';
  };
  
  const handleIdentityTypeSelect = (type: IdentityDocType) => {
    if (selectedIdentityType === type) {
      return; // Already selected, do nothing
    }
    
    // If there are already uploaded documents for a different identity type, confirm before changing
    const hasOtherIdentityDocs = uploadedDocuments.some(doc => {
      // Skip address proof
      if (doc.type === DocumentType.ADDRESS_PROOF) return false;
      
      // Check if doc is from a different identity type
      const docIdentityType = getIdentityTypeForDocument(doc.type);
      return docIdentityType !== null && docIdentityType !== type;
    });
    
    if (hasOtherIdentityDocs) {
      const confirmChange = window.confirm(
        'Sie haben bereits einen anderen Identitätsnachweis hochgeladen. Wenn Sie fortfahren, werden die vorhandenen Dokumente gelöscht. Möchten Sie fortfahren?'
      );
      
      if (!confirmChange) {
        return;
      }
      
      // Delete existing identity documents before changing selection
      uploadedDocuments.forEach(doc => {
        if (doc.type !== DocumentType.ADDRESS_PROOF) {
          deleteDocument(doc.path, doc.type);
        }
      });
    }
    
    setSelectedIdentityType(type);
  };
  
  const getIdentityTypeForDocument = (docType: DocumentType): IdentityDocType | null => {
    if (docType === DocumentType.IDENTITY_CARD_FRONT || docType === DocumentType.IDENTITY_CARD_BACK) {
      return IdentityDocType.IDENTITY_CARD;
    } else if (docType === DocumentType.PASSPORT) {
      return IdentityDocType.PASSPORT;
    } else if (docType === DocumentType.DRIVERS_LICENSE_FRONT || docType === DocumentType.DRIVERS_LICENSE_BACK) {
      return IdentityDocType.DRIVERS_LICENSE;
    }
    return null;
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const getDocumentStatusIcon = (docType: DocumentType) => {
    const hasDocument = uploadedDocuments.some(doc => doc.type === docType);
    
    if (hasDocument) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <X className="h-5 w-5 text-amber-500" />;
    }
  };

  // Function to get the color and text for the KYC status
  const getKycStatusInfo = () => {
    switch (kycStatus) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: 'Verifizierung abgeschlossen',
          description: 'Ihre Identität wurde erfolgreich verifiziert.',
          color: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-800 dark:text-green-300'
        };
      case 'in_review':
        return {
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          text: 'In Überprüfung',
          description: 'Ihre Dokumente wurden erfolgreich eingereicht. Wir werden Sie in Kürze überprüfen.',
          color: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-300'
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: 'Verifizierung abgelehnt',
          description: 'Ihre Dokumente wurden abgelehnt. Bitte laden Sie neue Dokumente hoch und reichen Sie diese erneut zur Überprüfung ein.',
          color: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-300'
        };
      default: // pending
        return {
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
          text: 'Verifizierung ausstehend',
          description: 'Bitte laden Sie die erforderlichen Dokumente hoch, um Ihre Identität zu verifizieren.',
          color: 'bg-amber-50 dark:bg-amber-900/20',
          textColor: 'text-amber-800 dark:text-amber-300'
        };
    }
  };

  // Update the KYC status
  const updateKycStatus = async (newStatus: 'pending' | 'in_review' = 'in_review') => {
    if (!user) return;
    
    try {
      const updateData: any = {
        kyc_status: newStatus
      };
      
      // If moving from rejected to in_review, clear rejection reason
      if (newStatus === 'in_review' && kycStatus === 'rejected') {
        updateData.kyc_documents = {
          ...profile?.kyc_documents,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null
        };
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setKycStatus(newStatus);
      
      if (newStatus === 'in_review') {
        if (kycStatus === 'rejected') {
          toast.success('Vielen Dank! Ihre überarbeiteten Dokumente wurden zur erneuten Überprüfung eingereicht');
        } else {
          toast.success('Vielen Dank! Ihre Dokumente wurden zur Überprüfung eingereicht');
        }
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast.error('Fehler beim Aktualisieren des Verifizierungsstatus');
    }
  };

  // Submit KYC verification documents for review
  const submitKycVerification = async () => {
    if (!user) return;
    
    setSubmittingKyc(true);
    
    try {
      // Update KYC status to in_review
      await updateKycStatus('in_review');
      
      // Show success toast with clear message about what happened
      toast.success(
        'Dokumente erfolgreich eingereicht! Wir werden Ihre Identität innerhalb von 24 Stunden verifizieren.', 
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Error submitting KYC verification:', error);
      toast.error('Es gab ein Problem bei der Einreichung Ihrer Dokumente. Bitte versuchen Sie es später erneut.');
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Get the required document types based on selected identity type
  const getRequiredDocuments = () => {
    const requiredDocs: DocumentType[] = [];
    
    // Always include address proof
    requiredDocs.push(DocumentType.ADDRESS_PROOF);
    
    // Add identity documents based on selection
    if (selectedIdentityType) {
      const identityConfig = identityTypes.find(type => type.id === selectedIdentityType);
      if (identityConfig) {
        requiredDocs.push(...identityConfig.documentTypes);
      }
    }
    
    return requiredDocs;
  };

  // Check if all required documents are uploaded
  const areAllRequiredDocumentsUploaded = () => {
    if (!selectedIdentityType) return false;
    
    const requiredDocs = getRequiredDocuments();
    return requiredDocs.every(docType => 
      uploadedDocuments.some(doc => doc.type === docType)
    );
  };

  // Render a document upload item
  const renderDocumentUpload = (docType: DocumentType) => {
    const docConfig = documentTypes.find(config => config.id === docType);
    if (!docConfig) return null;
    
    const hasUploaded = uploadedDocuments.some(doc => doc.type === docType);
    const uploadedDoc = uploadedDocuments.find(doc => doc.type === docType);
    const isUploading = Object.values(uploading).some(val => val) && uploading[docType];
    
    // DEBUG: Log document info for this document type
    console.log(`Rendering ${docType}:`, { 
      hasUploaded, 
      uploadedDoc, 
      uploadedDocCount: uploadedDocuments.length,
      allDocs: uploadedDocuments
    });
    
    return (
      <motion.div 
        key={docConfig.id}
        className={`border ${hasUploaded ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'} rounded-lg p-4 hover:shadow-sm transition-all`}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium flex flex-wrap items-center gap-2 text-gray-800 dark:text-gray-200">
              {getDocumentStatusIcon(docType)}
              <span className="break-words">{docConfig.label}</span>
              {hasUploaded && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full flex-shrink-0">
                  Hochgeladen
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words">{docConfig.description}</p>
            
            {uploadedDoc && (
              <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded-md border border-green-100 dark:border-green-900/20">
                {/* Mobile-optimized layout */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
                  <div className="flex items-center flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {uploadedDoc.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(uploadedDoc.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:ml-2 flex-shrink-0">
                    {uploadedDoc.url && (
                      <a 
                        href={uploadedDoc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Dokument anzeigen"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteDocument(uploadedDoc.path, uploadedDoc.type)}
                      className="flex items-center justify-center p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Dokument löschen und erneut hochladen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500 flex-shrink-0" />
                  <span className="leading-relaxed">Erfolgreich hochgeladen. Sie können dieses Dokument löschen und bei Bedarf ein neues hochladen.</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end sm:justify-start">
            {/* Hidden file input with ref */}
            <input
              type="file"
              ref={ref => fileInputRefs.current[docType] = ref}
              accept={docConfig.acceptedFileTypes}
              onChange={(e) => handleFileChange(docType, e)}
              className="hidden"
              aria-hidden="true"
              id={`file-input-${docType}`}
            />
            {/* Direct button to trigger file selection */}
            <Button
              size="sm"
              variant={hasUploaded ? "outline" : "primary"}
              leftIcon={hasUploaded ? <Upload size={16} /> : <Upload size={16} />}
              isLoading={isUploading}
              disabled={isUploading}
              onClick={() => triggerFileInput(docType)}
              type="button"
              className={`${hasUploaded ? "border-green-500 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20" : ""} w-full sm:w-auto`}
            >
              {hasUploaded ? 'Neu hochladen' : 'Hochladen'}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Helper to get a friendly label for document types
  const docTypeToLabel = (type: DocumentType): string => {
    const config = documentTypes.find(doc => doc.id === type);
    return config?.label || type;
  };

  // Add a useEffect to track uploadedDocuments state changes
  useEffect(() => {
    console.log('All uploaded documents state changed:', uploadedDocuments);
  }, [uploadedDocuments]);

  // Function to render a summary of uploaded documents
  const renderDocumentSummary = () => {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2">
                Ihre Dokumente wurden erfolgreich eingereicht
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Vielen Dank für das Einreichen Ihrer Dokumente. Ihre Dokumente wurden erfolgreich eingereicht. Wir werden Sie in Kürze überprüfen.
              </p>
            </div>
          </div>
        </div>
        
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Eingereichte Dokumente:</h3>
        
        <div className="space-y-4 mt-2">
          {uploadedDocuments.map(doc => {
            const docConfig = documentTypes.find(config => config.id === doc.type);
            
            return (
              <div key={doc.path} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
                  <div className="flex items-center flex-1 min-w-0">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {docConfig?.label || docTypeToLabel(doc.type)}
                    </h4>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                        <span className="font-medium">{doc.name}</span>
                        <span className="ml-1">({formatFileSize(doc.size)})</span>
                      </div>
                    </div>
                  </div>
                  {doc.url && (
                    <div className="flex justify-end sm:justify-start">
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                        className="flex items-center justify-center p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Dokument anzeigen"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
            <AlertCircle className="h-4 w-4 mr-1 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="break-words">
            Sollten weitere Informationen benötigt werden, werden wir Sie kontaktieren. 
            Sie können den Status Ihrer Verifizierung jederzeit hier einsehen.
            </span>
          </p>
        </div>
      </div>
    );
  };

  // Render the component based on loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* KYC Status Banner */}
      {kycStatus && (
        <div className={`${getKycStatusInfo().color} p-4 rounded-lg`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getKycStatusInfo().icon}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${getKycStatusInfo().textColor} mb-2`}>
                {getKycStatusInfo().text}
              </h3>
              <p className={`text-sm ${getKycStatusInfo().textColor} opacity-80`}>
                {getKycStatusInfo().description}
              </p>
              {kycStatus === 'approved' && profile?.kyc_verified_at && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Verifiziert am: {new Date(profile.kyc_verified_at).toLocaleDateString('de-DE')}
                </p>
              )}
              {kycStatus === 'rejected' && profile?.kyc_documents?.rejection_reason && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Grund der Ablehnung:
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {profile.kyc_documents.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Show document submission form based on status */}
      {kycStatus === 'in_review' ? (
        renderDocumentSummary()
      ) : kycStatus === 'approved' ? (
        // For approved status, only show the status banner above (no duplicate message)
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Ihre Verifizierung ist abgeschlossen. Sie haben vollen Zugriff auf alle Plattform-Funktionen.
          </p>
        </div>
      ) : (
        // Show upload form for pending and rejected statuses
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">KYC-Verifizierung</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {kycStatus === 'rejected' 
                ? 'Bitte laden Sie neue oder korrigierte Dokumente hoch und reichen Sie diese erneut zur Überprüfung ein.'
                : 'Um Ihre Identität zu verifizieren, wählen Sie zunächst ein Ausweisdokument und laden Sie anschließend die erforderlichen Dokumente hoch. Nach dem Hochladen aller Dokumente können Sie diese zur Überprüfung einreichen.'
              }
            </p>
          </div>
          
          {/* Identity document type selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">1. Wählen Sie Ihr Ausweisdokument:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {identityTypes.map(identityType => (
                <div 
                  key={identityType.id}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedIdentityType === identityType.id 
                      ? 'border-accent bg-accent/10 dark:bg-accent/5' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                  `}
                  onClick={() => handleIdentityTypeSelect(identityType.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-full 
                      ${selectedIdentityType === identityType.id 
                        ? 'bg-accent/20 text-accent dark:text-accent' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
                    `}>
                      {identityType.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">{identityType.label}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{identityType.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Required document uploads */}
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
              2. {selectedIdentityType ? 'Laden Sie die folgenden Dokumente hoch:' : 'Bitte wählen Sie zuerst ein Ausweisdokument aus'}
            </h3>
            
            {/* Show ID document upload fields based on selection first */}
            {selectedIdentityType && getRequiredDocuments()
              .filter(doc => doc !== DocumentType.ADDRESS_PROOF)
              .map(docType => renderDocumentUpload(docType))}
            
            {/* Show address proof after ID documents */}
            {selectedIdentityType && renderDocumentUpload(DocumentType.ADDRESS_PROOF)}
          </div>
          
          {/* Submit KYC verification button */}
          {selectedIdentityType && (kycStatus === 'pending' || kycStatus === 'rejected') && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
                    3. Reichen Sie Ihre Dokumente zur Überprüfung ein
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                    {kycStatus === 'rejected' 
                      ? 'Nachdem Sie neue oder korrigierte Dokumente hochgeladen haben, können Sie diese erneut zur Überprüfung einreichen.'
                      : 'Nachdem Sie alle erforderlichen Dokumente hochgeladen haben, können Sie diese zur Überprüfung einreichen.'
                    }
                  </p>
                </div>
                <div className="flex justify-center sm:justify-end">
                <Button
                  leftIcon={<User size={16} />}
                  disabled={!areAllRequiredDocumentsUploaded() || submittingKyc}
                  isLoading={submittingKyc}
                  onClick={submitKycVerification}
                  variant={areAllRequiredDocumentsUploaded() ? "primary" : "outline"}
                  className="w-full sm:w-auto sm:min-w-[200px]"
                >
                  {kycStatus === 'rejected' 
                    ? (areAllRequiredDocumentsUploaded() ? 'Erneut einreichen' : 'Dokumente fehlen')
                    : (areAllRequiredDocumentsUploaded() ? 'Zur Prüfung einreichen' : 'Dokumente fehlen')
                  }
                </Button>
                </div>
              </div>
              
              {!areAllRequiredDocumentsUploaded() && (
                <p className="text-sm text-amber-500 dark:text-amber-400 mt-2 flex items-start">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span className="break-words">Bitte laden Sie alle erforderlichen Dokumente hoch, bevor Sie die Überprüfung beantragen.</span>
                </p>
              )}
              
              {areAllRequiredDocumentsUploaded() && (
                <p className="text-sm text-green-500 dark:text-green-400 mt-2 flex items-start">
                  <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span className="break-words">Alle erforderlichen Dokumente wurden hochgeladen. Sie können Ihre Dokumente jetzt zur Überprüfung einreichen.</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KycDocumentUpload;