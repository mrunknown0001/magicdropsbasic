import React, { useEffect, useState } from 'react';
import { Profile } from '../../types/database';
import { getKycRequirementStatus } from '../../utils/kycValidation';
import KycVerificationPrompt from './KycVerificationPrompt';

export type KycGateMode = 'hidden' | 'blurred' | 'prompt';

interface KycGateProps {
  children: React.ReactNode;
  profile: Profile | null;
  mode?: KycGateMode;
  settings?: any;
  className?: string;
  showPromptSize?: 'small' | 'medium' | 'large';
  fallback?: React.ReactNode;
}

const KycGate: React.FC<KycGateProps> = ({
  children,
  profile,
  mode = 'blurred',
  settings,
  className = '',
  showPromptSize = 'medium',
  fallback
}) => {
  const [kycStatus, setKycStatus] = useState(() => getKycRequirementStatus(profile, settings));

  // Monitor profile changes and update KYC status
  useEffect(() => {
    const newKycStatus = getKycRequirementStatus(profile, settings);
    setKycStatus(newKycStatus);
    
    console.log('🛡️ KycGate: Profile or settings changed, updating KYC status:', {
      profile_id: profile?.id,
      kyc_status: profile?.kyc_status,
      isRequired: newKycStatus.isRequired,
      isApproved: newKycStatus.isApproved,
      isBlocked: newKycStatus.isBlocked
    });
  }, [profile, settings, profile?.kyc_status, profile?.updated_at]);

  // If KYC is not required or user is approved, show content normally
  if (!kycStatus.isRequired || kycStatus.isApproved) {
    return <>{children}</>;
  }

  // Handle different modes when KYC is required but not approved
  switch (mode) {
    case 'hidden':
      // Don't render children at all, show fallback or verification prompt
      return (
        <div className={className}>
          {fallback || (
            <KycVerificationPrompt 
              profile={profile} 
              size={showPromptSize}
            />
          )}
        </div>
      );

    case 'prompt':
      // Show verification prompt instead of content
      return (
        <div className={className}>
          <KycVerificationPrompt 
            profile={profile} 
            size={showPromptSize}
          />
        </div>
      );

    case 'blurred':
    default:
      // Show blurred content with overlay
      return (
        <div className={`relative ${className}`}>
          {/* Blurred content */}
          <div className="filter blur-sm pointer-events-none select-none">
            {children}
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <KycVerificationPrompt 
                profile={profile} 
                size={showPromptSize}
              />
            </div>
          </div>
        </div>
      );
  }
};

export default KycGate; 