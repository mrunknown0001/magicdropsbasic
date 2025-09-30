import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import Card, { CardContent } from '../ui/Card';
import { AlertCircle } from 'lucide-react';

interface ConditionalRouteProps {
  children: React.ReactNode;
  condition: 'contractMode' | 'taskMode';
  fallbackPath?: string;
  showMessage?: boolean;
}

const ConditionalRoute: React.FC<ConditionalRouteProps> = ({
  children,
  condition,
  fallbackPath = '/mitarbeiter/dashboard',
  showMessage = true
}) => {
  const { profile, isContractBasedUser, isTaskBasedUser } = useAuth();

  // For employees, use their individual payment mode; for admins, always allow access
  const isAllowed = profile?.role === 'admin' 
    ? true // Admins can access both contract and task mode features
    : condition === 'contractMode' 
      ? isContractBasedUser()
      : isTaskBasedUser();

  if (!isAllowed) {
    if (showMessage) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Seite nicht verfügbar
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {condition === 'contractMode' 
                  ? 'Diese Seite ist nur im Vertragsmodus verfügbar.'
                  : 'Diese Seite ist nur im Vergütungsmodus verfügbar.'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
};

export default ConditionalRoute;
