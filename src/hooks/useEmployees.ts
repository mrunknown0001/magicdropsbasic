import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Profile } from '../types/database';
import toast from 'react-hot-toast';
import { connectionManager } from '../lib/connectionManager';
import { retryOperation } from '../utils/apiUtils';

export interface Employee extends Profile {
  position?: string;
  name?: string; // Combined first_name and last_name
  _manuallyUpdated?: boolean; // Flag to track manual UI updates
  _lastUpdateTime?: number; // Timestamp of last manual update
}

export interface CreateEmployeeData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  position?: string;
}

export interface UpdateEmployeeData {
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'employee';
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Define fetchEmployees first to avoid reference errors
  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    try {
      // Check for cached data
      const cachedData = sessionStorage.getItem('employeesList');
      // Get any manually updated employees from the existing state
      const manuallyUpdatedEmployees = employees.filter(emp => emp._manuallyUpdated);
      
      const now = Date.now();
      
      if (cachedData && !forceRefresh) {
        try {
          const parsedData = JSON.parse(cachedData);
          // Check if cache is fresh (less than 5 minutes old) and we're not forcing a refresh
          if (parsedData.lastFetchTime && (now - parsedData.lastFetchTime < 5 * 60 * 1000)) {
            console.log('Using cached employee data');
            
            if (parsedData.employees && Array.isArray(parsedData.employees)) {
              let cachedEmployees = parsedData.employees;
              
              // Apply manual updates to cached data
              if (manuallyUpdatedEmployees.length > 0) {
                cachedEmployees = cachedEmployees.map(cachedEmp => {
                  const manuallyUpdated = manuallyUpdatedEmployees.find(manual => manual.id === cachedEmp.id);
                  if (manuallyUpdated) {
                    return {
                      ...cachedEmp,
                      banned_until: manuallyUpdated.banned_until,
                      _manuallyUpdated: true,
                      _lastUpdateTime: manuallyUpdated._lastUpdateTime
                    };
                  }
                  return cachedEmp;
                });
              }
              
              setEmployees(cachedEmployees);
              return;
            }
          }
        } catch (e) {
          console.error('Error parsing cached employee data:', e);
        }
      }
      
      // Fetch from database if cache is invalid/expired
      const { data, error } = await supabaseAdmin.rpc('get_profiles_with_emails');
      
      if (error) throw error;
      
      // Process the data and combine first_name + last_name
      let processedData = (data || []).map(profile => ({
        ...profile,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed',
      }));
      
      // Sort by first_name
      processedData.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
      
      // Preserve manually updated employee data
      if (manuallyUpdatedEmployees.length > 0) {
        // Remove the time restriction - preserve all manual updates indefinitely
        const recentManualUpdates = manuallyUpdatedEmployees;
        
        if (recentManualUpdates.length > 0) {
          console.log(`Preserving ${recentManualUpdates.length} manually updated employees`);
          
          // For each employee in the fetched data, check if it was manually updated
          processedData = processedData.map(fetchedEmp => {
            const manuallyUpdated = recentManualUpdates.find(manual => manual.id === fetchedEmp.id);
            if (manuallyUpdated) {
              console.log(`Preserving manual status for ${manuallyUpdated.name}, banned until: ${manuallyUpdated.banned_until || 'not banned'}`);
              return {
                ...fetchedEmp,
                banned_until: manuallyUpdated.banned_until,
                _manuallyUpdated: true,
                _lastUpdateTime: manuallyUpdated._lastUpdateTime
              };
            }
            return fetchedEmp;
          });
        }
      }
      
      // Also check session storage for any manually updated employees that might not be in the current state
      try {
        const storedData = sessionStorage.getItem('employeesList');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.employees && Array.isArray(parsedData.employees)) {
            const storedManualUpdates = parsedData.employees.filter((emp: any) => 
              emp._manuallyUpdated && emp.id && emp.banned_until !== undefined
            );
            
            if (storedManualUpdates.length > 0) {
              console.log(`Found ${storedManualUpdates.length} manually updated employees in session storage`);
              
              // Apply these manual updates to processed data
              processedData = processedData.map(fetchedEmp => {
                const storedManualUpdate = storedManualUpdates.find((stored: any) => stored.id === fetchedEmp.id);
                if (storedManualUpdate) {
                  console.log(`Applying stored manual status for ${fetchedEmp.name}, banned until: ${storedManualUpdate.banned_until || 'not banned'}`);
                  return {
                    ...fetchedEmp,
                    banned_until: storedManualUpdate.banned_until,
                    _manuallyUpdated: true,
                    _lastUpdateTime: storedManualUpdate._lastUpdateTime
                  };
                }
                return fetchedEmp;
              });
            }
          }
        }
      } catch (e) {
        console.error('Error applying stored manual updates:', e);
      }
      
      // Cache the processed data
      try {
        sessionStorage.setItem('employeesList', JSON.stringify({
          employees: processedData,
          lastFetchTime: now
        }));
      } catch (e) {
        console.error('Error caching employee data:', e);
      }
      
      setEmployees(processedData as Employee[]);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
      // Schedule a reconnection attempt
      connectionManager.scheduleReconnect('profiles-channel');
    } finally {
      setLoading(false);
    }
  }, [employees]); // Add employees to dependency array so the callback updates when employees change

  // Reference to store the subscription
  const subscriptionRef = useRef<{ subscription: any; channelId: string } | null>(null);
  
  // Setup subscription with proper error handling
  const setupSubscription = useCallback(() => {
    // Clean up any existing subscription
    if (subscriptionRef.current?.subscription) {
      supabaseAdmin.removeChannel(subscriptionRef.current.subscription);
    }
    
    // Use a stable channel ID to prevent creating multiple channels
    // This prevents the constant cycle of subscriptions
    const channelId = `profiles-channel-stable`;
    
    const subscription = supabaseAdmin
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profiles change received:', payload);
          
          // Check if the changed record is manually updated before refreshing
          const hasManualUpdates = employees.some(emp => 
            emp._manuallyUpdated && 
            emp._lastUpdateTime && 
            payload.new && typeof payload.new === 'object' && 'id' in payload.new && 
            emp.id === payload.new.id
          );
          
          if (hasManualUpdates) {
            console.log('Skipping automatic refresh because manual updates exist for employee:', 
              payload.new && typeof payload.new === 'object' && 'id' in payload.new ? 
              payload.new.id : 'unknown');
              
            // Instead of ignoring the update completely, preserve the manual status
            // while incorporating other changes from the database
            if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
              const employeeId = payload.new.id;
              const manuallyUpdatedEmployee = employees.find(emp => 
                emp._manuallyUpdated && emp.id === employeeId
              );
              
              if (manuallyUpdatedEmployee) {
                // Update the employee with new data but preserve banned_until
                setEmployees(prevEmployees => 
                  prevEmployees.map(emp => {
                    if (emp.id === employeeId) {
                      return { 
                        ...payload.new as any, 
                        banned_until: manuallyUpdatedEmployee.banned_until,
                        _manuallyUpdated: true,
                        _lastUpdateTime: manuallyUpdatedEmployee._lastUpdateTime
                      };
                    }
                    return emp;
                  })
                );
              }
            }
          } else {
            fetchEmployees();
          }
        }
      )
      .subscribe((status) => {
        // Only log status changes in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Profiles subscription status: ${status}`);
        }
        
        // Only schedule reconnect for actual failures, not normal transitions
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          connectionManager.scheduleReconnect(channelId);
        }
      });
    
    subscriptionRef.current = { subscription, channelId };
  }, [fetchEmployees, employees]); // Add dependencies

  useEffect(() => {
    fetchEmployees();
    setupSubscription();
    
    // Listen for reconnect events
    const handleReconnect = () => {
      console.log('Reconnecting profiles subscription');
      fetchEmployees();
      setupSubscription();
    };
    
    window.addEventListener('supabase-reconnect', handleReconnect);
    
    return () => {
      // Clean up subscription
      if (subscriptionRef.current) {
        supabaseAdmin.removeChannel(subscriptionRef.current.subscription);
      }
      window.removeEventListener('supabase-reconnect', handleReconnect);
    };
  }, []); // Empty dependency array - only run once on mount

  const createEmployee = async (employeeData: CreateEmployeeData) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      setLoading(true);
      
      // 1. Create auth user
      const { data: authData, error: authError } = await retryOperation(async () => {
        return await supabaseAdmin.auth.admin.createUser({
          email: employeeData.email,
          password: employeeData.password,
          email_confirm: true,
          user_metadata: {
            first_name: employeeData.first_name,
            last_name: employeeData.last_name,
            position: employeeData.position || '',
            role: 'employee'
          }
        });
      });

      if (authError) throw authError;
      
      // 2. Create profile (should be handled by database trigger)
      // But we'll check if it exists and create it if not
      if (authData.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile exists
        const { data: profileData, error: profileCheckError } = await retryOperation(async () => {
          return await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        });
          
        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          // If error is not "no rows returned", it's a real error
          throw profileCheckError;
        }
        
        // If profile doesn't exist, create it manually
        if (!profileData) {
          const { error: createProfileError } = await retryOperation(async () => {
            return await supabase
              .from('profiles')
              .insert([{
                id: authData.user.id,
                first_name: employeeData.first_name,
                last_name: employeeData.last_name,
                role: 'employee'
              }]);
          });
            
          if (createProfileError) throw createProfileError;
        }
      }
      
      toast.success('Mitarbeiter erfolgreich erstellt');
      await fetchEmployees(true); // Refresh the employee list - force refresh
      return authData.user;
    } catch (err) {
      console.error('Error creating employee:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen des Mitarbeiters');
      throw err;
    } finally {
      setLoading(false);
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const updateEmployeeStatus = async (id: string, status: 'Aktiv' | 'Inaktiv') => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      setLoading(true);
      
      // Update the user's status in auth
      if (status === 'Inaktiv') {
        // Add a very long ban for inactivation
        const { error: disableError } = await retryOperation(async () => {
          return await supabaseAdmin.auth.admin.updateUserById(
            id,
            { ban_duration: '87600h' } // 10 years
          );
        });
        if (disableError) throw disableError;
        
        console.log(`Employee ${id} deactivated in auth system`);
      } else {
        // Clear the ban for activation
        const { error: enableError } = await retryOperation(async () => {
          return await supabaseAdmin.auth.admin.updateUserById(
            id,
            { ban_duration: '0h' }
          );
        });
        if (enableError) throw enableError;
        
        console.log(`Employee ${id} activated in auth system`);
      }
      
      // Create precise banned_until values
      const banned_until = status === 'Inaktiv'
        ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years in future
        : null;
      
      // Update the local employees state to reflect changes immediately
      setEmployees(prevEmployees => 
        prevEmployees.map(emp => {
          if (emp.id === id) {
            console.log(`Updating local employee ${emp.name} status to ${status}, banned_until: ${banned_until}`);
            return { 
              ...emp, 
              banned_until,
              _manuallyUpdated: true,
              _lastUpdateTime: Date.now()
            };
          }
          return emp;
        })
      );
      
      // Store the updated status in sessionStorage for persistence between page refreshes
      try {
        const storedData = sessionStorage.getItem('employeesList');
        let parsedData = storedData ? JSON.parse(storedData) : { employees: [] };
        
        // Update or add the employee with the new status
        if (parsedData.employees) {
          let found = false;
          parsedData.employees = parsedData.employees.map((emp: any) => {
            if (emp.id === id) {
              found = true;
              return { 
                ...emp, 
                banned_until,
                _manuallyUpdated: true,
                _lastUpdateTime: Date.now()
              };
            }
            return emp;
          });
          
          // If employee not found in stored data, add it
          if (!found) {
            const employeeToAdd = employees.find(emp => emp.id === id);
            if (employeeToAdd) {
              parsedData.employees.push({
                ...employeeToAdd,
                banned_until,
                _manuallyUpdated: true,
                _lastUpdateTime: Date.now()
              });
            }
          }
          
          // Store the updated data back
          sessionStorage.setItem('employeesList', JSON.stringify({
            ...parsedData,
            lastFetchTime: Date.now()
          }));
        }
      } catch (storageError) {
        console.error('Error updating session storage:', storageError);
      }
      
      // Also update the profile in the database to ensure consistent banned_until values
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            banned_until,
            updated_at: new Date().toISOString(),
            // Add a custom field to mark this as a manual status update
            status_manually_set: true
          })
          .eq('id', id);
          
        if (error) {
          console.error('Error updating profile banned_until:', error);
        }
      } catch (err) {
        console.error('Failed to update profile banned_until:', err);
      }
      
      toast.success(`Mitarbeiter ${status === 'Aktiv' ? 'aktiviert' : 'deaktiviert'}`);
      
      // Don't force a refresh to avoid overwriting our manual status
      // This was causing the status to revert
      // setTimeout(() => {
      //   fetchEmployees();
      // }, 500);
    } catch (err) {
      console.error('Error updating employee status:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Mitarbeiterstatus');
      throw err;
    } finally {
      setLoading(false);
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const updateEmployee = async (id: string, data: UpdateEmployeeData) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      setLoading(true);
      
      // Update the user's metadata and role
      const { error: updateError } = await retryOperation(async () => {
        return await supabaseAdmin.auth.admin.updateUserById(
          id,
          { 
            user_metadata: {
              first_name: data.first_name,
              last_name: data.last_name
            },
            role: data.role
          }
        );
      });
      
      if (updateError) throw updateError;
      
      // Update the profile in the database
      const { error: profileError } = await retryOperation(async () => {
        return await supabase
          .from('profiles')
          .update({
            first_name: data.first_name,
            last_name: data.last_name,
            role: data.role
          })
          .eq('id', id);
      });
        
      if (profileError) throw profileError;
      
      toast.success('Mitarbeiter erfolgreich aktualisiert');
      await fetchEmployees(true); // Refresh the employee list
    } catch (err) {
      console.error('Error updating employee:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Mitarbeiters');
      throw err;
    } finally {
      setLoading(false);
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

    const deleteEmployee = async (id: string, employeeName?: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      setLoading(true);
      
      console.log(`Starting comprehensive deletion process for employee ${id} (${employeeName || 'Unknown'})`);
      
      // Step 1: Delete all related data in the correct order (from dependent to independent)
      
      // 1a: Delete task comments first
      const { error: commentsError } = await retryOperation(async () => {
        return await supabase
          .from('task_comments')
          .delete()
          .eq('user_id', id);
      });
      if (commentsError) console.warn('Error deleting task comments:', commentsError);
      else console.log('Task comments deleted');
      
      // 1b: Delete task attachments 
      const { error: attachmentsError } = await retryOperation(async () => {
        return await supabase
          .from('task_attachments')
          .delete()
          .eq('user_id', id);
      });
      if (attachmentsError) console.warn('Error deleting task attachments:', attachmentsError);
      else console.log('Task attachments deleted');
      
      // 1c: Delete task assignments
      const { error: assignmentsError } = await retryOperation(async () => {
        return await supabase
          .from('task_assignments')
          .delete()
          .eq('assignee_id', id);
      });
      if (assignmentsError) console.warn('Error deleting task assignments:', assignmentsError);
      else console.log('Task assignments deleted');
      
      // 1d: Delete tasks assigned to this user
      const { error: tasksError } = await retryOperation(async () => {
        return await supabase
          .from('tasks')
          .delete()
          .eq('assignee_id', id);
      });
      if (tasksError) console.warn('Error deleting tasks:', tasksError);
      else console.log('Tasks deleted');
      
      // 1e: Delete contract assignments
      const { error: contractsError } = await retryOperation(async () => {
        return await supabase
          .from('contract_assignments')
          .delete()
          .eq('user_id', id);
      });
      if (contractsError) console.warn('Error deleting contract assignments:', contractsError);
      else console.log('Contract assignments deleted');
      
      // 1f: Clear phone number assignments (set assignee_id to null instead of deleting phone numbers)
      const { error: phoneError } = await retryOperation(async () => {
        return await supabase
          .from('phone_numbers')
          .update({ assignee_id: null })
          .eq('assignee_id', id);
      });
      if (phoneError) console.warn('Error clearing phone assignments:', phoneError);
      else console.log('Phone number assignments cleared');
      
      // 1g: Delete phone messages related to this user
      const { error: messagesError } = await retryOperation(async () => {
        return await supabase
          .from('phone_messages')
          .delete()
          .eq('user_id', id);
      });
      if (messagesError) console.warn('Error deleting phone messages:', messagesError);
      else console.log('Phone messages deleted');
      
      // Step 2: Delete storage files
      
      // 2a: Delete KYC documents from storage
      try {
        const { data: files } = await supabase.storage
          .from('kyc_documents')
          .list(id);
        
        if (files && files.length > 0) {
          const filePaths = files.map(file => `${id}/${file.name}`);
          await supabase.storage
            .from('kyc_documents')
            .remove(filePaths);
          console.log(`Deleted ${files.length} KYC document(s) from storage`);
        }
      } catch (storageError) {
        console.warn('Error deleting KYC documents from storage:', storageError);
      }
      
      // 2b: Delete task attachments from storage
      try {
        const { data: taskFiles } = await supabase.storage
          .from('task_attachments')
          .list('', { search: id });
        
        if (taskFiles && taskFiles.length > 0) {
          const filePaths = taskFiles.map(file => file.name);
          await supabase.storage
            .from('task_attachments')
            .remove(filePaths);
          console.log(`Deleted ${taskFiles.length} task attachment(s) from storage`);
        }
      } catch (storageError) {
        console.warn('Error deleting task attachments from storage:', storageError);
      }
      
      // Step 3: Delete the profile explicitly (in case cascade doesn't work)
      const { error: profileError } = await retryOperation(async () => {
        return await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
      });
      if (profileError) console.warn('Error deleting profile:', profileError);
      else console.log('Profile deleted');
      
      // Step 4: Finally delete the user from auth
      const { error: authError } = await retryOperation(async () => {
        return await supabaseAdmin.auth.admin.deleteUser(id);
      });
      
      if (authError) {
        console.error('Auth deletion failed:', authError);
        throw authError;
      }
      console.log('User deleted from auth system');
      
      // Update local state immediately
      setEmployees(prevEmployees => 
        prevEmployees.filter(emp => emp.id !== id)
      );
      
      // Clear from session storage as well
      try {
        const storedData = sessionStorage.getItem('employeesList');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.employees) {
            parsedData.employees = parsedData.employees.filter((emp: any) => emp.id !== id);
            sessionStorage.setItem('employeesList', JSON.stringify(parsedData));
          }
        }
      } catch (storageError) {
        console.warn('Error updating session storage:', storageError);
      }
      
      toast.success(`Mitarbeiter ${employeeName || ''} wurde vollständig gelöscht`);
      console.log(`✅ Employee deletion completed successfully for ${id}`);
    } catch (err) {
      console.error('❌ Error deleting employee:', err);
      toast.error(
        err instanceof Error 
          ? `Fehler beim Löschen: ${err.message}` 
          : 'Fehler beim Löschen des Mitarbeiters'
      );
      throw err;
    } finally {
      setLoading(false);
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  return {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    updateEmployeeStatus,
    deleteEmployee,
    fetchEmployees,
    refreshEmployees: () => fetchEmployees(true) // Force refresh bypasses cache
  };
};
