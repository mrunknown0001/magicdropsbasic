import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiArrowRight } from 'react-icons/fi';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AnimatedButton from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigation } from '../context/NavigationContext';
import { motion } from 'framer-motion';

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, user, isAdmin, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateAndTrack } = useNavigation();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  
  // Check for redirects
  useEffect(() => {
    // If user is already logged in and auth is fully ready, redirect to dashboard
    if (user && authReady) {
      const redirectPath = getRedirectPath();
      console.log('User is already logged in, redirecting to:', redirectPath);
      
      // Use a short timeout to ensure all states are updated
      setTimeout(() => {
        navigateAndTrack(redirectPath);
      }, 300);
    }
    
    // Check if there's a session_expired parameter
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('session_expired') === 'true') {
      toast.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
    }
  }, [user, authReady, navigate, location, navigateAndTrack]);
  
  // Get redirect path from location state
  const getRedirectPath = (): string => {
    const state = location.state as { from?: Location };
    
    // Use stored admin path if available
    if (isAdmin()) {
      const lastAdminPath = sessionStorage.getItem('lastAdminPath');
      if (lastAdminPath) {
        return lastAdminPath;
      }
      return '/admin/dashboard';
    }
    
    // Check for redirect path in location state
    if (state?.from) {
      return state.from.pathname || '/dashboard';
    }
    
    return '/dashboard';
  };
  
  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoggingIn(true);
      
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      await login(data.email, data.password);
      
      // Toast success message
      toast.success('Erfolgreich angemeldet');
      
      // The redirection will be handled by the useEffect when authReady becomes true
      
    } catch (error: any) {
      if (error?.message?.includes('email_not_confirmed')) {
        toast.error('Bitte bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden. Überprüfen Sie Ihren Posteingang und klicken Sie auf den Bestätigungslink.');
      } else if (error?.message?.includes('Invalid login')) {
        toast.error('Ungültige E-Mail oder Passwort');
      } else {
        toast.error('Anmeldung fehlgeschlagen');
      }
      console.error(error);
      
      // Always dispatch fetch-end event
      window.dispatchEvent(new CustomEvent('fetch-end'));
      setIsLoggingIn(false);
    }
  };

  return (
    <div>
      {/* Login heading - only visible on mobile since desktop has it in the left column */}
      <motion.div 
        className="mb-8 md:hidden text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white mb-2">
          Mitarbeiter-Login
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Melden Sie sich an, um auf Ihr Dashboard zuzugreifen
        </p>
      </motion.div>

      {/* Login form */}
      <motion.form 
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="space-y-4">
          <Input
            id="email"
            type="email"
            label="E-Mail-Adresse"
            leftAddon={<FiMail size={18} className="text-gray-400 dark:text-gray-500" />}
            error={errors.email?.message}
            {...register('email', { 
              required: 'E-Mail ist erforderlich',
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: 'Ungültiges E-Mail-Format'
              }
            })}
            placeholder="name@unternehmen.de"
            className="font-app"
          />

          <Input
            id="password"
            type="password"
            label="Passwort"
            leftAddon={<FiLock size={18} className="text-gray-400 dark:text-gray-500" />}
            error={errors.password?.message}
            {...register('password', { 
              required: 'Passwort ist erforderlich',
              minLength: {
                value: 6,
                message: 'Passwort muss mindestens 6 Zeichen lang sein'
              }
            })}
            placeholder="Ihr Passwort"
            className="font-app"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-accent focus:ring-accent border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm font-app text-gray-700 dark:text-gray-300">
              Angemeldet bleiben
            </label>
          </div>

          <div className="text-sm">
            <a href="#" className="font-app font-app-medium text-accent hover:text-accent/80 transition-colors">
              Passwort vergessen?
            </a>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoggingIn}
            leftIcon={<FiUser />}
          >
            Anmelden
          </Button>
        </div>
      </motion.form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400 font-app">
            Noch kein Mitarbeiterzugang?
          </span>
        </div>
      </div>

      {/* Registration button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center"
      >
        <Link to="/register">
          <AnimatedButton
            variant="outline"
            fullWidth
            size="lg"
            icon={<FiArrowRight />}
            iconPosition="right"
            animationLevel="medium"
          >
            Jetzt registrieren
          </AnimatedButton>
        </Link>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-app">
          Durch die Registrierung stimmen Sie unseren Nutzungsbedingungen zu
        </p>
      </motion.div>
    </div>
  );
};

export default Login;