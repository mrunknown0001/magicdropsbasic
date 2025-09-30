import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useProfileStats, ProfileFormData } from '../hooks/useProfileStats';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useSettingsContext } from '../context/SettingsContext';
import { getKycRequirementStatus } from '../utils/kycValidation';

// Import our new modular components
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileForm from '../components/profile/ProfileForm';
import PasswordChangeModal from '../components/profile/PasswordChangeModal';

// List of German health insurance providers
const healthInsuranceOptions = [
  { value: '', label: 'Bitte auswählen' },
  { value: 'TK', label: 'Techniker Krankenkasse (TK)' },
  { value: 'AOK', label: 'Allgemeine Ortskrankenkasse (AOK)' },
  { value: 'Barmer', label: 'Barmer' },
  { value: 'DAK', label: 'DAK-Gesundheit' },
  { value: 'KKH', label: 'Kaufmännische Krankenkasse (KKH)' },
  { value: 'IKK', label: 'Innungskrankenkasse (IKK)' },
  { value: 'HEK', label: 'Hanseatische Krankenkasse (HEK)' },
  { value: 'Knappschaft', label: 'Knappschaft' },
  { value: 'BKK', label: 'Betriebskrankenkasse (BKK)' },
  { value: 'Other', label: 'Andere' }
];

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'financial' | 'payroll'>('personal');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  
  // Use our hook for profile data
  const {
    profileData,
    loading,
    error,
    fetchProfileData,
    updateProfile,
    updatePassword
  } = useProfileStats();

  // Force refresh profile data when KYC status might have changed - but NOT when editing
  useEffect(() => {
    if (profile && !isEditing) {
      console.log('🔄 Profile page: Monitoring profile changes for KYC updates');
      
      // Force refresh profile data to ensure we have the latest KYC status
      fetchProfileData(true);
      
      // Also refresh auth context profile
      refreshProfile();
    }
  }, [profile?.kyc_status, profile?.updated_at, fetchProfileData, refreshProfile, isEditing]);

  // Set up periodic refresh for profile data - but NOT when editing
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if document is visible AND user is not editing
      if (!document.hidden && !isEditing) {
        console.log('🔄 Profile page: Periodic refresh check');
        fetchProfileData(true);
        refreshProfile();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchProfileData, refreshProfile, isEditing]);
  
  // Check if user is verified using centralized KYC validation
  const { settings } = useSettingsContext();
  const kycStatus = getKycRequirementStatus(profileData, settings);
  const isVerified = kycStatus.isApproved;
  const isAdmin = profileData?.role === 'admin';
  
  // Get current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('de-DE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Form initialization with empty defaults (will be populated when editing starts)
  const formMethods = useForm<ProfileFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      nationality: 'DE',
      street: '',
      postal_code: '',
      city: '',
      tax_number: '',
      social_security_number: '',
      health_insurance: '',
      iban: '',
      bic: '',
      recipient_name: '',
    }
  });
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchProfileData(true); // Force refresh
    toast.success('Aktualisiere Profildaten...');
  };
  
  // Update form values when profile changes - but ONLY if not currently editing
  useEffect(() => {
    if (profileData && !isEditing) {
      const formData = {
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        date_of_birth: profileData.date_of_birth ? new Date(profileData.date_of_birth).toISOString().split('T')[0] : '',
        nationality: profileData.nationality || 'DE',
        street: profileData.street || '',
        postal_code: profileData.postal_code || '',
        city: profileData.city || '',
        tax_number: profileData.tax_number || '',
        social_security_number: profileData.social_security_number || '',
        health_insurance: profileData.health_insurance || '',
        iban: profileData.iban || '',
        bic: profileData.bic || '',
        recipient_name: profileData.recipient_name || '',
      };
      
      formMethods.reset(formData);
    }
  }, [profileData, isEditing, formMethods.reset]);
  
  // Update form values ONLY when user clicks Edit button (one-time initialization)
  useEffect(() => {
    if (isEditing && profileData && !formInitialized) {
      // Only reset form when entering edit mode for the first time
      const formData = {
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        date_of_birth: profileData.date_of_birth ? new Date(profileData.date_of_birth).toISOString().split('T')[0] : '',
        nationality: profileData.nationality || 'DE',
        street: profileData.street || '',
        postal_code: profileData.postal_code || '',
        city: profileData.city || '',
        tax_number: profileData.tax_number || '',
        social_security_number: profileData.social_security_number || '',
        health_insurance: profileData.health_insurance || '',
        iban: profileData.iban || '',
        bic: profileData.bic || '',
        recipient_name: profileData.recipient_name || '',
      };
      
      formMethods.reset(formData);
      setFormInitialized(true);
    }
    
    // Reset initialization flag when exiting edit mode
    if (!isEditing && formInitialized) {
      setFormInitialized(false);
    }
  }, [isEditing, profileData, formInitialized, formMethods.reset]);
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);
      console.log('Profile form submission started with data:', data);
      
      // Update profile with the form data
      const result = await updateProfile(data);
      
      if (result) {
        console.log('Profile update successful, result:', result);
        setIsEditing(false);
        setFormInitialized(false); // Reset form initialization flag
        // Success toast is already shown by updateProfile hook
      } else {
        console.error('Profile update returned null result');
        // Error toast is already shown by updateProfile hook
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      // Don't show additional error toast since updateProfile already shows one
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    if (profileData) {
      formMethods.reset({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        date_of_birth: profileData.date_of_birth ? new Date(profileData.date_of_birth).toISOString().split('T')[0] : '',
        nationality: profileData.nationality || 'DE',
        street: profileData.street || '',
        postal_code: profileData.postal_code || '',
        city: profileData.city || '',
        tax_number: profileData.tax_number || '',
        social_security_number: profileData.social_security_number || '',
        health_insurance: profileData.health_insurance || '',
        iban: profileData.iban || '',
        bic: profileData.bic || '',
        recipient_name: profileData.recipient_name || '',
      });
    }
    setIsEditing(false);
    setActiveTab('personal');
  };
  
  const handlePasswordChange = async (oldPassword: string, newPassword: string) => {
    try {
      // updatePassword only needs the new password
      await updatePassword(newPassword);
      toast.success('Passwort erfolgreich geändert');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Fehler beim Ändern des Passworts');
    }
  };
  
  // Display loading state
  if (loading && !profileData) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
              <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-12"
        >
          <LoadingSpinner size="lg" />
        </motion.div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 shadow-sm border border-red-100 dark:border-red-800/30 mb-6">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-300">Fehler beim Laden der Profildaten</h2>
          <p className="mt-2 text-red-700 dark:text-red-400">
            Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.
          </p>
          <button 
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full px-4 py-6">
      {/* Profile Header with Verification Warning */}
      <ProfileHeader
        profileData={profileData}
        isEditing={isEditing}
        isVerified={isVerified}
        formattedDate={formattedDate}
        onEdit={() => setIsEditing(true)}
        onPasswordModalOpen={() => setPasswordModalOpen(true)}
      />
      
      {/* Main Profile Card */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <div className="h-1 w-full bg-accent dark:bg-accent/80"></div>
        
        {/* Profile Form with Tabs */}
        <ProfileForm
          formMethods={formMethods}
          isEditing={isEditing}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          onPasswordModalOpen={() => setPasswordModalOpen(true)}
          healthInsuranceOptions={healthInsuranceOptions}
          isSubmitting={isSubmitting}
          profileData={profileData}
          isAdmin={isAdmin}
        />
      </Card>
      
      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onPasswordChange={handlePasswordChange}
      />
    </div>
  );
};

export default Profile;