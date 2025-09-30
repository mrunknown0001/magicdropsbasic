import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Profile } from '../../types/database';
import { getKycRequirementStatus } from '../../utils/kycValidation';
import { useSettingsContext } from '../../context/SettingsContext';

interface KycVerificationBannerProps {
  profile: Profile | null;
}

const KycVerificationBanner: React.FC<KycVerificationBannerProps> = ({ profile }) => {
  const navigate = useNavigate();
  const { settings } = useSettingsContext();
  const [kycStatus, setKycStatus] = useState(() => getKycRequirementStatus(profile, settings));

  // Monitor profile changes and update KYC status
  useEffect(() => {
    const newKycStatus = getKycRequirementStatus(profile, settings);
    setKycStatus(newKycStatus);
    
    console.log('🛡️ KycVerificationBanner: Profile or settings changed, updating KYC status:', {
      profile_id: profile?.id,
      kyc_status: profile?.kyc_status,
      isRequired: newKycStatus.isRequired,
      isApproved: newKycStatus.isApproved,
      isBlocked: newKycStatus.isBlocked,
      shouldShowBanner: newKycStatus.isRequired && newKycStatus.isBlocked && profile?.role === 'employee'
    });
  }, [profile, settings, profile?.kyc_status, profile?.updated_at]);

  // Only show banner for employees who need KYC and are blocked (never for admins)
  const shouldShowBanner = profile?.role === 'employee' && 
                          kycStatus.isRequired && 
                          kycStatus.isBlocked;

  if (!shouldShowBanner) {
    return null;
  }

  const handleKycClick = () => {
    navigate('/kyc');
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-3 overflow-hidden rounded-lg shadow-sm bg-gradient-to-r from-accent/90 to-accent/70 dark:from-accent/80 dark:to-accent/60"
    >
      <div className="px-4 py-3 text-center">
        <h3 className="text-sm font-medium text-white">
          {kycStatus.statusInfo.title}
        </h3>
        <button
          onClick={handleKycClick}
          className="mt-2 w-full px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-md transition-all font-medium backdrop-blur-sm flex items-center justify-center space-x-1"
        >
          <AlertTriangle size={14} />
          <span>{kycStatus.statusInfo.actionText}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default KycVerificationBanner;
