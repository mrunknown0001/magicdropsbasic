import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { Employee } from '../../hooks/useEmployees';
import { DocumentType, documentTypes } from '../profile/KycDocumentUpload';
import { 
  FileText, 
  X, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardContent, CardTitle } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';


interface UploadedDocument {
  path: string;
  type: DocumentType;
  name: string;
  size: number;
  created_at: string;
  url?: string;
}

interface KycDocumentViewerProps {
  employee: Employee;
  onStatusUpdate?: () => void;
}

const KycDocumentViewer: React.FC<KycDocumentViewerProps> = ({ 
  employee, 
  onStatusUpdate 
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [freshEmployeeData, setFreshEmployeeData] = useState<Employee | null>(null);

  // Force refresh employee data from database on every mount
  useEffect(() => {
    const fetchFreshEmployeeData = async () => {
      if (!employee.id) return;
      
      try {
        console.log('🔍 Fetching FRESH employee data from database for:', employee.id);
        
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', employee.id)
          .single();
        
        if (error) {
          console.error('Error fetching fresh employee data:', error);
          return;
        }
        
        if (data) {
          const freshEmployee = {
            ...data,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unnamed',
          } as Employee;
          
          console.log('🔍 FRESH employee data from database:', {
            id: freshEmployee.id,
            kyc_status: freshEmployee.kyc_status,
            updated_at: freshEmployee.updated_at
          });
          
          setFreshEmployeeData(freshEmployee);
        }
      } catch (error) {
        console.error('Error fetching fresh employee data:', error);
      }
    };
    
    fetchFreshEmployeeData();
  }, [employee.id]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!employee.id) return;

    console.log('🔍 Setting up real-time subscription for employee:', employee.id);
    
    const subscription = supabase
      .channel(`profile-changes-${employee.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${employee.id}`
        },
        (payload) => {
          console.log('🔍 Real-time profile update received:', payload);
          
          if (payload.new) {
            const updatedEmployee = {
              ...payload.new,
              name: `${payload.new.first_name || ''} ${payload.new.last_name || ''}`.trim() || 'Unnamed',
            } as Employee;
            
            console.log('🔍 Updating local state with real-time data:', {
              old_status: freshEmployeeData?.kyc_status,
              new_status: updatedEmployee.kyc_status
            });
            
            setFreshEmployeeData(updatedEmployee);
            
            // Also notify parent component of the change
            if (onStatusUpdate) {
              onStatusUpdate();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔍 Subscription status:', status);
        
        // Don't attempt to reconnect on auth errors to prevent infinite loops
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('🔍 Subscription failed, not attempting to reconnect to prevent infinite loop');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔍 Cleaning up real-time subscription');
      supabase.removeChannel(subscription);
    };
  }, [employee.id, onStatusUpdate]); // Removed freshEmployeeData dependency to prevent subscription recreation

  useEffect(() => {
    if (employee.id) {
      console.log('🔍 KycDocumentViewer - Employee data received:', {
        id: employee.id,
        name: employee.name,
        kyc_status: employee.kyc_status,
        created_at: employee.created_at,
        updated_at: employee.updated_at
      });
      
      if (freshEmployeeData) {
        console.log('🔍 Comparing prop vs fresh data:', {
          prop_kyc_status: employee.kyc_status,
          fresh_kyc_status: freshEmployeeData.kyc_status,
          prop_updated_at: employee.updated_at,
          fresh_updated_at: freshEmployeeData.updated_at
        });
      }
      
      loadEmployeeDocuments();
    }
  }, [employee.id, employee.kyc_status, freshEmployeeData]);

  // Use fresh data if available, otherwise fallback to prop data
  const currentEmployee = freshEmployeeData || employee;

  const loadEmployeeDocuments = async () => {
    setLoading(true);
    try {
      console.log('Loading KYC documents for employee:', employee.id);
      
      // List all files in the employee's KYC folder
      const { data, error } = await supabase.storage
        .from('kyc_documents')
        .list(`${employee.id}`, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
        
      if (error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          // No documents uploaded yet
          setDocuments([]);
          return;
        }
        throw error;
      }
      
      console.log('Files found in storage:', data);
      
      // Process documents (filter out .keep files)
      const filteredFiles = (data || []).filter(file => file.name !== '.keep');
      console.log('Filtered files (excluding .keep):', filteredFiles);
      
      const processedDocuments: UploadedDocument[] = await Promise.all(
        (data || [])
          .filter(file => file.name !== '.keep') // Filter out .keep files
          .map(async (file) => {
          const path = `${employee.id}/${file.name}`;
          
          // Extract document type from filename
          let docType: DocumentType;
          let displayName: string;
          
          const docTypeValues = Object.values(DocumentType);
          const docTypeFound = docTypeValues.find(type => file.name.startsWith(`${type}_`));
          
          if (docTypeFound) {
            docType = docTypeFound;
            displayName = file.name.substring(docTypeFound.length + 1);
          } else {
            console.warn('Could not determine document type from filename:', file.name);
            const nameParts = file.name.split('_');
            docType = nameParts[0] as DocumentType;
            displayName = nameParts.slice(1).join('_');
          }
          
          // Get signed URL for viewing (valid for 1 hour)
          const { data: { signedUrl }, error: urlError } = await supabase.storage
            .from('kyc_documents')
            .createSignedUrl(path, 3600);
          
          if (urlError) {
            console.error('Error creating signed URL:', urlError);
          }
          
          return {
            path,
            type: docType,
            name: displayName,
            size: file.metadata?.size || 0,
            created_at: file.created_at || new Date().toISOString(),
            url: signedUrl || undefined
          };
        })
      );
      
      setDocuments(processedDocuments);
      console.log('🔍 Documents loaded:', {
        employee_id: currentEmployee.id,
        employee_kyc_status: currentEmployee.kyc_status,
        document_count: processedDocuments.length,
        documents: processedDocuments.map(doc => ({
          type: doc.type,
          name: doc.name,
          path: doc.path
        }))
      });
    } catch (error) {
      console.error('Error loading employee documents:', error);
      toast.error('Fehler beim Laden der KYC-Dokumente');
    } finally {
      setLoading(false);
    }
  };

  const updateKycStatus = async (
    newStatus: 'approved' | 'rejected' | 'in_review',
    rejectionReason?: string
  ) => {
    if (!user) return;
    
    // Optimistic update - update UI immediately
    const currentData = freshEmployeeData || employee;
    const optimisticUpdate = {
      ...currentData,
      kyc_status: newStatus,
      updated_at: new Date().toISOString(),
      ...(newStatus === 'approved' && {
        kyc_verified_at: new Date().toISOString(),
        kyc_verified_by: user.id
      }),
      ...(newStatus === 'rejected' && {
        kyc_verified_at: null,
        kyc_verified_by: null,
        kyc_documents: {
          ...currentData.kyc_documents,
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        }
      })
    } as Employee;
    
    console.log('🔍 Optimistic update - setting UI to:', {
      old_status: currentData.kyc_status,
      new_status: newStatus
    });
    
    // Update UI immediately
    setFreshEmployeeData(optimisticUpdate);
    
    setUpdating(true);
    try {
      const updateData: any = {
        kyc_status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'approved') {
        updateData.kyc_verified_at = new Date().toISOString();
        updateData.kyc_verified_by = user.id;
      } else if (newStatus === 'rejected') {
        updateData.kyc_verified_at = null;
        updateData.kyc_verified_by = null;
        // Store rejection reason in kyc_documents field
        updateData.kyc_documents = {
          ...currentEmployee.kyc_documents,
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        };
      }
      
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', currentEmployee.id);
        
      if (error) throw error;
      
      const statusText = newStatus === 'approved' ? 'genehmigt' : 
                        newStatus === 'rejected' ? 'abgelehnt' : 'zur Überprüfung markiert';
      
      toast.success(`KYC-Status erfolgreich ${statusText}`);
      
      console.log('🔍 Database update successful, status:', newStatus);
      
      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      
      // Revert optimistic update on error
      console.log('🔍 Reverting optimistic update due to error');
      setFreshEmployeeData(currentData);
      
      toast.error('Fehler beim Aktualisieren des KYC-Status');
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = () => {
    if (window.confirm('Sind Sie sicher, dass Sie die KYC-Verifizierung genehmigen möchten?')) {
      updateKycStatus('approved');
    }
  };

  const handleReject = () => {
    const reason = window.prompt('Bitte geben Sie einen Grund für die Ablehnung ein:');
    if (reason) {
      updateKycStatus('rejected', reason);
    }
  };

  const getStatusInfo = () => {
    switch (currentEmployee.kyc_status) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: 'Genehmigt',
          color: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-800 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: 'Abgelehnt',
          color: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'in_review':
        return {
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          text: 'In Überprüfung',
          color: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
          text: 'Ausstehend',
          color: 'bg-amber-50 dark:bg-amber-900/20',
          textColor: 'text-amber-800 dark:text-amber-300',
          borderColor: 'border-amber-200 dark:border-amber-800'
        };
    }
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const config = documentTypes.find(doc => doc.id === type);
    return config?.label || type;
  };

  const openDocument = (document: UploadedDocument) => {
    if (document.url) {
      if (document.name.toLowerCase().includes('.pdf')) {
        // Open PDF in new tab
        window.open(document.url, '_blank');
      } else {
        // Show image in modal
        setSelectedDocument(document);
        setShowImageModal(true);
      }
    }
  };

  const downloadDocument = async (document: UploadedDocument) => {
    try {
      if (document.url) {
        const response = await fetch(document.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Fehler beim Herunterladen des Dokuments');
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KYC-Verifizierung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <User className="mr-2" size={20} />
              KYC-Verifizierung
            </span>
            <div className={`flex items-center px-3 py-1 rounded-full border ${statusInfo.borderColor} ${statusInfo.color}`}>
              {updating ? (
                <LoadingSpinner size="sm" />
              ) : (
                statusInfo.icon
              )}
              <span className={`ml-2 text-sm font-medium ${statusInfo.textColor}`}>
                {updating ? 'Wird aktualisiert...' : statusInfo.text}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Information */}
          <div className={`p-4 rounded-lg border ${statusInfo.borderColor} ${statusInfo.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className={`font-medium ${statusInfo.textColor}`}>
                  Verifizierungsstatus
                </h4>
                <p className={`text-sm ${statusInfo.textColor} opacity-80 mt-1`}>
                  {currentEmployee.kyc_status === 'approved' && currentEmployee.kyc_verified_at && (
                    <>Verifiziert am {new Date(currentEmployee.kyc_verified_at).toLocaleDateString('de-DE')}</>
                  )}
                  {currentEmployee.kyc_status === 'rejected' && currentEmployee.kyc_documents?.rejection_reason && (
                    <>Grund: {currentEmployee.kyc_documents.rejection_reason}</>
                  )}
                  {currentEmployee.kyc_status === 'in_review' && (
                    <>Dokumente wurden eingereicht und warten auf Überprüfung</>
                  )}
                  {currentEmployee.kyc_status === 'pending' && (
                    <>Noch keine Dokumente eingereicht</>
                  )}
                </p>
              </div>
              
              {/* Action Buttons - Show for in_review status or pending with documents */}
              {(() => {
                const shouldShowButtons = (currentEmployee.kyc_status === 'in_review' || (currentEmployee.kyc_status === 'pending' && documents.length > 0));
                console.log('🔍 Button visibility check:', {
                  kyc_status: currentEmployee.kyc_status,
                  documents_length: documents.length,
                  shouldShowButtons: shouldShowButtons
                });
                return shouldShowButtons;
              })() && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApprove}
                    disabled={updating}
                    leftIcon={<CheckCircle size={16} />}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Genehmigen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReject}
                    disabled={updating}
                    leftIcon={<XCircle size={16} />}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Ablehnen
                  </Button>
                </div>
              )}
              
              {currentEmployee.kyc_status === 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateKycStatus('in_review')}
                  disabled={updating}
                  leftIcon={<Clock size={16} />}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Erneut prüfen
                </Button>
              )}
              
              {currentEmployee.kyc_status === 'rejected' && documents.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateKycStatus('in_review')}
                  disabled={updating}
                  leftIcon={<Clock size={16} />}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Erneut bewerten
                </Button>
              )}
              

            </div>
          </div>

          {/* Documents List */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Hochgeladene Dokumente ({documents.length})
            </h4>
            
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <X className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Keine Dokumente hochgeladen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document, index) => (
                  <motion.div
                    key={document.path}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {getDocumentTypeLabel(document.type)}
                        </h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {document.name} • {(document.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-gray-400">
                          Hochgeladen am {new Date(document.created_at).toLocaleDateString('de-DE')} {new Date(document.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDocument(document)}
                        leftIcon={<ExternalLink size={16} />}
                        title="Dokument anzeigen"
                      >
                        Anzeigen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadDocument(document)}
                        leftIcon={<Download size={16} />}
                        title="Dokument herunterladen"
                      >
                        Download
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Modal */}
      {showImageModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {getDocumentTypeLabel(selectedDocument.type)}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageModal(false)}
                leftIcon={<XCircle size={16} />}
              >
                Schließen
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedDocument.url}
                alt={selectedDocument.name}
                className="max-w-full h-auto"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KycDocumentViewer; 