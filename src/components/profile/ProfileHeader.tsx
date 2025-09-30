import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiEdit, FiCalendar, FiAlertCircle, FiShield, FiKey } from 'react-icons/fi';
import Button from '../ui/Button';
import { Profile } from '../../types/database';
import { useNavigate } from 'react-router-dom';
import { getKycRequirementStatus } from '../../utils/kycValidation';
import { useSettingsContext } from '../../context/SettingsContext';

interface ProfileHeaderProps {
  profileData: Profile | null;
  isEditing: boolean;
  isVerified: boolean;
  formattedDate: string;
  onEdit: () => void;
  onPasswordModalOpen: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  isEditing,
  isVerified,
  formattedDate,
  onEdit,
  onPasswordModalOpen
}) => {
  const navigate = useNavigate();
  const { settings } = useSettingsContext();
  const [kycStatus, setKycStatus] = useState(() => getKycRequirementStatus(profileData, settings));

  // Monitor profile changes and update KYC status
  useEffect(() => {
    const newKycStatus = getKycRequirementStatus(profileData, settings);
    setKycStatus(newKycStatus);
    
    console.log('🛡️ ProfileHeader: Profile or settings changed, updating KYC status:', {
      profile_id: profileData?.id,
      kyc_status: profileData?.kyc_status,
      isRequired: newKycStatus.isRequired,
      isApproved: newKycStatus.isApproved,
      isBlocked: newKycStatus.isBlocked,
      shouldShowBanner: newKycStatus.isRequired && newKycStatus.isBlocked
    });
  }, [profileData, settings, profileData?.kyc_status, profileData?.updated_at]);

  // Show verification banner if KYC is required and not approved
  const shouldShowVerificationBanner = kycStatus.isRequired && kycStatus.isBlocked;

  return (
    <>
      {shouldShowVerificationBanner && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 shadow-sm mb-6"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <FiAlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-app font-app-medium text-amber-800 dark:text-amber-300">
                {kycStatus.statusInfo.title}
              </h3>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                <p>{kycStatus.statusInfo.message}</p>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FiShield size={14} />}
                    className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => navigate('/kyc')}
                  >
                    {kycStatus.statusInfo.actionText}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-app font-app-semibold text-gray-900 dark:text-white">
              Mein Profil
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Hier können Sie Ihre persönlichen Daten einsehen und bearbeiten.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex items-center bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm">
              <FiCalendar className="text-accent mr-2" size={16} />
              <p className="text-sm font-app text-gray-700 dark:text-gray-300">
                {formattedDate}
              </p>
            </div>
            {!isEditing && (
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<FiKey size={16} />}
                  onClick={onPasswordModalOpen}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  Passwort ändern
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<FiEdit size={16} />}
                  onClick={onEdit}
                >
                  Profil bearbeiten
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ProfileHeader;
