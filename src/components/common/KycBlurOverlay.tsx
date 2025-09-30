import React from 'react';
import { motion } from 'framer-motion';
import { Profile } from '../../types/database';
import { getKycStatusInfo } from '../../utils/kycValidation';
import { User } from 'lucide-react';

interface KycBlurOverlayProps {
  children: React.ReactNode;
  profile: Profile | null;
  className?: string;
  overlayClassName?: string;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  showFullPrompt?: boolean;
  message?: string;
  onUnlockClick?: () => void;
}

const KycBlurOverlay: React.FC<KycBlurOverlayProps> = ({
  children,
  profile,
  className = '',
  overlayClassName = '',
  blurIntensity = 'medium',
  showFullPrompt = false,
  message,
  onUnlockClick
}) => {
  const statusInfo = getKycStatusInfo(profile?.kyc_status);

  // Blur intensity configurations
  const blurConfig = {
    light: 'blur-sm',
    medium: 'blur-md', 
    heavy: 'blur-lg'
  };

  const handleUnlockClick = () => {
    if (onUnlockClick) {
      onUnlockClick();
    }
  };

  const displayMessage = message || statusInfo.message;

  return (
    <div className={`relative ${className}`}>
      {/* Blurred Content */}
      <div className={`${blurConfig[blurIntensity]} pointer-events-none select-none`}>
        {children}
      </div>
      
      {/* Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          absolute inset-0 bg-white/80 dark:bg-gray-900/80 
          flex items-center justify-center backdrop-blur-sm
          ${overlayClassName}
        `}
      >
        {showFullPrompt ? (
          // Full verification prompt
          <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mb-4"
              >
                <User className="h-12 w-12 text-amber-500 mx-auto" />
              </motion.div>
              
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-lg font-semibold text-gray-900 dark:text-white mb-3"
              >
                {statusInfo.title}
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-sm text-gray-600 dark:text-gray-300 mb-4"
              >
                {displayMessage}
              </motion.p>
              
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                onClick={handleUnlockClick}
                className={`
                  inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                  transition-colors duration-200
                  ${statusInfo.color === 'amber' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : statusInfo.color === 'red'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                <User size={16} className="mr-2" />
                {statusInfo.actionText}
              </motion.button>
            </div>
          </div>
        ) : (
          // Compact overlay notice
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center p-6 bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <User className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Verifizierung erforderlich
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 max-w-xs">
              {displayMessage}
            </p>
            <button
              onClick={handleUnlockClick}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors duration-200"
            >
              <User size={14} className="mr-1" />
              Jetzt verifizieren
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default KycBlurOverlay; 