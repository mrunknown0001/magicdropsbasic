import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProfileFormData } from '../../hooks/useProfileStats';
import { FiKey, FiSave, FiX } from 'react-icons/fi';
import Button from '../ui/Button';
import ProfileTabs from './ProfileTabs';
import PersonalInfoTab from './PersonalInfoTab';
import AddressTab from './AddressTab';
import FinancialTab from './FinancialTab';
import PayrollTab from './PayrollTab';
import ProfileView from './ProfileView';
import { CardContent, CardFooter } from '../ui/Card';

interface ProfileFormProps {
  formMethods: UseFormReturn<ProfileFormData>;
  isEditing: boolean;
  activeTab: 'personal' | 'address' | 'financial' | 'payroll';
  setActiveTab: (tab: 'personal' | 'address' | 'financial' | 'payroll') => void;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
  onPasswordModalOpen: () => void;
  healthInsuranceOptions: { value: string; label: string }[];
  isSubmitting: boolean;
  profileData: any;
  isAdmin: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  formMethods,
  isEditing,
  activeTab,
  setActiveTab,
  onSubmit,
  onCancel,
  onPasswordModalOpen,
  healthInsuranceOptions,
  isSubmitting,
  profileData,
  isAdmin
}) => {
  const { register, handleSubmit, formState: { errors } } = formMethods;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <CardContent className="space-y-6 px-6 pb-6">
        {isEditing ? (
          <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab}>
            {activeTab === 'personal' && (
              <PersonalInfoTab register={register} errors={errors} />
            )}
            
            {activeTab === 'address' && (
              <AddressTab register={register} errors={errors} />
            )}
            
            {activeTab === 'financial' && (
              <FinancialTab register={register} errors={errors} />
            )}
            
            {activeTab === 'payroll' && (
              <PayrollTab 
                register={register} 
                errors={errors}
                healthInsuranceOptions={healthInsuranceOptions}
              />
            )}
          </ProfileTabs>
        ) : (
          <ProfileView 
            profileData={profileData} 
            isAdmin={isAdmin} 
            healthInsuranceOptions={healthInsuranceOptions} 
          />
        )}
      </CardContent>
      
      {isEditing && (
        <CardFooter className="flex justify-end space-x-2 px-6">
          <Button
            type="button"
            variant="outline"
            leftIcon={<FiX size={16} />}
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          
          <Button
            type="submit"
            leftIcon={<FiSave size={16} />}
            isLoading={isSubmitting}
          >
            Speichern
          </Button>
        </CardFooter>
      )}
    </form>
  );
};

export default ProfileForm;
