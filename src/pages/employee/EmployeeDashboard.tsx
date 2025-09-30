import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { 
  Video, AlertCircle, Clock, RefreshCw, CheckCircle, FileText, Briefcase, Star, CreditCard, Euro
} from 'lucide-react';
import { FiCalendar, FiTrendingUp, FiActivity, FiArrowRight } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import AnimatedButton from '../../components/ui/AnimatedButton';
import { useEmployeeDashboardStats } from '../../hooks/useEmployeeDashboardStats';
import { useTaskTemplates } from '../../hooks/useTaskTemplates';
import { useWorkerBalance } from '../../hooks/useWorkerBalance';
import { motion } from 'framer-motion';
import KycGate from '../../components/common/KycGate';


// Self-contained dashboard component with simplified data fetching
const EmployeeDashboard: React.FC = () => {
  const { profile, isTaskBasedUser } = useAuth();
  const { colors } = useSettingsContext();
  const navigate = useNavigate();

  const { 
    stats, 
    tasks, 
    loading, 
    tasksLoading, 
    error, 
    fetchData,
    formatDate
  } = useEmployeeDashboardStats();
  
  // Fetch available task templates
  const { templates, loading: templatesLoading } = useTaskTemplates();
  
  // Fetch worker balance (only for users with task-based payment mode)
  const { 
    balance, 
    loading: balanceLoading, 
    error: balanceError
  } = useWorkerBalance(isTaskBasedUser() ? profile?.id : undefined);
  
  // Filter templates that employees can see (you might want to add a field for this)
  const availableTemplates = templates.filter(template => 
    template.is_starter_job || template.type === 'public' // Add your filtering logic here
  ).slice(0, 4); // Show only first 4 templates
  
  // Simple retry function
  const retryFetch = () => {
    fetchData(true);
  };

  // Handle template card click - navigate to specific task assignment
  const handleTemplateClick = (templateId: string) => {
    // Find the task assignment that matches this template for the current user
    const matchingTask = tasks.find(task => task.task_template_id === templateId);
    
    if (matchingTask) {
      // Navigate directly to the task flow to avoid double-click requirement
      navigate(`/task-assignments/${matchingTask.id}/flow`);
    } else {
      // If no assignment found, navigate to tasks overview
      navigate(`/mitarbeiter/tasks`);
    }
  };

  // Get current date and time
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('de-DE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Employee-specific statistics with improved structure
  const baseStatCards = [
    { 
      title: 'Abgeschlossene Aufträge',
      value: loading ? '-' : stats.userCompletedTasksCount.toString(),
      icon: <CheckCircle size={20} />,
      link: '/mitarbeiter/tasks',
      color: 'green',
      description: 'Gesamt'
    },
    { 
      title: 'Aktive Aufträge',
      value: loading ? '-' : stats.userTasksCount.toString(),
      icon: <Briefcase size={20} />,
      link: '/mitarbeiter/tasks',
      color: 'blue',
      description: 'In Bearbeitung'
    },
    // Only show documents/contracts card for contract-based users
    ...(isTaskBasedUser() ? [] : [{
      title: 'Dokumente',
      value: loading ? '-' : stats.userDocumentsCount.toString(),
      icon: <FileText size={20} />,
      link: '/mitarbeiter/contracts',
      color: 'purple',
      description: 'Verträge & Dokumente'
    }]),
    // Only show hours for contract-based users (irrelevant for task-based)
    ...(isTaskBasedUser() ? [] : [{
      title: 'Stunden diesen Monat',
      value: loading ? '-' : `${stats.userHoursThisMonth}h`,
      icon: <Clock size={20} />,
      link: '/mitarbeiter/tasks',
      color: 'amber',
      description: 'Arbeitszeit'
    }])
  ];

  // Add balance card for task-based users
  const balanceCards = isTaskBasedUser() ? [
    {
      title: 'Aktuelles Guthaben',
      value: balanceLoading ? '-' : `€${balance?.current_balance?.toFixed(2) || '0.00'}`,
      icon: <Euro size={20} />,
      link: '/mitarbeiter/auszahlung',
      color: 'emerald',
      description: 'Verfügbar für Auszahlung'
    },
    {
      title: 'Gesamt verdient',
      value: balanceLoading ? '-' : `€${balance?.total_earned?.toFixed(2) || '0.00'}`,
      icon: <CreditCard size={20} />,
      link: '/mitarbeiter/auszahlung',
      color: 'indigo',
      description: 'Alle Aufgaben'
    }
  ] : [];

  const statCards = [...baseStatCards, ...balanceCards];

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
            <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Mitarbeiter Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
              Willkommen zurück, <span className="font-app-medium text-gray-800 dark:text-gray-200">{profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email : ''}</span>. 
              Hier ist ein Überblick über Ihre Aktivitäten.
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
        <KycGate 
          profile={profile} 
          settings={null} 
          mode="prompt"
        >
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  amber: { 
                    bg: `bg-[${colors.accentDark}]/5 dark:bg-gray-800`, 
                    text: `text-[${colors.accentDark}] dark:text-white`,
                    icon: `bg-[${colors.accentDark}]/10 dark:bg-gray-700 text-[${colors.accentDark}] dark:text-white`
                  },
                  emerald: { 
                    bg: `bg-emerald-50 dark:bg-gray-800`, 
                    text: `text-emerald-600 dark:text-emerald-400`,
                    icon: `bg-emerald-100 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400`
                  },
                  indigo: { 
                    bg: `bg-indigo-50 dark:bg-gray-800`, 
                    text: `text-indigo-600 dark:text-indigo-400`,
                    icon: `bg-indigo-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400`
                  }
                };
                
                const colorStyle = colorVariants[stat.color] || colorVariants.blue;
                
                const CardWrapper = ({ children }: { children: React.ReactNode }) => {
                  if ((stat as any).onClick) {
                    return (
                      <div 
                        onClick={(stat as any).onClick}
                        className="cursor-pointer"
                      >
                        {children}
                      </div>
                    );
                  }
                  return <Link to={stat.link}>{children}</Link>;
                };

                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <CardWrapper>
                      <Card className="h-full shadow-sm border-0 overflow-hidden hover:shadow-md transition-shadow">
                        <div className={`h-1 w-full ${stat.color === 'emerald' || stat.color === 'indigo' ? `bg-${stat.color}-500` : stat.color === 'blue' || stat.color === 'purple' ? `bg-[${colors.primary}]` : `bg-[${colors.accent}]`} dark:${stat.color === 'emerald' || stat.color === 'indigo' ? `bg-${stat.color}-400` : stat.color === 'blue' || stat.color === 'purple' ? `bg-[${colors.primaryLight}]` : `bg-[${colors.accentLight}]`}`}></div>
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
                    </CardWrapper>
                  </motion.div>
                );
              })}
            </div>

            {/* Available Task Templates Section */}
            {availableTemplates.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="grid grid-cols-1 gap-6"
              >
                <Card className="shadow-sm border-0 overflow-hidden">
                  <div className={`h-1 w-full bg-[${colors.accent}] dark:bg-[${colors.accentLight}]`}></div>
                  <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg bg-[${colors.accent}]/10 dark:bg-gray-700 text-[${colors.accent}] dark:text-white mr-3`}>
                        <Star size={18} />
                      </div>
                      <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white">Verfügbare Aufgaben</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    {templatesLoading ? (
                      <div className="flex justify-center py-6">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {availableTemplates.map((template) => (
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                            className="cursor-pointer"
                            onClick={() => handleTemplateClick(template.id)}
                          >
                            <Card className="h-full shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-app font-app-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                                      {template.title}
                                    </h3>
                                    {template.is_starter_job && (
                                      <div className="flex items-center mt-1">
                                        <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400">Starter-Job</span>
                                      </div>
                                    )}
                                  </div>
                                  <FiArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0 ml-2" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">
                                  {template.description || 'Keine Beschreibung verfügbar'}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    template.priority === 'high' 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                                      : template.priority === 'medium'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {template.priority === 'high' ? 'Hoch' : template.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                                  </span>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTemplateClick(template.id);
                                    }}
                                    className="text-xs py-1 px-2 h-auto"
                                  >
                                    Details
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* My Tasks Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="grid grid-cols-1 gap-6"
            >
              <Card className="shadow-sm border-0 overflow-hidden">
                <div className={`h-1 w-full bg-[${colors.primary}] dark:bg-[${colors.primaryLight}]`}></div>
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg bg-[${colors.primary}]/10 dark:bg-gray-700 text-[${colors.primary}] dark:text-white mr-3`}>
                      <Briefcase size={18} />
                    </div>
                    <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white">Meine Aufträge</CardTitle>
                  </div>
                  <Link to="/mitarbeiter/tasks" className="text-sm font-app text-accent hover:underline">
                    Alle anzeigen
                  </Link>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {tasksLoading ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-3 w-12 h-12 flex items-center justify-center">
                        <Briefcase className="text-gray-500 dark:text-gray-400" size={24} />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 font-app">Keine aktiven Aufträge vorhanden.</p>
                      <div className="mt-4">
                        <Link to="/mitarbeiter/tasks">
                          <Button variant="outline" size="sm">
                            Zur Auftragsübersicht
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        {tasks.slice(0, 5).map((task) => (
                          <Link 
                            key={task.id}
                            to={`/task-assignments/${task.id}/flow`} 
                            className="block hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="p-4">
                              <div className="flex items-start">
                                <div className="mt-0.5 mr-3 flex-shrink-0">
                                  {task.current_step > 0 ? (
                                    <div className={`w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center`}>
                                      <Video size={16} />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                                      <Video size={16} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-app font-app-medium text-gray-900 dark:text-white text-base">
                                    {task.task_template?.title || 'Unnamed Task'}
                                  </h3>
                                  <p className="text-sm font-app text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                    {task.task_template?.description || 'No description'}
                                  </p>
                                  <div className="flex items-center mt-2 text-xs font-app text-gray-500 dark:text-gray-400">
                                    <Clock size={12} className="mr-1" />
                                    <span>Erstellt am {formatDate(task.created_at)}</span>
                                  </div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <div className={`px-2.5 py-1 rounded-full text-xs font-app font-app-medium ${
                                    task.current_step > 0 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {task.current_step > 0 ? 'In Bearbeitung' : 'Neu'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {tasks.length > 5 && (
                        <div className="text-center pt-2">
                          <Link to="/mitarbeiter/tasks" className="text-sm font-app text-accent hover:underline">
                            {tasks.length - 5} weitere Aufträge anzeigen
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </KycGate>
      )}

    </div>
  );
};

export default React.memo(EmployeeDashboard);
