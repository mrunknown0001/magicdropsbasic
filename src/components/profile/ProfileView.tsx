import React from 'react';
import { FiUser, FiHome, FiCreditCard, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import KycDocumentUpload from './KycDocumentUpload';
import { useProfileStats } from '../../hooks/useProfileStats';

interface ProfileViewProps {
  profileData: any;
  isAdmin: boolean;
  healthInsuranceOptions: { value: string; label: string }[];
}

const ProfileView: React.FC<ProfileViewProps> = ({
  profileData,
  isAdmin,
  healthInsuranceOptions
}) => {
  const { user } = useAuth();
  const { fetchProfileData } = useProfileStats();
  
  // Handle KYC upload completion
  const handleUploadComplete = () => {
    // Refresh profile data to get updated verification status
    fetchProfileData(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <div className="p-2 rounded-lg bg-accent/10 dark:bg-gray-700 text-accent dark:text-white mr-3">
              <FiUser size={18} />
            </div>
            <h3 className="text-base font-app font-app-medium text-gray-800 dark:text-gray-200">Persönliche Informationen</h3>
          </div>
          
          <div className="space-y-5">
            <div className="flex flex-col">
              <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <p className="text-gray-900 dark:text-white font-app font-app-medium">
                {`${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || 'Nicht angegeben'}
              </p>
            </div>
            
            <div className="flex flex-col">
              <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">E-Mail</label>
              <div className="flex items-center">
                <FiMail className="text-gray-400 mr-2" size={14} />
                <p className="text-gray-900 dark:text-white font-app font-app-medium">{user?.email || 'Nicht angegeben'}</p>
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Geburtsdatum</label>
              <p className="text-gray-900 dark:text-white font-app font-app-medium">
                {profileData?.date_of_birth ? new Date(profileData.date_of_birth).toLocaleDateString('de-DE') : 'Nicht angegeben'}
              </p>
            </div>
            
            <div className="flex flex-col">
              <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Nationalität</label>
              <p className="text-gray-900 dark:text-white font-app font-app-medium">{profileData?.nationality || 'Nicht angegeben'}</p>
            </div>
            
            <div className="flex flex-col">
              <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Rolle</label>
              {isAdmin ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-app font-app-semibold shadow-lg border-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-300 dark:border-purple-400 hover:shadow-purple-200 dark:hover:shadow-purple-900/30 transition-all duration-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-1.933-.685-3.711-1.829-5.1a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Administrator
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-app font-app-semibold shadow-lg border-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-300 dark:border-blue-400 hover:shadow-blue-200 dark:hover:shadow-blue-900/30 transition-all duration-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Mitarbeiter
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-5">
              <div className="p-2 rounded-lg bg-accent/10 dark:bg-gray-700 text-accent dark:text-white mr-3">
                <FiHome size={18} />
              </div>
              <h3 className="text-base font-app font-app-medium text-gray-800 dark:text-gray-200">Adresse</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Anschrift</label>
                <div className="p-3 bg-white dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                  {profileData?.street ? (
                    <p className="text-gray-900 dark:text-white font-app">
                      {profileData.street}<br />
                      {profileData.postal_code} {profileData.city}
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 font-app italic">Nicht angegeben</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-5">
              <div className="p-2 rounded-lg bg-accent/10 dark:bg-gray-700 text-accent dark:text-white mr-3">
                <FiCreditCard size={18} />
              </div>
              <h3 className="text-base font-app font-app-medium text-gray-800 dark:text-gray-200">Finanzielle Daten</h3>
            </div>
            
            <div className="space-y-5">
              <div className="flex flex-col">
                <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Bankverbindung</label>
                <div className="p-3 bg-white dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                  {profileData?.iban ? (
                    <p className="text-gray-900 dark:text-white font-app">
                      <span className="text-gray-500 dark:text-gray-400">Empfänger:</span> {profileData.recipient_name || profileData.first_name + ' ' + profileData.last_name}<br />
                      <span className="text-gray-500 dark:text-gray-400">IBAN:</span> {profileData.iban}<br />
                      <span className="text-gray-500 dark:text-gray-400">BIC:</span> {profileData.bic || 'Nicht angegeben'}
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 font-app italic">Nicht angegeben</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col">
                <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Steuernummer</label>
                <p className="text-gray-900 dark:text-white font-app font-app-medium">
                  {profileData?.tax_number || 'Nicht angegeben'}
                </p>
              </div>
              
              <div className="flex flex-col">
                <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Sozialversicherungsnummer</label>
                <p className="text-gray-900 dark:text-white font-app font-app-medium">
                  {profileData?.social_security_number || 'Nicht angegeben'}
                </p>
              </div>
              
              <div className="flex flex-col">
                <label className="block text-sm font-app text-gray-500 dark:text-gray-400 mb-1">Krankenkasse</label>
                <p className="text-gray-900 dark:text-white font-app font-app-medium">
                  {profileData?.health_insurance ? 
                    healthInsuranceOptions.find(option => option.value === profileData.health_insurance)?.label || profileData.health_insurance
                    : 'Nicht angegeben'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* KYC Verification - Only for employees, not admins */}
      {!isAdmin && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Identitätsverifizierung
          </h3>
          <KycDocumentUpload onUploadComplete={handleUploadComplete} />
        </div>
      )}
    </>
  );
};

export default ProfileView;
