import React, { useState } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { usePaymentManagement } from '../../hooks/usePaymentManagement';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { 
  AlertCircle, Clock, RefreshCw, Video, Users, Briefcase, Database,
  FileText, CheckSquare, Euro, CreditCard, UserPlus, MessageSquare
} from 'lucide-react';
import { FiCalendar, FiTrendingUp, FiActivity, FiPhone } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import AnimatedButton from '../../components/ui/AnimatedButton';
import { useAdminDashboardStats } from '../../hooks/useAdminDashboardStats';
import { motion } from 'framer-motion';

// Animation variants for cards
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Self-contained dashboard component with simplified data fetching
const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { colors, shouldShowPaymentManagement } = useSettingsContext();
  const { 
    stats, 
    videoSubmissions, 
    taskSubmissions,
    jobApplications,
    loading, 
    error, 
    fetchData 
  } = useAdminDashboardStats();
  
  // Payment management data (only in task-based payment mode)
  const {
    workerBalances,
    payoutRequests,
    loading: paymentLoading
  } = usePaymentManagement(shouldShowPaymentManagement());
  
  // Simple retry function
  const retryFetch = () => {
    fetchData(true);
  };

  // Calculate payment statistics
  const paymentStats = shouldShowPaymentManagement() ? {
    totalBalance: workerBalances.reduce((sum, balance) => sum + balance.current_balance, 0),
    pendingPayouts: payoutRequests.filter(req => req.status === 'pending').length,
    pendingAmount: payoutRequests.filter(req => req.status === 'pending').reduce((sum, req) => sum + req.amount, 0)
  } : null;

  // Admin-specific statistics with improved structure
  const baseStatCards = [
    { 
      title: 'Bewerbungen',
      value: loading ? '-' : jobApplications.length.toString(),
      icon: <Database size={20} />,
      link: '/admin/job-applications',
      color: 'indigo',
      description: 'Gesamt eingegangen'
    },
    { 
      title: 'Mitarbeiter',
      value: loading ? '-' : stats.employeeCount.toString(),
      icon: <Users size={20} />,
      link: '/admin/employees',
      color: 'blue',
      description: 'Aktive Mitarbeiter'  
    },
    { 
      title: 'Video-Anfragen',
      value: loading ? '-' : videoSubmissions.length.toString(),
      icon: <Video size={20} />,
      link: '/admin/submissions',
      color: 'purple',
      description: 'Unbearbeitet'
    },
    { 
      title: 'Aktive Aufträge',
      value: loading ? '-' : stats.activeTasksCount.toString(),
      icon: <Briefcase size={20} />,
      link: '/admin/task-templates',
      color: 'green',
      description: 'In Bearbeitung'
    },
    { 
      title: 'KYC-Prüfungen',
      value: loading ? '-' : (stats.kycPendingCount || 0).toString(),
      icon: <FileText size={20} />,
      link: '/admin/kyc-review',
      color: 'orange',
      description: 'Ausstehend'
    }
  ];

  // Add payment statistics when in task-based payment mode
  const paymentStatCards = shouldShowPaymentManagement() && paymentStats ? [
    {
      title: 'Gesamtguthaben',
      value: paymentLoading ? '-' : `€${paymentStats.totalBalance.toFixed(2)}`,
      icon: <Euro size={20} />,
      link: '/admin/payment-management',
      color: 'emerald',
      description: 'Mitarbeiter-Guthaben'
    },
    {
      title: 'Ausstehende Auszahlungen',
      value: paymentLoading ? '-' : paymentStats.pendingPayouts.toString(),
      icon: <CreditCard size={20} />,
      link: '/admin/payment-management',
      color: 'amber',
      description: `€${paymentStats.pendingAmount.toFixed(2)}`
    }
  ] : [];

  const statCards = [...baseStatCards, ...paymentStatCards];
  
  // Get current date and time
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('de-DE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Activity data - simplified to just show latest activities

  return (
    <div className="space-y-8 w-full">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
              Willkommen zurück, <span className="font-app-medium text-gray-800 dark:text-gray-200">{profile ? `${profile.first_name} ${profile.last_name}` : ''}</span>. 
              Hier ist ein Überblick über Ihr Unternehmen.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex items-center bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm">
              <FiCalendar className="text-accent mr-2" size={16} />
              <p className="text-sm font-app text-gray-700 dark:text-gray-300">
                {formattedDate}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryFetch}
              disabled={loading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>

      {loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-12"
        >
          <LoadingSpinner size="lg" />
        </motion.div>
      )}

      {error && !loading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-6 rounded-xl shadow-sm flex flex-col items-center"
        >
          <div className="flex items-center mb-4">
            <AlertCircle className="mr-2" size={20} />
            <p className="font-app">Fehler beim Laden der Dashboard-Daten.</p>
          </div>
          <div className="mt-2">
            <AnimatedButton
              onClick={retryFetch}
              variant="danger"
              icon={<RefreshCw size={16} />}
              disabled={loading}
            >
              Daten neu laden
            </AnimatedButton>
          </div>
        </motion.div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {statCards.map((stat, index) => {
              // Define color variants using branding colors
              const colorVariants: Record<string, { bg: string, text: string, icon: string }> = {
                blue: { 
                  bg: `bg-[${colors.primary}]/5 dark:bg-gray-800`, 
                  text: `text-[${colors.primary}] dark:text-white`,
                  icon: `bg-[${colors.primary}]/10 dark:bg-gray-700 text-[${colors.primary}] dark:text-white`
                },
                green: { 
                  bg: `bg-[${colors.accent}]/5 dark:bg-gray-800`, 
                  text: `text-[${colors.accent}] dark:text-white`,
                  icon: `bg-[${colors.accent}]/10 dark:bg-gray-700 text-[${colors.accent}] dark:text-white`
                },
                purple: { 
                  bg: `bg-[${colors.primaryDark}]/5 dark:bg-gray-800`, 
                  text: `text-[${colors.primaryDark}] dark:text-white`,
                  icon: `bg-[${colors.primaryDark}]/10 dark:bg-gray-700 text-[${colors.primaryDark}] dark:text-white`
                },
                orange: { 
                  bg: `bg-orange-50 dark:bg-gray-800`, 
                  text: `text-orange-600 dark:text-orange-400`,
                  icon: `bg-orange-100 dark:bg-gray-700 text-orange-600 dark:text-orange-400`
                },
                emerald: { 
                  bg: `bg-emerald-50 dark:bg-gray-800`, 
                  text: `text-emerald-600 dark:text-emerald-400`,
                  icon: `bg-emerald-100 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400`
                },
                amber: { 
                  bg: `bg-amber-50 dark:bg-gray-800`, 
                  text: `text-amber-600 dark:text-amber-400`,
                  icon: `bg-amber-100 dark:bg-gray-700 text-amber-600 dark:text-amber-400`
                },
                indigo: { 
                  bg: `bg-gray-50 dark:bg-gray-800`, 
                  text: `text-gray-700 dark:text-gray-300`,
                  icon: `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`
                }
              };
              
              const colorStyle = colorVariants[stat.color] || colorVariants.blue;
              
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Link to={stat.link}>
                    <Card className="h-full shadow-sm border-0 overflow-hidden">
                      <div className={`h-1 w-full ${
                        stat.color === 'emerald' ? 'bg-emerald-500 dark:bg-emerald-400' :
                        stat.color === 'amber' ? 'bg-amber-500 dark:bg-amber-400' :
                        stat.color === 'orange' ? 'bg-orange-500 dark:bg-orange-400' :
                        stat.color === 'blue' || stat.color === 'purple' ? `bg-[${colors.primary}] dark:bg-[${colors.primaryLight}]` : 
                        `bg-[${colors.accent}] dark:bg-[${colors.accentLight}]`
                      }`}></div>
                      <CardContent className="p-6">
                        <div className="flex items-start">
                          <div className={`p-3 rounded-lg ${colorStyle.icon} mr-4`}>
                            {React.cloneElement(stat.icon, { size: 24 })}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-app font-app-medium ${colorStyle.text}`}>{stat.title}</p>
                            <div className="flex items-baseline mt-1">
                              <p className="text-3xl font-app font-app-bold text-gray-900 dark:text-white">{stat.value}</p>
                              <p className="ml-2 text-xs font-app text-gray-500 dark:text-gray-400">{stat.description}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Activity Feed */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="h-full border-0 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 pb-3">
                  <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white flex items-center">
                    <FiActivity size={18} className="mr-2 text-accent" />
                    Aktivitäten
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(() => {
                      // Create combined activities array from all submission types
                      const videoActivities = videoSubmissions.map(submission => ({
                        id: submission.id,
                        type: 'video',
                        title: submission.task_name,
                        name: submission.employee_name,
                        date: submission.date,
                        rawDate: new Date(submission.date.split('.').reverse().join('-'))
                      }));
                      
                      const taskActivities = taskSubmissions.map(submission => ({
                        id: submission.id,
                        type: submission.type,
                        title: submission.task_name,
                        name: submission.employee_name,
                        date: submission.date,
                        rawDate: new Date(submission.date.split('.').reverse().join('-'))
                      }));
                      
                      // Combine all activities
                      const allActivities = [
                        ...videoActivities,
                        ...taskActivities
                      ];
                      
                      // Sort by date (newest first) and limit to 8
                      const sortedActivities = allActivities
                        .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
                        .slice(0, 8);
                      
                      if (sortedActivities.length === 0) {
                        return (
                          <li className="py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Video size={32} className="text-gray-300 dark:text-gray-400 mb-2" />
                              <p className="text-sm font-app text-gray-500 dark:text-gray-400">
                                Keine aktuellen Aktivitäten
                              </p>
                            </div>
                          </li>
                        );
                      }
                      
                      return sortedActivities.map(activity => {
                        let iconBg, iconColor, badgeBg, badgeText, badgeBorder, icon, label;
                        
                        switch (activity.type) {
                          case 'video':
                            iconBg = 'bg-blue-100 dark:bg-blue-800/50';
                            iconColor = 'text-blue-600 dark:text-blue-300';
                            badgeBg = 'bg-blue-100 dark:bg-blue-800/30';
                            badgeText = 'text-blue-800 dark:text-blue-200';
                            badgeBorder = 'border-blue-200 dark:border-blue-800/50';
                            icon = <Video size={12} className="mr-1" />;
                            label = 'Video-Chat';
                            break;
                          case 'task':
                            iconBg = 'bg-green-100 dark:bg-green-800/50';
                            iconColor = 'text-green-600 dark:text-green-300';
                            badgeBg = 'bg-green-100 dark:bg-green-800/30';
                            badgeText = 'text-green-800 dark:text-green-200';
                            badgeBorder = 'border-green-200 dark:border-green-800/50';
                            icon = <CheckSquare size={12} className="mr-1" />;
                            label = 'Aufgabe';
                            break;
                          case 'kyc':
                            iconBg = 'bg-orange-100 dark:bg-orange-800/50';
                            iconColor = 'text-orange-600 dark:text-orange-300';
                            badgeBg = 'bg-orange-100 dark:bg-orange-800/30';
                            badgeText = 'text-orange-800 dark:text-orange-200';
                            badgeBorder = 'border-orange-200 dark:border-orange-800/50';
                            icon = <FileText size={12} className="mr-1" />;
                            label = 'KYC';
                            break;
                          default:
                            iconBg = 'bg-gray-100 dark:bg-gray-800/50';
                            iconColor = 'text-gray-600 dark:text-gray-300';
                            badgeBg = 'bg-gray-100 dark:bg-gray-800/30';
                            badgeText = 'text-gray-800 dark:text-gray-200';
                            badgeBorder = 'border-gray-200 dark:border-gray-800/50';
                            icon = <AlertCircle size={12} className="mr-1" />;
                            label = 'Unbekannt';
                        }
                        
                        return (
                          <li key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-start">
                              <div className={`p-2 rounded-md ${iconBg} mr-3 mt-0.5`}>
                                {activity.type === 'video' ? (
                                  <Video size={16} className={iconColor} />
                                ) : activity.type === 'task' ? (
                                  <CheckSquare size={16} className={iconColor} />
                                ) : activity.type === 'kyc' ? (
                                  <FileText size={16} className={iconColor} />
                                ) : (
                                  <AlertCircle size={16} className={iconColor} />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                  <p className="text-sm font-app font-app-medium text-gray-900 dark:text-white">{activity.title}</p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 sm:mt-0 rounded-full text-xs font-app font-app-medium ${badgeBg} ${badgeText} border ${badgeBorder} shadow-sm`}>
                                    {icon}
                                    {label}
                                  </span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <p className="text-xs font-app text-gray-500 dark:text-gray-400 flex items-center">
                                    <span className="font-app-medium text-gray-700 dark:text-gray-300 mr-1">{activity.name}</span> 
                                    <span className="mx-1">•</span> 
                                    <Clock size={12} className="mr-1" /> 
                                    {activity.date}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      });
                    })()}
                  </ul>
                </CardContent>
                <CardFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 py-3">
                  <div className="w-full flex justify-end">
                    <Link to="/admin/task-submissions">
                      <Button variant="outline" size="sm" rightIcon={<FiTrendingUp size={14} />}>
                        Alle Prüfungen
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Latest Job Applications */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card className="h-full border-0 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 pb-3">
                  <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white flex items-center">
                    <Users size={18} className="mr-2 text-accent" />
                    Neueste Bewerbungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(() => {
                      if (jobApplications.length === 0) {
                        return (
                          <li className="py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Users size={32} className="text-gray-300 dark:text-gray-400 mb-2" />
                              <p className="text-sm font-app text-gray-500 dark:text-gray-400">
                                Keine Bewerbungen vorhanden
                              </p>
                            </div>
                          </li>
                        );
                      }
                      
                      return jobApplications.map(application => {
                        let statusBg, statusText, statusBorder;
                        
                        switch (application.status) {
                          case 'pending':
                            statusBg = 'bg-yellow-100 dark:bg-yellow-800/30';
                            statusText = 'text-yellow-800 dark:text-yellow-200';
                            statusBorder = 'border-yellow-200 dark:border-yellow-800/50';
                            break;
                          case 'approved':
                            statusBg = 'bg-green-100 dark:bg-green-800/30';
                            statusText = 'text-green-800 dark:text-green-200';
                            statusBorder = 'border-green-200 dark:border-green-800/50';
                            break;
                          case 'rejected':
                            statusBg = 'bg-red-100 dark:bg-red-800/30';
                            statusText = 'text-red-800 dark:text-red-200';
                            statusBorder = 'border-red-200 dark:border-red-800/50';
                            break;
                          default:
                            statusBg = 'bg-gray-100 dark:bg-gray-800/30';
                            statusText = 'text-gray-800 dark:text-gray-200';
                            statusBorder = 'border-gray-200 dark:border-gray-800/50';
                        }
                        
                        const statusLabel = application.status === 'pending' ? 'Ausstehend' : 
                                          application.status === 'approved' ? 'Genehmigt' : 
                                          application.status === 'rejected' ? 'Abgelehnt' : 'Unbekannt';
                        
                        return (
                          <li key={application.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-start">
                              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-800/50 mr-3 mt-0.5">
                                <Users size={16} className="text-blue-600 dark:text-blue-300" />
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                  <div className="flex-1">
                                    <p className="text-sm font-app font-app-medium text-gray-900 dark:text-white">{application.applicant_name}</p>
                                    <div className="flex items-center mt-1">
                                      <p className="text-xs font-app text-gray-500 dark:text-gray-400 mr-1">{application.email}</p>
                                      {application.preferred_job_type && (
                                        <>
                                          <span className="mx-1 text-gray-400">•</span>
                                          <p className="text-xs font-app text-gray-600 dark:text-gray-300">
                                            {application.preferred_job_type}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 sm:mt-0 rounded-full text-xs font-app font-app-medium ${statusBg} ${statusText} border ${statusBorder} shadow-sm`}>
                                    {statusLabel}
                                    <span className="mx-1">•</span>
                                    <Clock size={10} className="mr-1" />
                                    {application.date}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      });
                    })()}
                  </ul>
                </CardContent>
                <CardFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 py-3">
                  <div className="w-full flex justify-end">
                    <Link to="/admin/job-applications">
                      <Button variant="outline" size="sm" rightIcon={<FiTrendingUp size={14} />}>
                        Alle Bewerbungen
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>

          </div>
        </>
      )}
    </div>
  );
};

// Prevent unnecessary re-renders
export default React.memo(AdminDashboard);
