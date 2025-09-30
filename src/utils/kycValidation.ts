import { Profile } from '../types/database';

// KYC Status type for better type safety
export type KycStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

// KYC UI State information interface
export interface KycStatusInfo {
  status: KycStatus;
  icon: string;
  title: string;
  message: string;
  actionText: string;
  color: 'amber' | 'blue' | 'green' | 'red' | 'gray';
  isBlocked: boolean;
}

/**
 * Check if user's KYC is approved and they can access tasks
 * @param profile - User profile with KYC status
 * @returns boolean - true if KYC is approved
 */
export const isKycApproved = (profile: Profile | null): boolean => {
  const result = profile?.kyc_status === 'approved';
  console.log('🛡️ KYC Validation: isKycApproved check:', {
    profile_id: profile?.id,
    kyc_status: profile?.kyc_status,
    result
  });
  return result;
};

/**
 * Check if user has submitted KYC documents
 * @param profile - User profile with KYC status
 * @returns boolean - true if KYC has been submitted
 */
export const isKycSubmitted = (profile: Profile | null): boolean => {
  const result = profile?.kyc_status && profile.kyc_status !== 'pending';
  console.log('🛡️ KYC Validation: isKycSubmitted check:', {
    profile_id: profile?.id,
    kyc_status: profile?.kyc_status,
    result
  });
  return !!result;
};

/**
 * Get comprehensive KYC status information for UI components
 * @param kycStatus - Current KYC status
 * @returns KycStatusInfo - Complete status information for UI rendering
 */
export const getKycStatusInfo = (kycStatus?: string): KycStatusInfo => {
  let statusInfo: KycStatusInfo;
  
  switch (kycStatus) {
    case 'pending':
      statusInfo = {
        status: 'pending',
        icon: 'AlertTriangle',
        title: 'Verifizierung erforderlich',
        message: 'Bitte vervollständigen Sie Ihre KYC-Verifizierung, um auf Aufgaben zugreifen zu können.',
        actionText: 'Jetzt verifizieren',
        color: 'amber',
        isBlocked: true
      };
      break;
    case 'in_review':
      statusInfo = {
        status: 'in_review',
        icon: 'Clock',
        title: 'Verifizierung wird geprüft',
        message: 'Ihre Dokumente werden überprüft. Sie können auf Aufgaben zugreifen, sobald die Verifizierung abgeschlossen ist.',
        actionText: 'Status ansehen',
        color: 'blue',
        isBlocked: true
      };
      break;
    case 'rejected':
      statusInfo = {
        status: 'rejected',
        icon: 'XCircle',
        title: 'Verifizierung abgelehnt',
        message: 'Ihre KYC-Verifizierung wurde abgelehnt. Bitte laden Sie neue Dokumente hoch.',
        actionText: 'Dokumente hochladen',
        color: 'red',
        isBlocked: true
      };
      break;
    case 'approved':
      statusInfo = {
        status: 'approved',
        icon: 'CheckCircle',
        title: 'Verifizierung abgeschlossen',
        message: 'Ihre Identität wurde erfolgreich verifiziert.',
        actionText: 'Status ansehen',
        color: 'green',
        isBlocked: false
      };
      break;
    default:
      statusInfo = {
        status: 'pending',
        icon: 'Shield',
        title: 'Verifizierung ausstehend',
        message: 'KYC-Verifizierung erforderlich für den Zugriff auf Aufgaben.',
        actionText: 'Verifizierung starten',
        color: 'gray',
        isBlocked: true
      };
  }
  
  console.log('🛡️ KYC Validation: getKycStatusInfo result:', {
    input_status: kycStatus,
    output_status: statusInfo.status,
    is_blocked: statusInfo.isBlocked,
    title: statusInfo.title
  });
  
  return statusInfo;
};

/**
 * Check if KYC is required for tasks based on admin settings
 * @param settings - App settings from database
 * @returns boolean - true if KYC is required for task access
 */
export const isKycRequiredForTasks = (settings?: any): boolean => {
  // If setting is not defined, default to requiring KYC for security
  const result = settings?.kyc_required_for_tasks !== false;
  console.log('🛡️ KYC Validation: isKycRequiredForTasks check:', {
    settings_value: settings?.kyc_required_for_tasks,
    result
  });
  return result;
};

/**
 * Get KYC requirement status combining user profile and app settings
 * @param profile - User profile
 * @param settings - App settings (optional)
 * @returns object - Combined status information
 */
export const getKycRequirementStatus = (profile: Profile | null, settings?: any) => {
  // Administrators are always exempt from KYC requirements
  if (profile?.role === 'admin') {
    const statusInfo = getKycStatusInfo('approved'); // Treat admin as approved
    return {
      isRequired: false,
      isApproved: true,
      isBlocked: false,
      statusInfo,
      canAccessTasks: true
    };
  }

  const isRequired = isKycRequiredForTasks(settings);
  const isApproved = isKycApproved(profile);
  const statusInfo = getKycStatusInfo(profile?.kyc_status);
  
  const result = {
    isRequired,
    isApproved,
    isBlocked: isRequired && !isApproved,
    statusInfo,
    canAccessTasks: !isRequired || isApproved
  };
  
  console.log('🛡️ KYC Validation: getKycRequirementStatus result:', {
    profile_id: profile?.id,
    kyc_status: profile?.kyc_status,
    is_required: result.isRequired,
    is_approved: result.isApproved,
    is_blocked: result.isBlocked,
    can_access_tasks: result.canAccessTasks
  });
  
  return result;
}; 