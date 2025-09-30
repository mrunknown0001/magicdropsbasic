import React from 'react';
import { motion } from 'framer-motion';
import { Profile } from '../../types/database';
import { getKycRequirementStatus } from '../../utils/kycValidation';
import KycBlurOverlay from './KycBlurOverlay';
import { useNavigate } from 'react-router-dom';

interface BlurredTaskCardProps {
  children: React.ReactNode;
  profile: Profile | null;
  settings?: any;
  className?: string;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  taskId?: string; // For navigation purposes
  onUnlockClick?: () => void;
}

const BlurredTaskCard: React.FC<BlurredTaskCardProps> = ({
  children,
  profile,
  settings,
  className = '',
  blurIntensity = 'medium',
  taskId,
  onUnlockClick
}) => {
  const navigate = useNavigate();
  const kycStatus = getKycRequirementStatus(profile, settings);

  // If KYC is not required or user is approved, show content normally
  if (!kycStatus.isRequired || kycStatus.isApproved) {
    return <>{children}</>;
  }

  // Handle unlock click - navigate to KYC page
  const handleUnlockClick = () => {
    if (onUnlockClick) {
      onUnlockClick();
    } else {
      navigate('/kyc');
    }
  };

  // Show blurred content with overlay when KYC is required but not approved
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
    >
      <KycBlurOverlay
        profile={profile}
        blurIntensity={blurIntensity}
        showFullPrompt={false}
        onUnlockClick={handleUnlockClick}
      >
        {children}
      </KycBlurOverlay>
    </motion.div>
  );
};

export default BlurredTaskCard; 