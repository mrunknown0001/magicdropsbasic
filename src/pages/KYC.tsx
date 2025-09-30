import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import KycDocumentUpload from '../components/profile/KycDocumentUpload';
import { useAuth } from '../context/AuthContext';
import { useProfileStats } from '../hooks/useProfileStats';
import { useSettingsContext } from '../context/SettingsContext';
import { getKycRequirementStatus } from '../utils/kycValidation';

const KYC: React.FC = () => {
  const { user, profile } = useAuth();
  const { fetchProfileData } = useProfileStats();
  const { settings } = useSettingsContext();
  const kycStatus = getKycRequirementStatus(profile, settings);
  const isVerified = kycStatus.isApproved;

  // Reference to the KYC section for scrolling
  const kycSectionRef = useRef<HTMLDivElement>(null);

  // Handle KYC upload completion
  const handleUploadComplete = () => {
    // Refresh profile data to get updated verification status
    fetchProfileData(true);
  };

  return (
    <div className="space-y-8 w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-app font-app-semibold text-gray-900 dark:text-white flex items-center">
              <FiShield className="mr-2" size={24} />
              Identitätsverifizierung
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Laden Sie Ihre Ausweisdokumente hoch, um Ihre Identität zu verifizieren.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to="/profile">
              <Button
                variant="outline"
                leftIcon={<FiArrowLeft size={16} />}
                className="border-gray-300 dark:border-gray-600"
              >
                Zurück zum Profil
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {isVerified ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-800/50 p-2 rounded-full">
              <FiShield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-green-800 dark:text-green-300">Verifizierung abgeschlossen</h3>
              <p className="mt-1 text-green-700 dark:text-green-400">
                Ihre Identität wurde erfolgreich verifiziert. Sie haben vollen Zugriff auf alle Funktionen.
              </p>
              {profile?.kyc_verified_at && (
                <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                  Verifiziert am: {new Date(profile.kyc_verified_at).toLocaleDateString('de-DE')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div ref={kycSectionRef}>
          <Card className="shadow-sm border-0 overflow-hidden">
            <div className="h-1 w-full bg-accent dark:bg-accent/80"></div>
            <div className="p-6">
              <h2 className="text-xl font-app font-app-medium text-gray-900 dark:text-white mb-6">
                Dokumente hochladen
              </h2>
              
              <KycDocumentUpload onUploadComplete={handleUploadComplete} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default KYC;
