import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { CheckCircle, X, Clock, AlertCircle, RefreshCw, User, FileText, ExternalLink, Eye, Download } from 'lucide-react';
import { DocumentType } from '../../components/profile/KycDocumentUpload';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface KYCSubmission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  kyc_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  kyc_documents?: any;
  kyc_verified_at?: string;
  updated_at: string;
  created_at: string;
}

const KYCReview: React.FC = () => {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'in_review' | 'approved' | 'rejected'>('in_review');
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const navigate = useNavigate();

  // Open KYC review modal with document loading
  const openKycModal = async (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setIsKycModalOpen(true);
    setLoadingDocuments(true);
    setDocumentUrls({}); // Clear previous documents
    
    // Load documents from storage bucket (exactly like KycDocumentViewer does)
    try {
        console.log('Loading KYC documents for employee:', submission.id);
        
        // List all files in the employee's KYC folder
        const { data, error } = await supabase.storage
          .from('kyc_documents')
          .list(`${submission.id}`, {
            sortBy: { column: 'created_at', order: 'desc' }
          });
          
        if (error) {
          if (error.message.includes('not found') || error.message.includes('does not exist')) {
            // No documents uploaded yet
            setDocumentUrls({});
            return;
          }
          throw error;
        }
        
        console.log('Files found in storage:', data);
        
        // Process documents (filter out .keep files)
        const filteredFiles = (data || []).filter(file => file.name !== '.keep');
        console.log('Filtered files (excluding .keep):', filteredFiles);
        
        const urls: Record<string, string> = {};
        
        for (const file of filteredFiles) {
          const path = `${submission.id}/${file.name}`;
          
          // Extract document type from filename
          let docType: DocumentType;
          
          const docTypeValues = Object.values(DocumentType);
          const docTypeFound = docTypeValues.find(type => file.name.startsWith(`${type}_`));
          
          if (docTypeFound) {
            docType = docTypeFound;
          } else {
            console.warn('Could not determine document type from filename:', file.name);
            const nameParts = file.name.split('_');
            docType = nameParts[0] as DocumentType;
          }
          
          // Get signed URL for viewing (valid for 1 hour)
          try {
            const { data: { signedUrl }, error: urlError } = await supabase.storage
              .from('kyc_documents')
              .createSignedUrl(path, 3600);
            
            if (urlError) {
              console.error('Error creating signed URL:', urlError);
            } else if (signedUrl) {
              urls[docType] = signedUrl;
            }
          } catch (urlError) {
            console.error(`Error creating signed URL for ${file.name}:`, urlError);
          }
        }
        
        setDocumentUrls(urls);
        console.log('Loaded document URLs:', Object.keys(urls));
        
      } catch (error) {
        console.error('Error in openKycModal:', error);
        toast.error('Fehler beim Laden der Dokumente');
      } finally {
        setLoadingDocuments(false);
      }
  };

  const fetchKYCSubmissions = async () => {
    try {
      setLoading(true);
      console.log('=== FETCH KYC SUBMISSIONS CALLED ===');
      
      // Use admin client to bypass RLS and get all employees with KYC activity
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, role, kyc_status, kyc_documents, kyc_verified_at, updated_at, created_at')
        .eq('role', 'employee')
        .not('kyc_status', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('KYC SUBMISSIONS FROM ADMIN CLIENT:', data?.length, data);
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
      toast.error('Fehler beim Laden der KYC-Prüfungen');
    } finally {
      setLoading(false);
    }
  };

  const updateKYCStatus = async (profileId: string, newStatus: 'approved' | 'rejected' | 'in_review') => {
    try {
      setProcessingId(profileId);
      
      const updateData: any = {
        kyc_status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'approved') {
        updateData.kyc_verified_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updateData.kyc_verified_at = null;
      }
      
      console.log('🔄 Admin KYC Review: Updating KYC status:', {
        profileId,
        newStatus,
        updateData
      });
      
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) throw error;

      // Update local state immediately
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === profileId 
            ? { 
                ...sub, 
                kyc_status: newStatus, 
                updated_at: new Date().toISOString(),
                kyc_verified_at: newStatus === 'approved' ? new Date().toISOString() : 
                                newStatus === 'rejected' ? null : sub.kyc_verified_at
              }
            : sub
        )
      );

      const statusText = {
        approved: 'genehmigt',
        rejected: 'abgelehnt',
        in_review: 'zur Prüfung markiert'
      };

      toast.success(`KYC-Status erfolgreich ${statusText[newStatus]}`);
      
      // Force refresh the submissions list to ensure consistency
      setTimeout(() => {
        fetchKYCSubmissions();
      }, 1000);
      
      console.log('🔄 Admin KYC Review: Status update completed successfully');
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast.error('Fehler beim Aktualisieren des KYC-Status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Zu prüfen' },
      in_review: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'In Prüfung' },
      approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Genehmigt' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Abgelehnt' }
    };
    const variant = variants[status as keyof typeof variants] || variants.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
        {variant.label}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />;
      case 'rejected': return <X size={16} className="text-red-600 dark:text-red-400" />;
      case 'in_review': return <Clock size={16} className="text-blue-600 dark:text-blue-400" />;
      default: return <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unbekannt';
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    console.log('FILTERING:', selectedFilter, 'USER:', sub.first_name, 'STATUS:', sub.kyc_status);
    if (selectedFilter === 'all') return true;
    return sub.kyc_status === selectedFilter;
  });
  
  console.log('TOTAL SUBMISSIONS:', submissions.length);
  console.log('SELECTED FILTER:', selectedFilter);
  console.log('FILTERED SUBMISSIONS:', filteredSubmissions.length);
  console.log('ALL SUBMISSIONS:', submissions);
  console.log('FILTERED RESULTS:', filteredSubmissions);

  const getFilterCounts = () => {
    return {
      all: submissions.length,
      pending: submissions.filter(s => s.kyc_status === 'pending').length,
      in_review: submissions.filter(s => s.kyc_status === 'in_review').length,
      approved: submissions.filter(s => s.kyc_status === 'approved').length,
      rejected: submissions.filter(s => s.kyc_status === 'rejected').length,
    };
  };

  useEffect(() => {
    fetchKYCSubmissions();
  }, []);

  const counts = getFilterCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYC-Prüfung</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Überprüfen und genehmigen Sie eingereichte KYC-Dokumente
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchKYCSubmissions}
              disabled={loading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1"
      >
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'all', label: 'Alle', count: counts.all },
            { key: 'in_review', label: 'In Prüfung', count: counts.in_review },
            { key: 'approved', label: 'Genehmigt', count: counts.approved },
            { key: 'rejected', label: 'Abgelehnt', count: counts.rejected },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedFilter === filter.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  selectedFilter === filter.key
                    ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <FileText className="text-gray-500 dark:text-gray-400" size={28} />
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Keine KYC-Einreichungen gefunden
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            {selectedFilter === 'all' 
              ? 'Es wurden noch keine KYC-Dokumente eingereicht.'
              : `Keine Einreichungen mit Status "${selectedFilter === 'in_review' ? 'In Prüfung' : selectedFilter === 'approved' ? 'Genehmigt' : 'Abgelehnt'}" gefunden.`
            }
          </p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6"
        >
          {filteredSubmissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                        <User size={24} className="text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {submission.first_name} {submission.last_name}
                          </h3>
                          {getStatusIcon(submission.kyc_status)}
                          {getStatusBadge(submission.kyc_status)}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">{submission.email}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            Verifiziert: {submission.kyc_verified_at ? formatDate(submission.kyc_verified_at) : 'Ausstehend'}
                          </span>
                          <span>•</span>
                          <span>
                            Aktualisiert: {formatDate(submission.updated_at)}
                          </span>
                        </div>
                        
                        {/* Document Info */}
                        {submission.kyc_documents && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eingereichte Dokumente:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                              {Object.entries(submission.kyc_documents).map(([key, value]) => (
                                value && (
                                  <div key={key} className="flex items-center space-x-2">
                                    <FileText size={12} />
                                    <span className="capitalize">{key.replace('_', ' ')}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openKycModal(submission)}
                        leftIcon={<Eye size={14} />}
                      >
                        KYC prüfen
                      </Button>
                      
                      {submission.kyc_status !== 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateKYCStatus(submission.id, 'approved')}
                          disabled={processingId === submission.id}
                          leftIcon={<CheckCircle size={14} />}
                          className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                        >
                          Genehmigen
                        </Button>
                      )}
                      
                      {submission.kyc_status !== 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateKYCStatus(submission.id, 'rejected')}
                          disabled={processingId === submission.id}
                          leftIcon={<X size={14} />}
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                        >
                          Ablehnen
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* KYC Review Modal */}
      <Modal
        isOpen={isKycModalOpen}
        onClose={() => {
          setIsKycModalOpen(false);
          setSelectedSubmission(null);
          setDocumentUrls({});
        }}
        title="KYC-Dokumente prüfen"
        size="xl"
      >
        {selectedSubmission && (
          <div className="p-6">
            {/* User Info Header */}
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSubmission.first_name} {selectedSubmission.last_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSubmission.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedSubmission.kyc_status)}
                    {getStatusBadge(selectedSubmission.kyc_status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <FileText size={16} className="mr-2" />
                Hochgeladene Dokumente
              </h4>
              
              {loadingDocuments ? (
                <div className="text-center py-8">
                  <LoadingSpinner size="md" />
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Dokumente werden geladen...</p>
                </div>
              ) : Object.keys(documentUrls).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(documentUrls).map(([docType, documentUrl]) => {
                    const isImage = documentUrl.toLowerCase().includes('.jpg') || 
                                   documentUrl.toLowerCase().includes('.jpeg') || 
                                   documentUrl.toLowerCase().includes('.png');
                    
                    return (
                      <div key={docType} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {docType === DocumentType.IDENTITY_CARD_FRONT ? 'Ausweis Vorderseite' :
                             docType === DocumentType.IDENTITY_CARD_BACK ? 'Ausweis Rückseite' :
                             docType === DocumentType.PASSPORT ? 'Reisepass' :
                             docType === DocumentType.DRIVERS_LICENSE_FRONT ? 'Führerschein Vorderseite' :
                             docType === DocumentType.DRIVERS_LICENSE_BACK ? 'Führerschein Rückseite' :
                             docType === DocumentType.ADDRESS_PROOF ? 'Adressnachweis' :
                             docType}
                          </h5>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(documentUrl, '_blank')}
                            leftIcon={<Download size={12} />}
                            className="text-xs"
                          >
                            Download
                          </Button>
                        </div>
                        
                        {isImage ? (
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                            <img
                              src={documentUrl}
                              alt={`${docType} document`}
                              className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(documentUrl, '_blank')}
                              onError={() => {
                                console.error(`Failed to load image: ${docType}`);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                            <div className="text-center">
                              <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">PDF Dokument</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(documentUrl, '_blank')}
                                leftIcon={<Eye size={12} />}
                                className="mt-2"
                              >
                                Öffnen
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Keine Dokumente hochgeladen</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsKycModalOpen(false);
                  setSelectedSubmission(null);
                  setDocumentUrls({});
                }}
              >
                Schließen
              </Button>
              
              {selectedSubmission.kyc_status !== 'approved' && (
                <Button
                  onClick={() => {
                    updateKYCStatus(selectedSubmission.id, 'approved');
                    setIsKycModalOpen(false);
                    setSelectedSubmission(null);
                    setDocumentUrls({});
                  }}
                  disabled={processingId === selectedSubmission.id}
                  leftIcon={<CheckCircle size={16} />}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Genehmigen
                </Button>
              )}
              
              {selectedSubmission.kyc_status !== 'rejected' && (
                <Button
                  onClick={() => {
                    updateKYCStatus(selectedSubmission.id, 'rejected');
                    setIsKycModalOpen(false);
                    setSelectedSubmission(null);
                    setDocumentUrls({});
                  }}
                  disabled={processingId === selectedSubmission.id}
                  leftIcon={<X size={16} />}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Ablehnen
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KYCReview; 