import React from 'react';
import { FiUser, FiHome, FiBriefcase, FiFileText } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSettingsContext } from '../../context/SettingsContext';

type TabType = 'personal' | 'address' | 'financial' | 'payroll';

interface ProfileTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  children: React.ReactNode;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  setActiveTab,
  children
}) => {
  const { colors } = useSettingsContext();
  
  const tabVariants = {
    inactive: { opacity: 0, y: 10 },
    active: { opacity: 1, y: 0 }
  };

  return (
    <div>
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-6 pb-1 gap-2">
        <button
          type="button"
          className={`px-4 py-2 font-app font-app-medium text-sm rounded-md ${activeTab === 'personal' ? `bg-[${colors.primary}]/10 text-[${colors.primary}] dark:bg-[${colors.primary}]/20 dark:text-white` : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveTab('personal')}
        >
          <FiUser className="inline-block mr-1" size={16} />
          Persönliche Daten
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-app font-app-medium text-sm rounded-md ${activeTab === 'address' ? `bg-[${colors.primary}]/10 text-[${colors.primary}] dark:bg-[${colors.primary}]/20 dark:text-white` : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveTab('address')}
        >
          <FiHome className="inline-block mr-1" size={16} />
          Adresse
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-app font-app-medium text-sm rounded-md ${activeTab === 'financial' ? `bg-[${colors.primary}]/10 text-[${colors.primary}] dark:bg-[${colors.primary}]/20 dark:text-white` : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveTab('financial')}
        >
          <FiBriefcase className="inline-block mr-1" size={16} />
          Finanzdaten
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-app font-app-medium text-sm rounded-md ${activeTab === 'payroll' ? `bg-[${colors.primary}]/10 text-[${colors.primary}] dark:bg-[${colors.primary}]/20 dark:text-white` : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveTab('payroll')}
        >
          <FiFileText className="inline-block mr-1" size={16} />
          Lohnabrechnung
        </button>
      </div>
      
      {children}
    </div>
  );
};

export default ProfileTabs;
