import React, { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ShimmerEffect from '../../components/ui/ShimmerEffect';
import FileUpload from '../../components/ui/FileUpload';
import ColorPicker from '../../components/ui/ColorPicker';
import { useSettingsContext } from '../../context/SettingsContext';
import { Settings as SettingsType, SettingsUpdate, Contract } from '../../types/database';
import { Check, RefreshCw, AlertCircle, Settings as SettingsIcon, Building, Image, Mail, FileText, Phone, CreditCard, MessageSquare, User } from 'lucide-react';
import { FiShield, FiPlus, FiEye, FiEdit, FiCopy, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useContractsStats } from '../../hooks/useContractsStats';
import { useChatManagerSettings } from '../../hooks/useChatManagerSettings';
import { useNavigate } from 'react-router-dom';
import ViewContractModal from '../../components/admin/ViewContractModal';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'unternehmen' | 'kontakt' | 'legal' | 'logo' | 'branding' | 'kyc' | 'email' | 'vertraege' | 'livechat'>('unternehmen');
  const { settings, loading, error, updateSettings, uploadImage, refreshSettings, colors } = useSettingsContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Contract management state
  const {
    contracts,
    loading: contractsLoading,
    error: contractsError,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract
  } = useContractsStats();

  // Chat manager settings
  const {
    settings: chatManagerSettings,
    loading: chatManagerLoading,
    updateSettings: updateChatManagerSettings,
    uploadProfilePicture,
    removeProfilePicture
  } = useChatManagerSettings();

  // Local state for chat manager form to prevent auto-save on every keystroke
  const [chatManagerForm, setChatManagerForm] = useState({
    manager_name: '',
    manager_title: '',
    manager_bio: '',
    chat_enabled: true
  });
  const [chatManagerFormChanged, setChatManagerFormChanged] = useState(false);

  // Populate chat manager form when settings load
  useEffect(() => {
    if (chatManagerSettings && !chatManagerFormChanged) {
      setChatManagerForm({
        manager_name: chatManagerSettings.manager_name || '',
        manager_title: chatManagerSettings.manager_title || '',
        manager_bio: chatManagerSettings.manager_bio || '',
        chat_enabled: chatManagerSettings.chat_enabled ?? true
      });
    }
  }, [chatManagerSettings, chatManagerFormChanged]);


  // Handle chat manager form changes
  const handleChatManagerFormChange = (field: keyof typeof chatManagerForm, value: string | boolean) => {
    setChatManagerForm(prev => ({ ...prev, [field]: value }));
    setChatManagerFormChanged(true);
  };
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<SettingsUpdate>({
    company_name: '',
    website_name: '',
    website_url: '',
    primary_color: '',
    accent_color: '',
    contact_email: '',
    contact_phone: '',
    support_email: '',
    support_phone: '',
    registration_number: '',
    euid: '',
    court_location: '',
    managing_director: '',
    responsible_person: '',
    company_address: '',
    postal_code: '',
    city: '',
    country: '',
    impressum_content: '',
    privacy_policy_content: '',
    terms_content: '',
    kyc_required_for_tasks: true,
    kyc_requirement_message: '',
    data_protection_officer: '',
    privacy_contact_email: '',
    company_legal_form: 'GmbH',
    email_delay_enabled: false,
    email_delay_hours: 24
  });
  
  // Initialize form with current settings once loaded
  React.useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        website_name: settings.website_name || '',
        website_url: settings.website_url || '',
        primary_color: settings.primary_color || '#3b82f6',
        accent_color: settings.accent_color || '#10b981',
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        support_email: settings.support_email || '',
        support_phone: settings.support_phone || '',
        registration_number: settings.registration_number || '',
        euid: settings.euid || '',
        court_location: settings.court_location || '',
        managing_director: settings.managing_director || '',
        responsible_person: settings.responsible_person || '',
        company_address: settings.company_address || '',
        postal_code: settings.postal_code || '',
        city: settings.city || '',
        country: settings.country || 'Deutschland',
        impressum_content: settings.impressum_content || '',
        privacy_policy_content: settings.privacy_policy_content || '',
        terms_content: settings.terms_content || '',
        kyc_required_for_tasks: settings.kyc_required_for_tasks !== false, // Default to true for security
        kyc_requirement_message: settings.kyc_requirement_message || '',
        data_protection_officer: settings.data_protection_officer || '',
        privacy_contact_email: settings.privacy_contact_email || '',
        company_legal_form: settings.company_legal_form || 'GmbH',
        email_delay_enabled: settings.email_delay_enabled || false,
        email_delay_hours: settings.email_delay_hours || 24
      });
    }
  }, [settings]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle color changes
  const handleColorChange = (colorType: 'primary_color' | 'accent_color', color: string) => {
    setFormData(prev => ({ ...prev, [colorType]: color }));
  };
  
  // Handle file upload
  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!file) return;
    
    try {
      await uploadImage(file, type);
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
      refreshSettings();
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error(`Failed to upload ${type}`);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // Save main settings
      await updateSettings(formData);
      
      // Save chat manager settings if they have been changed
      if (chatManagerFormChanged) {
        await updateChatManagerSettings(chatManagerForm);
        setChatManagerFormChanged(false);
      }
      
      toast.success('Alle Einstellungen erfolgreich gespeichert');
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setFormError(err.message || 'Failed to update settings');
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Contract management functions
  const handleDeleteContract = async (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Vertragsvorlage löschen möchten?')) {
      try {
        await deleteContract(id);
        toast.success('Vertragsvorlage wurde erfolgreich gelöscht.');
      } catch (error) {
        toast.error('Die Vertragsvorlage konnte nicht gelöscht werden.');
      }
    }
  };

  const handleDuplicateContract = async (contract: Contract) => {
    try {
      const newContract = {
        ...contract,
        title: `${contract.title} (Kopie)`,
        is_template: true,
        created_by: contract.created_by
      };
      
      delete newContract.id;
      delete newContract.created_at;
      delete newContract.updated_at;
      
      await createContract(newContract);
      toast.success('Vertragsvorlage wurde erfolgreich dupliziert.');
    } catch (error) {
      toast.error('Die Vertragsvorlage konnte nicht dupliziert werden.');
    }
  };
  
  return (
    <div className="w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center">
            <SettingsIcon size={24} className="text-gray-900 dark:text-white mr-4" />
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white flex items-center">
                Einstellungen
                {loading && (
                  <span className="ml-3 inline-block">
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-500 dark:border-white border-t-transparent dark:border-t-transparent rounded-full"></div>
                  </span>
                )}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 font-app">
                Verwalten Sie die Einstellungen Ihrer Anwendung
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshSettings}
              disabled={loading}
              leftIcon={<RefreshCw size={16} />}
            >
              Aktualisieren
            </Button>
            <Button
              size="md"
              type="submit"
              form="settings-form"
              disabled={loading || isSubmitting}
              leftIcon={<Check size={16} />}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className={`hover:opacity-90 transition-opacity ${chatManagerFormChanged ? 'ring-2 ring-amber-300' : ''}`}
            >
              {isSubmitting ? 'Speichere...' : 'Speichern'}
              {chatManagerFormChanged && (
                <span className="ml-2 w-2 h-2 rounded-full bg-amber-300" />
              )}
            </Button>
          </div>
        </div>
      </motion.div>
      

      
      {/* Loading state or form */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <form id="settings-form" onSubmit={handleSubmit}>
          {/* Tab navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('unternehmen')}
                  className={`${
                    activeTab === 'unternehmen'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Building className="mr-2" size={18} />
                  Unternehmen
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kontakt')}
                  className={`${
                    activeTab === 'kontakt'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Mail className="mr-2" size={18} />
                  Kontakt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('legal')}
                  className={`${
                    activeTab === 'legal'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <FileText className="mr-2" size={18} />
                  Rechtliches
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('logo')}
                  className={`${
                    activeTab === 'logo'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Image className="mr-2" size={18} />
                  Logo & Favicon
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('branding')}
                  className={`${
                    activeTab === 'branding'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <SettingsIcon className="mr-2" size={18} />
                  Branding
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kyc')}
                  className={`${
                    activeTab === 'kyc'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <FiShield className="mr-2" size={18} />
                  KYC Verifizierung
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className={`${
                    activeTab === 'email'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Mail className="mr-2" size={18} />
                  E-Mail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vertraege')}
                  className={`${
                    activeTab === 'vertraege'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <FileText className="mr-2" size={18} />
                  Verträge
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('livechat')}
                  className={`${
                    activeTab === 'livechat'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <MessageSquare className="mr-2" size={18} />
                  Live Chat
                </button>
              </nav>
            </div>
          </div>
          
          {/* Tab content */}
          {activeTab === 'unternehmen' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Unternehmensinformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unternehmensname
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="website_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website Name
                  </label>
                  <input
                    type="text"
                    id="website_name"
                    name="website_name"
                    value={formData.website_name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Wird für den Dokumententitel und Überschriften verwendet.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    id="website_url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="https://example.com"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Contact Tab */}
          {activeTab === 'kontakt' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Kontaktinformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Haupt-E-Mail
                    </label>
                    <input
                      type="email"
                      id="contact_email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="info@unternehmen.de"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Haupt-Telefon
                    </label>
                    <input
                      type="tel"
                      id="contact_phone"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="+49 (0) 123 456 789"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="support_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Support-E-Mail
                    </label>
                    <input
                      type="email"
                      id="support_email"
                      name="support_email"
                      value={formData.support_email}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="support@unternehmen.de"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="support_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Support-Telefon
                    </label>
                    <input
                      type="tel"
                      id="support_phone"
                      name="support_phone"
                      value={formData.support_phone}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="+49 (0) 123 456 790"
                    />
                  </div>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Firmenadresse</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="company_address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Straße und Hausnummer
                      </label>
                      <input
                        type="text"
                        id="company_address"
                        name="company_address"
                        value={formData.company_address}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                        placeholder="[Straße und Hausnummer]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          PLZ
                        </label>
                        <input
                          type="text"
                          id="postal_code"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                          placeholder="[PLZ]"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Stadt
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                          placeholder="[Stadt]"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Land
                        </label>
                        <input
                          type="text"
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                          placeholder="Deutschland"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Legal Tab */}
          {activeTab === 'legal' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Rechtliche Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Handelsregisternummer
                    </label>
                    <input
                      type="text"
                      id="registration_number"
                      name="registration_number"
                      value={formData.registration_number}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="[z.B. HRB 123456]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="court_location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registergericht
                    </label>
                    <input
                      type="text"
                      id="court_location"
                      name="court_location"
                      value={formData.court_location}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="[z.B. Amtsgericht Berlin]"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="euid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Umsatzsteuer-ID
                    </label>
                    <input
                      type="text"
                      id="euid"
                      name="euid"
                      value={formData.euid}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="[z.B. DE123456789]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="managing_director" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Geschäftsführer
                    </label>
                    <input
                      type="text"
                      id="managing_director"
                      name="managing_director"
                      value={formData.managing_director}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="[Geschäftsführer]"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="responsible_person" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Verantwortlich für den Inhalt
                  </label>
                  <input
                    type="text"
                    id="responsible_person"
                    name="responsible_person"
                    value={formData.responsible_person}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                    placeholder="[Geschäftsführer]"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Gemäß § 55 Abs. 2 RStV
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company_legal_form" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rechtsform
                    </label>
                    <select
                      id="company_legal_form"
                      name="company_legal_form"
                      value={formData.company_legal_form}
                      onChange={handleSelectChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="GmbH">GmbH</option>
                      <option value="AG">AG</option>
                      <option value="UG">UG (haftungsbeschränkt)</option>
                      <option value="KG">KG</option>
                      <option value="OHG">OHG</option>
                      <option value="e.K.">e.K.</option>
                      <option value="Einzelunternehmen">Einzelunternehmen</option>
                      <option value="Freiberufler">Freiberufler</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="data_protection_officer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Datenschutzbeauftragter
                    </label>
                    <input
                      type="text"
                      id="data_protection_officer"
                      name="data_protection_officer"
                      value={formData.data_protection_officer}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                      placeholder="[Optional für DSGVO-Compliance]"
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Optional: Für DSGVO-Compliance
                    </p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="privacy_contact_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Datenschutz-Kontakt E-Mail
                  </label>
                  <input
                    type="email"
                    id="privacy_contact_email"
                    name="privacy_contact_email"
                    value={formData.privacy_contact_email}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200"
                    placeholder="datenschutz@unternehmen.de"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Separate E-Mail für Datenschutzanfragen (falls abweichend von Haupt-E-Mail)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Logo & Favicon Tab */}
          {activeTab === 'logo' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Logo & Favicon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Logo</h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-full md:w-2/3">
                      <FileUpload
                        acceptedTypes={['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']}
                        onFileSelect={(file) => handleFileUpload(file, 'logo')}
                        label="Upload Logo"
                        previewUrl={settings?.logo_url}
                      />
                    </div>
                    {settings?.logo_url && (
                      <div className="w-full md:w-1/3 flex justify-center">
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                          <img
                            src={settings.logo_url}
                            alt="Current Logo"
                            className="max-h-24 max-w-full"
                          />
                          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">Current Logo</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Favicon</h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-full md:w-2/3">
                      <FileUpload
                        acceptedTypes={['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']}
                        onFileSelect={(file) => handleFileUpload(file, 'favicon')}
                        label="Upload Favicon"
                        previewUrl={settings?.favicon_url}
                      />
                    </div>
                    {settings?.favicon_url && (
                      <div className="w-full md:w-1/3 flex justify-center">
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                          <img
                            src={settings.favicon_url}
                            alt="Current Favicon"
                            className="max-h-16 max-w-full"
                          />
                          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">Current Favicon</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Branding Colors Tab */}
          {activeTab === 'branding' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Markenfarben</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primärfarbe</label>
                  <ColorPicker
                    value={formData.primary_color || '#3b82f6'}
                    onChange={(color) => handleColorChange('primary_color', color)}
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Wird für Buttons, Links und primäre Elemente verwendet.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Akzentfarbe</label>
                  <ColorPicker
                    value={formData.accent_color || '#10b981'}
                    onChange={(color) => handleColorChange('accent_color', color)}
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Wird für Highlights, Erfolgszustände und sekundäre Aktionen verwendet.
                  </p>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Farbvorschau</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Primärfarbe</h4>
                      <div className="space-y-2">
                        <div 
                          className="h-12 rounded-md flex items-center justify-center text-white"
                          style={{ backgroundColor: formData.primary_color }}
                        >
                          Primary Button
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div 
                            className="h-8 rounded-md flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: formData.primary_color }}
                          >
                            Normal
                          </div>
                          <div 
                            className="h-8 rounded-md flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: formData.primary_color + '99' }}
                          >
                            Transparent
                          </div>
                          <div 
                            className="h-8 rounded-md flex items-center justify-center text-xs text-gray-800 dark:text-white"
                            style={{ backgroundColor: formData.primary_color + '33' }}
                          >
                            Sehr Hell
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Akzentfarbe</h4>
                      <div className="space-y-2">
                        <div 
                          className="h-12 rounded-md flex items-center justify-center text-white"
                          style={{ backgroundColor: formData.accent_color }}
                        >
                          Accent Button
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div 
                            className="h-8 rounded-md flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: formData.accent_color }}
                          >
                            Normal
                          </div>
                          <div 
                            className="h-8 rounded-md flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: formData.accent_color + '99' }}
                          >
                            Transparent
                          </div>
                          <div 
                            className="h-8 rounded-md flex items-center justify-center text-xs text-gray-800 dark:text-white"
                            style={{ backgroundColor: formData.accent_color + '33' }}
                          >
                            Sehr Hell
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* KYC Settings Tab */}
          {activeTab === 'kyc' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">KYC Verifizierung Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                  <div className="flex">
                    <FiShield className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Sicherheitshinweis
                      </h3>
                      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        Diese Einstellungen kontrollieren, ob Mitarbeiter erst ihre KYC-Verifizierung abschließen müssen, 
                        bevor sie auf Aufgaben zugreifen können. Aus Sicherheitsgründen ist dies standardmäßig aktiviert.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="kyc_required_for_tasks"
                      name="kyc_required_for_tasks"
                      checked={formData.kyc_required_for_tasks}
                      onChange={handleCheckboxChange}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="kyc_required_for_tasks" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        KYC-Verifizierung für Aufgabenzugriff erforderlich
                      </label>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Wenn aktiviert, können Mitarbeiter erst nach erfolgreicher KYC-Genehmigung auf Aufgaben zugreifen. 
                        Admin-Benutzer sind von dieser Einschränkung ausgenommen.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="kyc_requirement_message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Benutzerdefinierte KYC-Nachricht
                    </label>
                    <textarea
                      id="kyc_requirement_message"
                      name="kyc_requirement_message"
                      rows={3}
                      value={formData.kyc_requirement_message}
                      onChange={(e) => setFormData(prev => ({ ...prev, kyc_requirement_message: e.target.value }))}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 sm:text-sm transition-colors duration-200 resize-none"
                      placeholder="Geben Sie eine benutzerdefinierte Nachricht ein, die Benutzern angezeigt wird, wenn ihre KYC-Verifizierung erforderlich ist..."
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Optional: Eine personalisierte Nachricht, die Mitarbeitern angezeigt wird, wenn sie ihre KYC-Verifizierung abschließen müssen. 
                      Wenn leer, wird eine Standardnachricht verwendet.
                    </p>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Aktuelle KYC-Statistiken
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Status wird beim Speichern aktualisiert</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formData.kyc_required_for_tasks ? 'Aktiviert' : 'Deaktiviert'}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                        <p className="text-xs text-green-600 dark:text-green-400">Genehmigte Benutzer</p>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Wird automatisch berechnet
                        </p>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">Ausstehende Überprüfung</p>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Wird automatisch berechnet
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                        <p className="text-xs text-red-600 dark:text-red-400">Blockierte Benutzer</p>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Wird automatisch berechnet
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          
          {/* Email Settings Tab */}
          {activeTab === 'email' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">E-Mail Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                  <div className="flex">
                    <Mail className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        E-Mail Verzögerung
                      </h3>
                      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        Konfigurieren Sie die automatische Verzögerung beim Versenden von E-Mails. 
                        Dies kann hilfreich sein, um versehentliche Sendungen zu vermeiden.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="email_delay_enabled"
                      name="email_delay_enabled"
                      checked={formData.email_delay_enabled}
                      onChange={handleCheckboxChange}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="email_delay_enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        E-Mail Verzögerung aktivieren
                      </label>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Wenn aktiviert, werden E-Mails nicht sofort versendet, sondern nach der konfigurierten Wartezeit.
                      </p>
                    </div>
                  </div>

                  {formData.email_delay_enabled && (
                    <div>
                      <label htmlFor="email_delay_hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verzögerung in Stunden
                      </label>
                      <input
                        type="number"
                        id="email_delay_hours"
                        name="email_delay_hours"
                        value={formData.email_delay_hours}
                        onChange={handleNumberChange}
                        min="1"
                        max="168"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="24"
                      />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Anzahl der Stunden, um die E-Mails verzögert werden sollen (1-168 Stunden / max. 7 Tage).
                      </p>
                    </div>
                  )}

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Hinweis zur E-Mail Verzögerung
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                          Diese Einstellung betrifft automatisch generierte E-Mails wie Benachrichtigungen und Bestätigungen. 
                          Kritische E-Mails wie Passwort-Resets werden weiterhin sofort versendet.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Contracts Tab */}
          {activeTab === 'vertraege' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-xl font-medium text-gray-900 dark:text-white">Vertragsvorlagen</span>
                  <Button
                    size="sm"
                    onClick={() => navigate('/admin/contracts/create')}
                    leftIcon={<FiPlus size={16} />}
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                    className="hover:opacity-90 transition-opacity"
                  >
                    Neue Vorlage
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : contractsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 dark:text-red-400">Fehler beim Laden der Verträge</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => fetchContracts(true)}
                    >
                      Erneut versuchen
                    </Button>
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <FileText size={24} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Vertragsvorlagen gefunden</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                      Erstellen Sie eine neue Vertragsvorlage, um loszulegen.
                    </p>
                    <Button
                      onClick={() => navigate('/admin/contracts/create')}
                      leftIcon={<FiPlus size={16} />}
                      style={{ backgroundColor: colors.primary, color: 'white' }}
                      className="hover:opacity-90 transition-opacity"
                    >
                      Erste Vorlage erstellen
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contracts.map((contract: Contract) => (
                      <motion.div 
                        key={contract.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                      >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                          <div className="flex items-center">
                            <FileText size={18} className="text-gray-500 dark:text-gray-400 mr-2" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{contract.title}</h3>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            contract.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {contract.is_active ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </div>
                        
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kategorie</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{contract.category}</div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Version</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">v{contract.version_number || 1}</div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 col-span-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Zuletzt bearbeitet</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {contract.updated_at ? formatDistanceToNow(new Date(contract.updated_at), { addSuffix: true, locale: de }) : '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-end items-center">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setSelectedContract(contract);
                                setIsViewModalOpen(true);
                              }}
                              className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center p-1.5"
                              title="Ansehen"
                            >
                              <FiEye size={20} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/contracts/${contract.id}/edit`)}
                              className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex items-center p-1.5"
                              title="Bearbeiten"
                            >
                              <FiEdit size={20} />
                            </button>
                            <button
                              onClick={() => handleDuplicateContract(contract)}
                              className="text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 flex items-center p-1.5"
                              title="Duplizieren"
                            >
                              <FiCopy size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id)}
                              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center p-1.5"
                              title="Löschen"
                            >
                              <FiTrash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Live Chat Tab */}
          {activeTab === 'livechat' && (
            <div className="space-y-6">
              {/* Chat Manager Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="mr-2" size={20} />
                    Chat Manager Profil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chatManagerLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Profile Picture Section */}
                      <div className="flex items-start space-x-6">
                        <div className="flex-shrink-0">
                          <div className="relative">
                            {chatManagerSettings?.manager_avatar_url ? (
                              <img
                                src={chatManagerSettings.manager_avatar_url}
                                alt={chatManagerSettings.manager_name}
                                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-600">
                                <User size={32} className="text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                            
                            {/* Upload Button Overlay */}
                            <label className="absolute inset-0 w-20 h-20 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                              <Image size={20} className="text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadProfilePicture(file);
                                }}
                              />
                            </label>
                          </div>
                          
                          {chatManagerSettings?.manager_avatar_url && (
                            <button
                              onClick={removeProfilePicture}
                              className="mt-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Bild entfernen
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-4">
                          {/* Manager Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Name des Chat Managers
                            </label>
                            <input
                              type="text"
                              value={chatManagerForm.manager_name}
                              onChange={(e) => handleChatManagerFormChange('manager_name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                              placeholder="z.B. Markus Friedel"
                            />
                          </div>

                          {/* Manager Title */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Position/Titel
                            </label>
                            <input
                              type="text"
                              value={chatManagerForm.manager_title}
                              onChange={(e) => handleChatManagerFormChange('manager_title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                              placeholder="z.B. Projektleiter"
                            />
                          </div>

                          {/* Manager Bio */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Kurze Beschreibung
                            </label>
                            <textarea
                              value={chatManagerForm.manager_bio}
                              onChange={(e) => handleChatManagerFormChange('manager_bio', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                              placeholder="Kurze Beschreibung des Chat Managers..."
                            />
                          </div>

                          {/* Chat Enable/Disable Toggle */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                              Chat Status
                            </label>
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  chatManagerForm.chat_enabled ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    Live Chat {chatManagerForm.chat_enabled ? 'Aktiviert' : 'Deaktiviert'}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {chatManagerForm.chat_enabled 
                                      ? 'Chat Widget ist für alle Benutzer sichtbar'
                                      : 'Chat Widget ist ausgeblendet und nicht verfügbar'
                                    }
                                  </p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={chatManagerForm.chat_enabled}
                                  onChange={(e) => handleChatManagerFormChange('chat_enabled', e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>

                          {/* Unsaved Changes Indicator */}
                          {chatManagerFormChanged && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <p>Ungespeicherte Änderungen - Verwende den "Speichern" Button oben</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chat Preview */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Vorschau im Chat
                          </h3>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              chatManagerForm.chat_enabled ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {chatManagerForm.chat_enabled ? 'Aktiviert' : 'Deaktiviert'}
                            </span>
                          </div>
                        </div>
                        <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 relative ${
                          !chatManagerForm.chat_enabled ? 'opacity-50' : ''
                        }`}>
                          {!chatManagerForm.chat_enabled && (
                            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                              <div className="text-white text-center">
                                <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-medium">Chat Deaktiviert</p>
                                <p className="text-xs opacity-75">Für Benutzer nicht sichtbar</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-3">
                            {chatManagerSettings?.manager_avatar_url ? (
                              <img
                                src={chatManagerSettings.manager_avatar_url}
                                alt={chatManagerSettings.manager_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                <User size={20} className="text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {chatManagerForm.manager_name || 'Markus Friedel'}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {chatManagerForm.manager_title || 'Projektleiter'}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 bg-white dark:bg-gray-700 rounded-lg p-3 ml-13">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Hallo! Hier ist {chatManagerForm.manager_name || 'Markus'} von der Projektleitung. 
                              Wie kann ich dir heute helfen?
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                          Hinweise zur Chat Manager Konfiguration
                        </h4>
                        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                          <li>• <strong>Chat Status:</strong> Aktiviert/Deaktiviert das Chat Widget für alle Benutzer</li>
                          <li>• Das Profilbild sollte professionell und freundlich sein</li>
                          <li>• Der Name wird in allen Chat-Nachrichten verwendet</li>
                          <li>• Der Titel erscheint unter dem Namen im Chat-Header</li>
                          <li>• Empfohlene Bildgröße: 200x200 Pixel, max. 5MB</li>
                          <li>• Unterstützte Formate: JPG, PNG, WebP</li>
                          <li>• <strong>Deaktiviert:</strong> Chat Widget wird nicht angezeigt, bestehende Gespräche bleiben erhalten</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Error message */}
          {formError && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" />
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              </div>
            </div>
          )}
        </form>
      )}
      
      {/* Contract View Modal */}
      {selectedContract && (
        <ViewContractModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          contract={selectedContract}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default Settings;
