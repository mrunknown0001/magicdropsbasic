import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { toast } from 'react-hot-toast';
// import { Contract } from '../types/database'; // Removed - no longer used
import { useSettingsContext } from '../context/SettingsContext';
import PersonalInfoStep from '../components/register/PersonalInfoStep';
import AddressStep from '../components/register/AddressStep';
// import ContractStep from '../components/register/ContractStep'; // Removed - no longer used
import ProgressSteps from '../components/register/ProgressSteps';
import {
  personalInfoSchema,
  addressSchema,
  // contractSchema, // Removed - no longer used
  PersonalInfoInputs,
  AddressInputs,
  // ContractInputs, // Removed - no longer used
} from '../components/register/validationSchemas';

// Updated function to assign all starter jobs to new users
const assignStarterJobToNewUser = async (userId: string) => {
  try {
    console.log('Assigning starter jobs to new user:', userId);
    
    // Find all task templates marked as starter jobs - use supabaseAdmin for permissions
    const { data: starterTemplates, error: templateError } = await supabaseAdmin
      .from('task_templates')
      .select('*')
      .eq('is_starter_job', true);
      
    if (templateError) {
      console.log('Error fetching starter job templates:', templateError);
      return;
    }
    
    if (!starterTemplates || starterTemplates.length === 0) {
      console.log('No starter job templates found');
      return;
    }
    
    console.log(`Found ${starterTemplates.length} starter job templates`);
    
    // Create task assignments for each starter job template
    for (const template of starterTemplates) {
      // Determine if document step is required based on template type
      const templateType = template.type;
      const isSimpleType = templateType === 'platzhalter' || templateType === 'andere' || templateType === 'other';
      
      // Only set document_step_required for non-simple types (bankdrop, exchanger)
      const documentStepRequired = !isSimpleType && 
        template && 
        template.required_attachments && 
        Array.isArray(template.required_attachments) && 
        template.required_attachments.length > 0;
      
      console.log(`Creating starter job "${template.title}" with document step required: ${documentStepRequired}, Template type: ${templateType}`);
      
      // Set due date to 7 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      
      // Create a task assignment for the new user
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('task_assignments')
        .insert({
          task_template_id: template.id,
          assignee_id: userId,
          due_date: dueDate.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          current_step: 0, // Start from 0, not 1
          video_chat_status: 'not_started',
          // Add these fields to match createTaskFromTemplate
          document_step_required: documentStepRequired,
          document_step_completed: false,
          created_by: userId // The user is creating their own task effectively
        })
        .select()
        .single();
        
      if (assignmentError) {
        console.error(`Error creating starter job assignment for template ${template.title}:`, assignmentError);
        // Continue with other templates even if one fails
        continue;
      }
      
      console.log(`Successfully assigned starter job "${template.title}":`, assignment);
    }
  } catch (error) {
    console.error('Error in assignStarterJobToNewUser:', error);
  }
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: authRegister, completeProfile } = useAuth();
  const { settings } = useSettingsContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Contract state removed - no longer needed in registration
  // const [contracts, setContracts] = useState<Contract[]>([]);
  // const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Always 2 steps now - no more contract step during registration
  const totalSteps = 2;

  const personalInfoForm = useForm<PersonalInfoInputs>({
    resolver: zodResolver(personalInfoSchema),
  });

  const addressForm = useForm<AddressInputs>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      nationality: 'DE',
    },
  });

  // Contract form removed - no longer needed
  // const contractForm = useForm<ContractInputs>({
  //   resolver: zodResolver(contractSchema),
  //   defaultValues: {
  //     contractId: '',
  //     acceptTerms: false
  //   },
  // });

  // Contract fetching removed - no longer needed in registration

  // Contract selection removed - no longer needed

  const onSubmit = async () => {
    try {
      if (currentStep === 1) {
        const isValid = await personalInfoForm.trigger();
        if (!isValid) return;
        setCurrentStep(prev => prev + 1);
        return;
      }

      if (currentStep === 2) {
        const isValid = await addressForm.trigger();
        if (!isValid) return;
        
        // Step 2 is always the final step now - no contract step during registration
        // Proceed to final submission
      }

      // Handle final step - always step 2 (address step)
      if (currentStep === totalSteps) {
        // No additional validation needed - address already validated above

        setIsSubmitting(true);
        try {
          const personalInfo = personalInfoForm.getValues();
          const address = addressForm.getValues();
          
          // Contract validation removed - no contracts during registration

          console.log('Submitting registration with data:', {
            personalInfo,
            address
          });

          // Validate the form data before proceeding
          console.log('Validating form data...');
          console.log('Personal info form values:', personalInfo);
          console.log('Address form values:', address);
          
          if (!personalInfo.firstName || !personalInfo.lastName) {
            throw new Error('Vor- und Nachname sind erforderlich');
          }
          
          if (!personalInfo.email || !personalInfo.password) {
            throw new Error('E-Mail und Passwort sind erforderlich');
          }
          
          if (!address.street || !address.postalCode || !address.city) {
            throw new Error('Vollständige Adresse ist erforderlich');
          }

          // Step 1: Basic registration with email and password
          console.log('Starting registration process...');
          const user = await authRegister(personalInfo.email, personalInfo.password);
          console.log('User registered successfully:', user.id);
          
          // Step 2: Complete profile with additional information
          console.log('Completing user profile...');
          const profileData = {
            first_name: personalInfo.firstName,
            last_name: personalInfo.lastName,
            date_of_birth: personalInfo.dateOfBirth,
            street: address.street,
            postal_code: address.postalCode,
            city: address.city,
            nationality: address.nationality,
            role: 'employee' as const,
            email: personalInfo.email
            // payment_mode intentionally omitted - admin will assign later
          };
          
          console.log('Profile data to be sent:', profileData);
          
          try {
          const profile = await completeProfile(user.id, profileData);
          console.log('Profile completed successfully:', profile);
          } catch (profileError) {
            console.error('Error completing profile:', profileError);
            // Create a direct profile update as a fallback
            try {
              const { error: directUpdateError } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('id', user.id);
                
              if (directUpdateError) {
                console.error('Direct profile update also failed:', directUpdateError);
              } else {
                console.log('Profile updated directly as fallback');
              }
            } catch (fallbackError) {
              console.error('Fallback profile update failed:', fallbackError);
            }
            // Continue with the process even if profile completion fails
          }

          // Contract assignment removed - now handled post-registration by admin
          
          // Worker balance creation now handled by admin when assigning payment mode
          
          // Assign starter job to the new user
          // Note: Tasks are assigned immediately during registration but will be hidden in the UI
          // until the user completes KYC verification. This ensures users have tasks waiting
          // for them as soon as they're approved, providing a seamless experience.
          await assignStarterJobToNewUser(user.id);
          
          toast.success('Registrierung erfolgreich');
          navigate('/dashboard');
        } catch (error) {
          console.error('Registration error:', error);
          const authError = error as { code?: string, message?: string, __isAuthError?: boolean, name?: string, details?: string, hint?: string };
          
          if (authError.code === 'user_already_exists' || authError.code === 'email_exists') {
            toast.error('Diese E-Mail-Adresse ist bereits registriert');
            // Reset the form to step 1 and clear email field
            setCurrentStep(1);
            personalInfoForm.setValue('email', '');
            personalInfoForm.setError('email', {
              type: 'manual',
              message: 'Diese E-Mail-Adresse ist bereits registriert'
            });
          } else if (authError.message?.includes('Database error') || authError.code === '42703') {
            toast.error('Datenbankfehler bei der Registrierung. Bitte versuchen Sie es später erneut.');
          } else if (authError.message?.includes('Email signups are disabled')) {
            toast.error('E-Mail-Registrierung ist vorübergehend deaktiviert. Bitte kontaktieren Sie den Administrator.');
          } else if (authError.message?.includes('First name and last name are required')) {
            toast.error('Vor- und Nachname sind erforderlich');
            setCurrentStep(1); // Go back to personal info step
          } else {
            // Show detailed error message for debugging
            const detailedMessage = authError.details || authError.hint || authError.message || 'Unbekannter Fehler';
            toast.error(`Fehler bei der Registrierung: ${detailedMessage}`);
          }
          
          // Log detailed error information for debugging
          console.log('Detailed registration error:', {
            error: authError,
            message: authError.message,
            code: authError.code,
            details: authError.details,
            hint: authError.hint,
            stack: (error as Error).stack
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl space-y-8 bg-white dark:bg-gray-800 p-6 sm:p-10 rounded-lg shadow-lg">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Registrierung</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Erstellen Sie Ihr {settings?.website_name} Konto</p>
        </div>
        <ProgressSteps currentStep={currentStep} showContractStep={false} />

        <div className="mt-8">
          {currentStep === 1 && (
            <PersonalInfoStep form={personalInfoForm} />
          )}

          {currentStep === 2 && (
            <AddressStep form={addressForm} />
          )}

          {/* Contract step removed - contracts now assigned post-registration by admin */}

          <div className="mt-8 flex justify-between">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                disabled={isSubmitting}
              >
                Zurück
              </button>
            )}

            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="ml-auto px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === totalSteps ? 'Registrieren' : 'Weiter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;