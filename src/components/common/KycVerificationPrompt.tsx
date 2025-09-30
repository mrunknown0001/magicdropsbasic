import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  XCircle, 
  CheckCircle, 
  User 
} from 'lucide-react';
import { Profile } from '../../types/database';
import { getKycStatusInfo } from '../../utils/kycValidation';
import Button from '../ui/Button';

interface KycVerificationPromptProps {
  profile: Profile | null;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const iconMap = {
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle,
  Shield: User
};

const KycVerificationPrompt: React.FC<KycVerificationPromptProps> = ({ 
  profile, 
  showActions = true,
  size = 'medium',
  className = ''
}) => {
  const navigate = useNavigate();
  const [statusInfo, setStatusInfo] = useState(() => getKycStatusInfo(profile?.kyc_status));

  // Monitor profile changes and update status info
  useEffect(() => {
    const newStatusInfo = getKycStatusInfo(profile?.kyc_status);
    setStatusInfo(newStatusInfo);
    
    console.log('🛡️ KycVerificationPrompt: Profile changed, updating status info:', {
      profile_id: profile?.id,
      kyc_status: profile?.kyc_status,
      status_info: newStatusInfo
    });
  }, [profile, profile?.kyc_status, profile?.updated_at]);

  const IconComponent = iconMap[statusInfo.icon as keyof typeof iconMap] || User;
  
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'py-6',
      icon: 'h-8 w-8',
      title: 'text-lg',
      message: 'text-sm',
      maxWidth: 'max-w-sm'
    },
    medium: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-xl',
      message: 'text-base',
      maxWidth: 'max-w-md'
    },
    large: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-2xl',
      message: 'text-lg',
      maxWidth: 'max-w-lg'
    }
  };

  const config = sizeConfig[size];

  // Color configurations
  const colorConfig = {
    amber: {
      icon: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      button: 'primary'
    },
    blue: {
      icon: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      button: 'primary'
    },
    red: {
      icon: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      button: 'danger'
    },
    green: {
      icon: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      button: 'primary'
    },
    gray: {
      icon: 'text-gray-500',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      button: 'outline'
    }
  };

  const colors = colorConfig[statusInfo.color];

  const handleAction = () => {
    navigate('/kyc');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${className} ${config.maxWidth} mx-auto`}
    >
      <div className={`${colors.bg} ${colors.border} border rounded-lg p-6 shadow-sm ${config.container}`}>
        <div className="text-center">
          <div className={`mx-auto ${config.icon} ${colors.icon} mb-4`}>
            <IconComponent />
          </div>
          
          <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${config.title}`}>
            {statusInfo.title}
          </h3>
          
          <p className={`text-gray-600 dark:text-gray-300 mb-6 ${config.message}`}>
            {statusInfo.message}
          </p>
          
          {showActions && statusInfo.status !== 'approved' && (
            <Button
              onClick={handleAction}
              variant={colors.button as any}
              size="sm"
              className="w-full"
            >
              {statusInfo.actionText}
            </Button>
          )}
          
          {statusInfo.status === 'approved' && profile?.kyc_verified_at && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Verifiziert am: {new Date(profile.kyc_verified_at).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default KycVerificationPrompt; 