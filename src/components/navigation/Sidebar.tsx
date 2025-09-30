import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Briefcase, Phone, FileText, 
  CheckSquare, User, X, LogOut, Video, Settings,
  Building, Database, CheckCircle, CreditCard, Brain
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { motion } from 'framer-motion';
import KycVerificationBanner from './KycVerificationBanner';
interface SidebarProps {
  onClose?: () => void;
}

interface SidebarNavLink {
  to: string;
  icon: React.ReactNode;
  label: string;
  notifications?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { profile, logout, isAdmin, loading, isTaskBasedUser, hasPaymentModeAssigned } = useAuth();
  const { settings, shouldShowPaymentManagement } = useSettingsContext();
  const navigate = useNavigate();
  
  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
      isActive 
        ? 'bg-accent/20 text-accent-light' 
        : 'text-gray-300 hover:bg-slate-700 hover:text-white dark:hover:bg-gray-700 dark:hover:text-white'
    }`;

  // Admin dashboard categories
  const adminCategories: Array<{name: string, links: SidebarNavLink[]}> = [
    {
      name: 'Übersicht',
      links: [
        { to: '/admin/dashboard', icon: <Home size={18} />, label: 'Dashboard' },
        { to: '/admin/job-applications', icon: <Users size={18} />, label: 'Bewerbungen' },
        { to: '/admin/employees', icon: <Users size={18} />, label: 'Mitarbeiter' },
      ]
    },
    {
      name: 'Anfragen',
      links: [
        { to: '/admin/kyc-review', icon: <CheckCircle size={18} />, label: 'KYC-Prüfung' },
        { 
          to: '/admin/task-submissions', 
          icon: <CheckSquare size={18} />, 
          label: 'Aufgaben-Prüfung'
        },
        { to: '/admin/submissions', icon: <Video size={18} />, label: 'Video-Chat Anfragen' },
      ]
    },
    {
      name: 'Verwaltung',
      links: [
        { to: '/admin/task-templates', icon: <Briefcase size={18} />, label: 'Aufträge' },
        { to: '/admin/phone-numbers', icon: <Phone size={18} />, label: 'Telefonnummern' },
        { to: '/admin/bankdrops', icon: <Database size={18} />, label: 'Bankdrops' },
        ...(shouldShowPaymentManagement() ? [{ to: '/admin/payment-management', icon: <CreditCard size={18} />, label: 'Zahlungsmanagement' }] : []),
      ]
    },
    {
      name: 'Einstellungen',
      links: [
        { to: '/admin/ai-knowledge', icon: <Brain size={18} />, label: 'AI Chat Agent' },
        { to: '/admin/settings', icon: <Settings size={18} />, label: 'Einstellungen' },
      ]
    },

  ];

  // Employee links - conditional based on USER'S payment mode (not global)
  const employeeLinks = [
    { to: '/mitarbeiter/dashboard', icon: <Home size={18} />, label: 'Dashboard' },
    { to: '/mitarbeiter/tasks', icon: <CheckSquare size={18} />, label: 'Meine Aufträge' },
    // Only show payment-specific options if payment mode has been assigned
    ...(hasPaymentModeAssigned() 
      ? (isTaskBasedUser() 
          ? [{ to: '/mitarbeiter/auszahlung', icon: <CreditCard size={18} />, label: 'Auszahlung' }]
          : [{ to: '/mitarbeiter/contracts', icon: <FileText size={18} />, label: 'Meine Verträge' }]
        )
      : [] // Show neither if payment mode not assigned yet
    ),
  ];
  
  // Handle profile navigation
  const navigateToProfile = () => {
    navigate('/profile');
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 dark:bg-gray-900 text-white shadow-lg">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 w-auto mr-2" />
          ) : (
            <Building size={24} className="text-accent mr-2" />
          )}
          <h1 className="text-xl font-bold tracking-wide text-white flex items-center leading-none">{settings?.website_name || 'Admin Portal'}</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white md:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-1 overflow-y-auto">
        {isAdmin() ? (
          // Admin navigation with categories
          <div className="space-y-4">
            {adminCategories.map((category, categoryIndex) => (
              <div key={category.name} className="space-y-1">
                <div className="px-2 py-1">
                  <span className="text-xs font-app font-app-medium text-gray-300 dark:text-gray-400 uppercase tracking-wider">
                    {category.name}
                  </span>
                </div>
                
                {category.links.map((link, linkIndex) => (
                  <motion.div 
                    key={link.to}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (categoryIndex * 0.1) + (linkIndex * 0.05) }}
                  >
                    <NavLink to={link.to} className={navLinkClass} onClick={onClose}>
                      <span className="mr-3">{link.icon}</span>
                      <span className="flex-1">{link.label}</span>
                      {link.notifications && link.notifications > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {link.notifications > 99 ? '99+' : link.notifications}
                        </span>
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Employee navigation remains flat
          <div className="space-y-1">
            <div className="px-2 py-1">
              <span className="text-xs font-app font-app-medium text-gray-300 dark:text-gray-400 uppercase tracking-wider">
                Navigation
              </span>
            </div>
            
            {employeeLinks.map((link, index) => (
              <motion.div 
                key={link.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavLink to={link.to} className={navLinkClass} onClick={onClose}>
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-slate-700 dark:border-gray-700">
        {/* KYC Verification Banner - only shown for employees who need to verify */}
        {/* Debug info logged to console */}
        <div className="hidden">{JSON.stringify({ profile, isAdmin: isAdmin() })}</div>
        <KycVerificationBanner profile={profile} />
        
        <button 
          onClick={navigateToProfile}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-accent/20 h-10 w-10 rounded-full flex items-center justify-center text-accent">
                {loading ? '?' : (profile?.first_name?.charAt(0).toUpperCase() || '?')}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-app font-app-medium text-white dark:text-white">
                {loading ? 'Loading...' : `${profile?.first_name || ''} ${profile?.last_name || ''}`}
              </p>
              <p className="text-xs font-app text-gray-300 dark:text-gray-400">
                {profile?.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
              </p>
            </div>
          </div>
          <span className="text-gray-400">›</span>
        </button>
        
        <button 
          onClick={logout}
          className="mt-3 flex items-center w-full px-3 py-2 text-sm font-app text-gray-300 dark:text-gray-300 rounded-md hover:bg-slate-700 hover:text-white dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <LogOut size={18} className="mr-2" />
          Abmelden
        </button>
      </div>
    </div>
  );
};

export default Sidebar;