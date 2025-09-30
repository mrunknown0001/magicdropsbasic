import React, { useEffect, useState } from 'react';
import { FiShield, FiClock, FiX, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Profile } from '../../types/database';
import { motion } from 'framer-motion';
import { getKycRequirementStatus } from '../../utils/kycValidation';
import { useSettingsContext } from '../../context/SettingsContext';

interface KycStatusIndicatorProps {
  profile: Profile | null;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const KycStatusIndicator: React.FC<KycStatusIndicatorProps> = ({ 
  profile, 
  size = 'medium',
  showLabel = true 
}) => {
  const navigate = useNavigate();
  const { settings } = useSettingsContext();
  const [kycStatus, setKycStatus] = useState(() => getKycRequirementStatus(profile, settings));

  // Monitor profile changes and update KYC status
  useEffect(() => {
    const newKycStatus = getKycRequirementStatus(profile, settings);
    setKycStatus(newKycStatus);
    
    console.log('🛡️ KycStatusIndicator: Profile changed, updating KYC status:', {
      profile_id: profile?.id,
      kyc_status: profile?.kyc_status,
      is_required: newKycStatus.isRequired,
      is_approved: newKycStatus.isApproved,
      is_blocked: newKycStatus.isBlocked
    });
  }, [profile, settings, profile?.kyc_status, profile?.updated_at]);

  // Don't show indicator if KYC is not required (including for admins)
  if (!kycStatus.isRequired) {
    return null;
  }

  const statusInfo = kycStatus.statusInfo;

  const getStatusIcon = () => {
    switch (statusInfo.status) {
      case 'approved':
        return <FiCheck className="text-green-500" />;
      case 'rejected':
        return <FiX className="text-red-500" />;
      case 'in_review':
        return <FiClock className="text-blue-500" />;
      default:
        return <FiShield className="text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (statusInfo.status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
    }
  };

  const sizeClasses = size === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';
  const iconSize = size === 'small' ? 12 : 16;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 rounded-full border ${getStatusColor()} ${sizeClasses} font-medium cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={() => navigate('/kyc')}
    >
      <div style={{ width: iconSize, height: iconSize }}>
        {getStatusIcon()}
      </div>
      {showLabel && (
        <span>{statusInfo.title}</span>
      )}
    </motion.div>
  );
};

export default KycStatusIndicator; 