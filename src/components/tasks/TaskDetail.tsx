import React, { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import AnimatedButton from '../ui/AnimatedButton';
import { TaskAssignment } from '../../types/database';
import { CheckCircle, Clock, AlertCircle, FileText, Video, User, ChevronDown, Upload, RefreshCw } from 'lucide-react';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import ShimmerEffect from '../ui/ShimmerEffect';
import { motion } from 'framer-motion';
import { useSettingsContext } from '../../context/SettingsContext';

// Mapping for status display
const statusMap = {
  'pending': { label: 'Ausstehend', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, darkBg: 'dark:bg-yellow-300', darkText: 'dark:text-yellow-900' },
  'submitted': { label: 'Eingereicht - Warten auf Prüfung', bg: 'bg-blue-100', text: 'text-blue-800', icon: Upload, darkBg: 'dark:bg-blue-300', darkText: 'dark:text-blue-900' },
  'completed': { label: 'Abgeschlossen', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, darkBg: 'dark:bg-green-300', darkText: 'dark:text-green-900' },
  'rejected': { label: 'Abgelehnt', bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, darkBg: 'dark:bg-red-300', darkText: 'dark:text-red-900' },
  'canceled': { label: 'Storniert', bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, darkBg: 'dark:bg-gray-300', darkText: 'dark:text-gray-900' }
};

interface TaskDetailProps {
  taskAssignment: TaskAssignment;
  isLoading?: boolean;
  onStartTask: () => void;
  onRestartTask?: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ 
  taskAssignment, 
  isLoading = false,
  onStartTask,
  onRestartTask
}) => {
  const { settings } = useSettingsContext();
  const { isTaskBasedUser } = useAuth();
  const primaryColor = settings?.primary_color || '#ee1d3c';
  const accentColor = settings?.accent_color || '#231f20';
  
  // Using useState to track if button was clicked to prevent double-click requirement
  const [isStarting, setIsStarting] = useState(false);

  if (isLoading) {
    return (
      <Card className="w-full h-full shadow-md border border-gray-100 dark:border-gray-800">
        <CardHeader>
          <ShimmerEffect className="h-8 w-3/4 mb-2" />
        </CardHeader>
        <CardContent>
          <ShimmerEffect className="h-4 w-full mb-4" />
          <ShimmerEffect className="h-4 w-full mb-4" />
          <ShimmerEffect className="h-4 w-1/2 mb-4" />
        </CardContent>
      </Card>
    );
  }

  if (!taskAssignment || !taskAssignment.task_template) {
    return (
      <Card className="w-full h-full shadow-md border border-gray-100 dark:border-gray-800">
        <CardHeader>
          <CardTitle>Keine Aufgabe ausgewählt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">Bitte wähle eine Aufgabe aus der Liste aus.</p>
        </CardContent>
      </Card>
    );
  }

  const { task_template } = taskAssignment;
  const statusInfo = statusMap[taskAssignment.status] || statusMap.pending;
  const StatusIcon = statusInfo.icon;

  const formatDateString = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };
  
  const getVideoChatStatusColor = (status: string) => {
    switch(status) {
      case 'not_started':
        return 'bg-yellow-400';
      case 'accepted':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'declined':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const handleStartClick = () => {
    if (isStarting) return; // Prevent multiple clicks
    
    setIsStarting(true);
    // Call the onStartTask function
    onStartTask();
    
    // Reset after a delay in case the navigation doesn't happen
    setTimeout(() => {
      setIsStarting(false);
    }, 2000);
  };

  // Determine if start button should be visible
  const isStartButtonVisible = taskAssignment.status === 'pending' && 
    (taskAssignment.video_chat_status === 'not_started' || !taskAssignment.video_chat_status);

  // Determine if continue button should be visible
  const isContinueButtonVisible = taskAssignment.status === 'pending' && 
    taskAssignment.video_chat_status === 'accepted';

  // Determine if restart button should be visible (for rejected tasks)
  const isRestartButtonVisible = taskAssignment.status === 'rejected' && onRestartTask;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full h-full overflow-auto shadow-md border border-gray-100 dark:border-gray-800">
        <CardHeader className="flex flex-col space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold mb-1">{task_template.title}</CardTitle>
              {taskAssignment.task_template_id && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aufgaben-ID: {taskAssignment.task_template_id.substring(0, 8)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.darkBg} ${statusInfo.darkText}`}>
                <StatusIcon size={12} className="mr-1" />
                {statusInfo.label}
              </span>
              {taskAssignment.due_date && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  <Clock size={12} className="mr-1" />
                  Fällig: {formatDateString(taskAssignment.due_date)}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 pb-6">
          <div className="space-y-6">
            {/* Submission Status - moved to top */}
            {(taskAssignment.status === 'submitted' || taskAssignment.status === 'rejected') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Status der Einreichung</h3>
                <div className={`rounded-lg p-5 shadow-sm border ${
                  taskAssignment.status === 'submitted' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center mr-4 ${
                      taskAssignment.status === 'submitted' 
                        ? 'bg-blue-100 dark:bg-blue-800' 
                        : 'bg-red-100 dark:bg-red-800'
                    }`}>
                      {taskAssignment.status === 'submitted' ? (
                        <Upload size={20} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      {taskAssignment.status === 'submitted' ? (
                        <div>
                          <h4 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">Aufgabe eingereicht</h4>
                          <p className="text-base text-blue-600 dark:text-blue-300 mb-2">
                            Ihre Aufgabe wurde erfolgreich eingereicht und wird nun von einem Administrator geprüft.
                          </p>
                          {taskAssignment.submitted_at && (
                            <p className="text-sm text-blue-500 dark:text-blue-400">
                              Eingereicht am: {formatDateString(taskAssignment.submitted_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Aufgabe abgelehnt</h4>
                          <p className="text-base text-red-600 dark:text-red-300 mb-3">
                            Ihre Aufgabe wurde vom Administrator abgelehnt. Bitte beachten Sie den unten stehenden Grund und starten Sie die Aufgabe neu.
                          </p>
                          {taskAssignment.rejection_reason && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-red-200 dark:border-red-700 mb-3">
                              <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Ablehnungsgrund:</h5>
                              <p className="text-red-700 dark:text-red-300">{taskAssignment.rejection_reason}</p>
                            </div>
                          )}
                          {taskAssignment.admin_notes && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-red-200 dark:border-red-700 mb-3">
                              <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Hinweise des Administrators:</h5>
                              <p className="text-red-700 dark:text-red-300">{taskAssignment.admin_notes}</p>
                            </div>
                          )}
                          {taskAssignment.reviewed_at && (
                            <p className="text-sm text-red-500 dark:text-red-400">
                              Abgelehnt am: {formatDateString(taskAssignment.reviewed_at)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="w-full mb-8"
            >
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Aufgabenbeschreibung</h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-start">
                  <div className="flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center mr-4"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                    }}
                  >
                    <FileText size={20} style={{ color: primaryColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {task_template.description || 'Keine Beschreibung vorhanden.'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Payment Information (Vergütung mode only) */}
            {isTaskBasedUser() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="w-full"
              >
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Vergütung</h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center mr-4 bg-emerald-100 dark:bg-emerald-900/30">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">€</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            €{(taskAssignment.custom_payment_amount || task_template.payment_amount || 0).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {taskAssignment.custom_payment_amount ? 'Individuelle Vergütung' : 'Standard-Vergütung'}
                          </p>
                        </div>
                        {taskAssignment.status === 'completed' && (
                          <div className="flex items-center space-x-2">
                            {taskAssignment.payment_status === 'approved' ? (
                              <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle size={16} className="mr-1" />
                                <span className="text-sm font-medium">Genehmigt</span>
                              </div>
                            ) : taskAssignment.payment_status === 'pending' ? (
                              <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                                <Clock size={16} className="mr-1" />
                                <span className="text-sm font-medium">Ausstehend</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Clock size={16} className="mr-1" />
                                <span className="text-sm font-medium">Wird geprüft</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {task_template.steps && task_template.steps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="w-full"
              >
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Aufgabenverlauf</h3>
                <div className="w-full overflow-hidden">
                  {task_template.steps.map((step, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
                      className={`mb-4 rounded-lg overflow-hidden shadow-sm border ${index < task_template.steps!.length - 1 ? '' : ''} ${
                        taskAssignment.current_step > index 
                          ? 'border-green-200 dark:border-green-800' 
                          : taskAssignment.current_step === index 
                          ? `border-2 border-${primaryColor.replace('#', '')} dark:border-${primaryColor.replace('#', '')}` 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className={`w-full p-5 ${taskAssignment.current_step > index 
                        ? 'bg-green-50 dark:bg-green-900/20' 
                        : taskAssignment.current_step === index 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : 'bg-white dark:bg-gray-800'
                      }`}>
                        <div className="flex items-start">
                          <div 
                            className={`flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center mr-4 ${taskAssignment.current_step > index 
                              ? 'bg-green-100 dark:bg-green-800' 
                              : taskAssignment.current_step === index 
                              ? `bg-${primaryColor.replace('#', '')}/10 dark:bg-${primaryColor.replace('#', '')}/30` 
                              : 'bg-gray-100 dark:bg-gray-700'}`}
                            style={taskAssignment.current_step === index ? {
                              backgroundColor: `${primaryColor}20`
                            } : {}}
                          >
                            {taskAssignment.current_step > index ? (
                              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <span className="text-base font-semibold">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">{step.title}</h4>
                            <p className="text-base text-gray-600 dark:text-gray-400">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            

            
            {taskAssignment.video_chat_status && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="w-full"
              >
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Video-Chat Status</h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 flex items-center shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center mr-4"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                    }}
                  >
                    <Video size={20} style={{ color: primaryColor }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100">Video Beratung</h4>
                    <div className="flex items-center mt-1">
                      <div className={`h-2.5 w-2.5 rounded-full mr-2 ${getVideoChatStatusColor(taskAssignment.video_chat_status)}`}></div>
                      <p className="text-base text-gray-600 dark:text-gray-400">
                        {taskAssignment.video_chat_status === 'not_started' && 'Noch nicht gestartet'}
                        {taskAssignment.video_chat_status === 'accepted' && 'Akzeptiert - Bereit für Beratung'}
                        {taskAssignment.video_chat_status === 'completed' && 'Abgeschlossen'}
                        {taskAssignment.video_chat_status === 'declined' && 'Abgelehnt'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row justify-start space-y-3 sm:space-y-0 sm:space-x-3 pt-0 border-t border-gray-100 dark:border-gray-800 px-6 py-6">
          {isStartButtonVisible && (
            <AnimatedButton
              onClick={handleStartClick}
              disabled={isStarting}
              className="w-full sm:w-auto text-xl font-bold px-12 py-4 whitespace-nowrap min-w-[280px]"
              style={{
                backgroundColor: primaryColor,
                color: 'white'
              }}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="font-bold">{isStarting ? 'Wird gestartet...' : 'Aufgabe starten'}</span>
                <ChevronDown className="rotate-270" size={20} />
              </div>
            </AnimatedButton>
          )}
          
          {isContinueButtonVisible && (
            <AnimatedButton 
              onClick={handleStartClick}
              disabled={isStarting}
              className="w-full sm:w-auto text-xl font-bold px-12 py-4 whitespace-nowrap min-w-[280px]"
              style={{
                backgroundColor: primaryColor,
                color: 'white'
              }}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="font-bold">{isStarting ? 'Wird fortgesetzt...' : 'Aufgabe fortsetzen'}</span>
                <ChevronDown className="rotate-270" size={20} />
              </div>
            </AnimatedButton>
          )}
          
          {isRestartButtonVisible && (
            <AnimatedButton 
              onClick={onRestartTask}
              disabled={isStarting}
              className="w-full sm:w-auto text-base font-medium px-8 py-2 whitespace-nowrap bg-red-600 hover:bg-red-700 text-white min-w-[180px]"
            >
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw size={16} />
                <span className="font-medium">Aufgabe neu starten</span>
              </div>
            </AnimatedButton>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TaskDetail;
