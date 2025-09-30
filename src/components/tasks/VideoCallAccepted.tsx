import React, { useState, useEffect, useRef } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { TaskAssignment } from '../../types/database';
import { CheckCircle, RefreshCw, Clock, Download, ExternalLink, Mail, Key, Link, AlertCircle, MessageSquare, PhoneOutgoing, Smartphone, AlertTriangle, Phone, Copy } from 'lucide-react';
import { useSettingsContext } from '../../context/SettingsContext';
import ShimmerEffect from '../ui/ShimmerEffect';
import toast from 'react-hot-toast';
import { usePhoneMessages } from '../../hooks/usePhoneMessages';
import type { PhoneMessage } from '../../types/database';
import { usePhoneNumber } from '../../hooks/usePhoneNumber';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import AnimatedButton from '../ui/AnimatedButton';

interface VideoCallAcceptedProps {
  taskAssignment: TaskAssignment;
  onRefresh: () => Promise<void>;
  onCompleteVideoChat?: () => Promise<void>;
  isLoading?: boolean;
  isAdminView?: boolean; // Add flag to determine if we're in admin view
}

const VideoCallAccepted: React.FC<VideoCallAcceptedProps> = ({ 
  taskAssignment, 
  onRefresh,
  onCompleteVideoChat,
  isLoading = false,
  isAdminView = false // Default to false (employee view)
}) => {
  const { colors } = useSettingsContext();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [videoIdentCompleted, setVideoIdentCompleted] = useState<boolean>(false);
  
  // Use the phone messages hook to get messages for this task's phone number
  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    fetchMessages,
    fetchSMSImmediately 
  } = usePhoneMessages(taskAssignment.phone_number_id);

  // Use the phone number hook to get phone number details
  const { 
    phoneNumber, 
    loading: phoneNumberLoading, 
    error: phoneNumberError 
  } = usePhoneNumber(taskAssignment.phone_number_id);

  // Refresh messages when component mounts or phone number changes
  // Track if we've already attempted to fetch messages
  const [initialFetchAttempted, setInitialFetchAttempted] = useState<boolean>(false);
  const scrapingAttemptedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (taskAssignment.phone_number_id && !initialFetchAttempted) {
      const loadMessages = async () => {
        try {
          // First, always load existing messages from database
          await fetchMessages(taskAssignment.phone_number_id);
        } catch (error) {
          console.error('Initial message load failed:', error);
        }
      };
      
      loadMessages();
      setInitialFetchAttempted(true);
    }
  }, [taskAssignment.phone_number_id, initialFetchAttempted]);
  
  // Separate effect to handle scraping if no messages are found
  useEffect(() => {
    if (taskAssignment.phone_number_id && 
        initialFetchAttempted && 
        !scrapingAttemptedRef.current &&
        messages.length === 0 && 
        (phoneNumber?.provider === 'receive_sms_online' || 
         phoneNumber?.provider === 'smspva' || 
         phoneNumber?.provider === 'anosim' ||
         phoneNumber?.provider === 'gogetsms')) {
      
      const attemptScraping = async () => {
        try {
          scrapingAttemptedRef.current = true;
          console.log(`[VideoCallAccepted] Auto-fetching SMS for provider: ${phoneNumber?.provider}`);
          
          // For Anosim, use the sync endpoint instead of fetchSMSImmediately
          if (phoneNumber.provider === 'anosim') {
            const bookingId = phoneNumber.order_booking_id || phoneNumber.external_url || phoneNumber.rent_id;
            if (bookingId) {
              console.log(`[VideoCallAccepted] Auto-syncing Anosim booking ID: ${bookingId}`);
              
              const response = await fetch(`/api/phone/sync/anosim/${bookingId}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                console.log('[VideoCallAccepted] Auto-sync successful');
              }
            }
          } else {
            // For other providers, use the existing immediate fetch
            await fetchSMSImmediately(taskAssignment.phone_number_id);
          }
          
          // After syncing/scraping, reload from database since backend saves messages
          await fetchMessages(taskAssignment.phone_number_id, true);
        } catch (error) {
          console.error('Auto-sync attempt failed:', error);
        }
      };
      
      attemptScraping();
    }
  }, [taskAssignment.phone_number_id, initialFetchAttempted, messages.length, phoneNumber?.provider]);

  // Handle SMS refresh with immediate fetch
  const handleSMSRefresh = async () => {
    if (!taskAssignment.phone_number_id || messagesLoading) return;
    
    try {
      // For all supported providers, use immediate fetch
      if (phoneNumber?.provider === 'receive_sms_online' || 
          phoneNumber?.provider === 'smspva' || 
          phoneNumber?.provider === 'anosim' ||
          phoneNumber?.provider === 'gogetsms') {
        console.log(`[VideoCallAccepted] Fetching SMS for provider: ${phoneNumber.provider}`);
        
        // For Anosim, use the sync endpoint
        if (phoneNumber.provider === 'anosim') {
          const bookingId = phoneNumber.order_booking_id || phoneNumber.external_url || phoneNumber.rent_id;
          if (bookingId) {
            console.log(`[VideoCallAccepted] Syncing Anosim booking ID: ${bookingId}`);
            
            const response = await fetch(`/api/phone/sync/anosim/${bookingId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('[VideoCallAccepted] Anosim sync response:', data);
            } else {
              console.error('[VideoCallAccepted] Anosim sync failed:', response.status);
            }
          }
        } else {
          // For other providers, use the existing immediate fetch
          await fetchSMSImmediately(taskAssignment.phone_number_id);
        }
      }
      
      // Always refresh the messages display from database (backend may have inserted new ones)
      await fetchMessages(taskAssignment.phone_number_id, true);
      toast.success('SMS-Nachrichten aktualisiert');
    } catch (error) {
      console.error('SMS refresh failed:', error);
      toast.error('Fehler beim Aktualisieren der SMS-Nachrichten');
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshed(new Date());
      toast.success('Daten erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format timestamp for display
  const formatTime = (date: Date) => {
    try {
      return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unbekannt';
    }
  };
  
  // Check if test data has been assigned by admin (demo credentials and ident data)
  const hasTestDataAssigned = !!(
    taskAssignment.demo_email || 
    taskAssignment.demo_password || 
    taskAssignment.ident_code || 
    taskAssignment.ident_url
  );

  // Check if we have any supporting data to display (phone number, app URLs)
  const hasSupportingData = !!(
    taskAssignment.phone_number_id ||
    taskAssignment.task_template?.play_store_url ||
    taskAssignment.task_template?.app_store_url
  );

  // Check if we're waiting for admin to assign test data
  const isWaitingForTestData = !hasTestDataAssigned;

  // Check if user can proceed (both test data assigned AND video-ident completed)
  const canProceedWithTask = hasTestDataAssigned && videoIdentCompleted;

  // Helper functions to get app URLs from template
  const getPlayStoreUrl = () => taskAssignment.task_template?.play_store_url;
  const getAppStoreUrl = () => taskAssignment.task_template?.app_store_url;
                     
  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: de 
      });
    } catch (error) {
      return 'Unbekannt';
    }
  };
  
  // Handle copy to clipboard
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} in die Zwischenablage kopiert!`);
  };

  return (
    <>
      <Card className="w-full h-full shadow-sm border-0 overflow-hidden">
        <div className={`h-1 w-full bg-[${colors.primary}] dark:bg-[${colors.primaryLight}]`}></div>
        <CardHeader className="text-center border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full shadow-sm">
              <CheckCircle className="text-green-600 dark:text-green-400" size={40} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Vielen Dank für dein Einverständnis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-none mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Demo-Daten werden vorbereitet</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Bearbeitungszeit: Bis zu 3 Stunden (meist schneller)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Die Seite aktualisiert sich automatisch, wenn die Daten bereitstehen.</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <Clock size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                <span>Zuletzt aktualisiert: {formatTime(lastRefreshed)}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Aktualisieren
              </Button>
            </div>
            
            {/* Two-column layout for SMS and Test Data */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 p-0 sm:p-5">
              {/* SMS Messages Section - 30% column */}
              <div className="w-full lg:w-[30%] order-2 lg:order-1">
                <Card className="h-full shadow-sm border-0 overflow-hidden">
                  <div className={`h-1 w-full bg-[${colors.accent}] dark:bg-[${colors.accentLight}]`}></div>
                  <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg bg-[${colors.accent}]/10 dark:bg-gray-700 text-[${colors.accent}] dark:text-white mr-2`}>
                        <MessageSquare size={16} />
                      </div>
                      <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white text-sm">SMS Nachrichten</CardTitle>
                    </div>
                    {taskAssignment.phone_number_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSMSRefresh}
                        disabled={messagesLoading}
                        leftIcon={<RefreshCw size={12} className={messagesLoading ? 'animate-spin' : ''} />}
                      >
                        Aktualisieren
                      </Button>
                    )}
                  </CardHeader>
                  
                  <CardContent className="p-2 sm:p-4">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      <ShimmerEffect className="h-20 w-full rounded-md" />
                      <ShimmerEffect className="h-20 w-full rounded-md" />
                    </div>
                  ) : messagesError ? (
                    <div className="text-center p-4 text-red-500 dark:text-red-400">
                      <AlertCircle size={20} className="mx-auto mb-2" />
                      <p className="text-sm">Fehler beim Laden der Nachrichten.</p>
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-3">
                      {/* Show only the latest message for workers */}
                      {(() => {
                        // Get the latest message (messages are already sorted by received_at desc)
                        const latestMessage = messages[0];
                        return (
                        <div 
                            key={0}
                            className="p-3 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 ml-4"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-xs text-gray-500 dark:text-gray-400">
                                Neueste SMS
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatMessageTime(latestMessage.received_at)}
                            </span>
                          </div>
                          <p className="m-0 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                              {latestMessage.message}
                          </p>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="mt-1 h-7 w-7 p-0 rounded-full"
                              onClick={() => handleCopy(latestMessage.message, 'SMS-Nachricht')}
                            title="SMS-Nachricht kopieren"
                          >
                            <Copy size={14} />
                          </Button>
                        </div>
                        );
                      })()}
                      
                      {/* Show message count if there are multiple messages */}
                      {messages.length > 1 && (
                        <div className="text-center p-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-700">
                          <MessageSquare size={12} className="inline mr-1" />
                          {messages.length - 1} weitere Nachricht{messages.length > 2 ? 'en' : ''} vorhanden
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                      <AlertTriangle size={20} className="mx-auto mb-2" />
                      <p className="text-sm">Keine SMS-Nachrichten vorhanden.</p>
                    </div>
                  )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Test Data Section - 70% column */}
              <div className="w-full lg:w-[70%] order-1 lg:order-2 px-0">
                <Card className="h-full shadow-sm border-0 overflow-hidden">
                  <div className={`h-1 w-full bg-[${colors.primary}] dark:bg-[${colors.primaryLight}]`}></div>
                  <CardHeader className="flex flex-row items-center px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className={`p-2 rounded-lg bg-[${colors.primary}]/10 dark:bg-gray-700 text-[${colors.primary}] dark:text-white mr-3`}>
                      <Smartphone size={18} />
                    </div>
                    <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white">Test-Daten</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-5">
                    {isWaitingForTestData ? (
                      /* Loading State for Test Data */
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="relative mb-6">
                          {/* Animated loading spinner */}
                          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Smartphone className="text-blue-500" size={24} />
                          </div>
                        </div>
                        
                        <div className="text-center max-w-md">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Deine Test-Daten werden vorbereitet
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            Wir beantragen gerade deine Demo-Daten für den Video-Chat. Das kann bis zu 3 Stunden dauern, 
                            meistens geht es aber deutlich schneller.
                          </p>
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                            <div className="flex items-start">
                              <AlertCircle className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                              <div className="text-left">
                                <p className="text-blue-800 dark:text-blue-300 text-sm font-medium mb-1">
                                  Was passiert als nächstes?
                                </p>
                                <p className="text-blue-700 dark:text-blue-300 text-sm">
                                  Sobald deine Daten bereitstehen, erscheinen sie automatisch hier. 
                                  Du kannst diese Seite geöffnet lassen oder später zurückkehren.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Animated dots to show activity */}
                          <div className="flex justify-center items-center space-x-1 mb-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Seite wird automatisch aktualisiert...
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Normal Test Data Display */
                      <div className="grid grid-cols-1 gap-2 sm:gap-4">
                      {/* Assigned Phone Number - First in Test-Daten */}
                      {taskAssignment.phone_number_id && phoneNumber && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3">
                                <Phone size={16} className="text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Telefonnummer</h4>
                                <p className="text-lg font-mono text-gray-800 dark:text-gray-200 mt-1">{phoneNumber.phone_number}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => handleCopy(phoneNumber.phone_number, 'Telefonnummer')}
                              title="Telefonnummer kopieren"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Demo Email */}
                      {taskAssignment.demo_email && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3">
                                <Mail size={16} className="text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Demo E-Mail</h4>
                                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mt-1 break-all">{taskAssignment.demo_email}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => handleCopy(taskAssignment.demo_email, 'E-Mail')}
                              title="E-Mail kopieren"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Demo Password */}
                      {taskAssignment.demo_password && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3">
                                <Key size={16} className="text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Demo Passwort</h4>
                                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mt-1 break-all">{taskAssignment.demo_password}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => handleCopy(taskAssignment.demo_password, 'Passwort')}
                              title="Passwort kopieren"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Ident Code */}
                      {taskAssignment.ident_code && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3">
                                <Key size={16} className="text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Ident-Code</h4>
                                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mt-1 break-all">{taskAssignment.ident_code}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => handleCopy(taskAssignment.ident_code, 'Ident-Code')}
                              title="Ident-Code kopieren"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* URL Buttons Section */}
                      <div className="mt-6 space-y-4">
                        {/* Ident URL Button - Large and prominent */}
                        {taskAssignment.ident_url && (
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3">
                                  <Link size={16} className="text-gray-600 dark:text-gray-400" />
                                </div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Ident-Prozess</h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0"
                                onClick={() => handleCopy(taskAssignment.ident_url, 'Ident-URL')}
                                title="Ident-URL kopieren"
                              >
                                <Copy size={14} />
                              </Button>
                            </div>
                            <Button
                              size="md"
                              variant="primary"
                              className="w-full"
                              leftIcon={<ExternalLink size={16} />}
                              onClick={() => window.open(taskAssignment.ident_url, '_blank')}
                            >
                              Ident-Prozess öffnen
                            </Button>
                          </div>
                        )}
                      
                        {/* App Store and Play Store Buttons - Side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Play Store URL Button */}
                          {getPlayStoreUrl() && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 mr-2">
                                    <Smartphone size={14} className="text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100">Android App</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Google Play Store</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0"
                                  onClick={() => handleCopy(getPlayStoreUrl(), 'Play Store URL')}
                                  title="Play Store URL kopieren"
                                >
                                  <Copy size={12} />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full"
                                leftIcon={<ExternalLink size={14} />}
                                onClick={() => window.open(getPlayStoreUrl(), '_blank')}
                              >
                                Play Store öffnen
                              </Button>
                            </div>
                          )}
                          
                          {/* App Store URL Button */}
                          {getAppStoreUrl() && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 mr-2">
                                    <Smartphone size={14} className="text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100">iOS App</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Apple App Store</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0"
                                  onClick={() => handleCopy(getAppStoreUrl(), 'App Store URL')}
                                  title="App Store URL kopieren"
                                >
                                  <Copy size={12} />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full"
                                leftIcon={<ExternalLink size={14} />}
                                onClick={() => window.open(getAppStoreUrl(), '_blank')}
                              >
                                App Store öffnen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Test Data Status and Continue Section */}
            {!isAdminView && onCompleteVideoChat && (
              <div className="mt-8 space-y-4">
                {/* Show waiting message if no test data assigned */}
                {isWaitingForTestData && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="text-yellow-600 dark:text-yellow-400 mr-2" size={20} />
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                        Bitte warten, bis die Testdaten von einem Administrator zugewiesen wurden.
                      </p>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
                      Erst dann können Sie mit der Aufgabe fortfahren.
                    </p>
                  </div>
                )}

                {/* Show video-ident completion checkbox when test data is assigned */}
                {hasTestDataAssigned && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={videoIdentCompleted}
                        onChange={(e) => setVideoIdentCompleted(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-blue-800 dark:text-blue-200 font-medium">
                          Ich habe den Video-Ident Test erfolgreich abgeschlossen
                        </span>
                        <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                          Bestätigen Sie, dass Sie alle Testdaten erhalten und den Video-Ident-Prozess erfolgreich durchgeführt haben.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Continue Button - Only enabled when both conditions are met */}
                <div className="flex justify-center sm:justify-end">
                  <AnimatedButton
                    onClick={onCompleteVideoChat}
                    disabled={isLoading || !canProceedWithTask}
                    className={`px-10 py-3 text-lg font-semibold whitespace-nowrap min-w-[280px] w-full sm:w-auto ${
                      canProceedWithTask 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-400 cursor-not-allowed text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <CheckCircle size={18} />
                      <span>
                        {isWaitingForTestData 
                          ? "Warten auf Testdaten..." 
                          : !videoIdentCompleted 
                          ? "Video-Ident Test abschließen"
                          : "Video-Chat abschließen"
                        }
                      </span>
                    </div>
                  </AnimatedButton>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default VideoCallAccepted;
