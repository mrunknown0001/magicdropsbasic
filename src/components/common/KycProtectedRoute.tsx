import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { getKycRequirementStatus } from '../../utils/kycValidation';
import LoadingSpinner from '../ui/LoadingSpinner';
import KycVerificationPrompt from './KycVerificationPrompt';

interface KycProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string; // Where to redirect if KYC not approved
  showPrompt?: boolean; // Show verification prompt instead of redirecting
  promptSize?: 'small' | 'medium' | 'large';
  fallback?: React.ReactNode; // Custom fallback component
  requireApproval?: boolean; // Whether to require KYC approval (default: true)
}

const KycProtectedRoute: React.FC<KycProtectedRouteProps> = ({
  children,
  redirectTo = '/kyc',
  showPrompt = false,
  promptSize = 'large',
  fallback,
  requireApproval = true
}) => {
  const { user, profile, loading } = useAuth();
  const { settings } = useSettingsContext();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Skip KYC check if not required
  if (!requireApproval) {
    return <>{children}</>;
  }

  // Skip KYC check for administrators - they don't need KYC verification
  if (profile?.role === 'admin') {
    return <>{children}</>;
  }

  // Check KYC status
  const kycStatus = getKycRequirementStatus(profile, settings);

  // If KYC is not required by settings, allow access
  if (!kycStatus.isRequired) {
    return <>{children}</>;
  }

  // If KYC is approved, allow access
  if (kycStatus.isApproved) {
    return <>{children}</>;
  }

  // Handle blocked access
  if (kycStatus.isBlocked) {
    // Show custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show verification prompt instead of redirecting
    if (showPrompt) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <KycVerificationPrompt 
              profile={profile} 
              size={promptSize}
            />
          </div>
        </div>
      );
    }

    // Redirect to KYC page with return path
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Default: allow access (fallback case)
  return <>{children}</>;
};

export default KycProtectedRoute; 