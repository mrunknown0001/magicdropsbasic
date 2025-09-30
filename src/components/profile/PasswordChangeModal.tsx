import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiKey, FiAlertCircle, FiX } from 'react-icons/fi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useSettingsContext } from '../../context/SettingsContext';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChange: (oldPassword: string, newPassword: string) => Promise<void>;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  onPasswordChange
}) => {
  const { colors } = useSettingsContext();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePasswordChange = async () => {
    // Reset error state
    setPasswordError('');
    
    // Validate passwords
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Bitte alle Felder ausfüllen');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Das neue Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    
    // Update password
    setIsChangingPassword(true);
    
    try {
      await onPasswordChange(oldPassword, newPassword);
      handleClose();
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Fehler beim Ändern des Passworts. Bitte überprüfen Sie Ihr aktuelles Passwort.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-80" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <div className="mb-4">
                  <Dialog.Title className="text-lg font-app font-app-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <FiKey className="text-accent" size={18} />
                    Passwort ändern
                  </Dialog.Title>
                </div>
                
                <div className="space-y-4 py-4">
                  {passwordError && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-start gap-2">
                      <FiAlertCircle className="mt-0.5 flex-shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="current-password" className="block text-sm font-app text-gray-700 dark:text-gray-300">
                      Aktuelles Passwort
                    </label>
                    <Input
                      id="current-password"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Ihr aktuelles Passwort"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="block text-sm font-app text-gray-700 dark:text-gray-300">
                      Neues Passwort
                    </label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mindestens 8 Zeichen"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="block text-sm font-app text-gray-700 dark:text-gray-300">
                      Neues Passwort bestätigen
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Passwort wiederholen"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<FiX size={16} />}
                    onClick={handleClose}
                    className="mt-2 sm:mt-0"
                  >
                    Abbrechen
                  </Button>
                  
                  <Button
                    type="button"
                    variant="primary"
                    leftIcon={isChangingPassword ? <LoadingSpinner size="sm" /> : <FiKey size={16} />}
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? 'Wird geändert...' : 'Passwort ändern'}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PasswordChangeModal;
