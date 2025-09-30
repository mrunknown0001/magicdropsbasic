import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Profile } from '../types/database';
import toast from 'react-hot-toast';

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

/**
 * Hook for fetching employees with improved data management
 */
export const useEmployeesStats = () => {
  // Employees state with session storage caching
  const [employees, setEmployees] = useState<Employee[]>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('employeesList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 5 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 5 * 60 * 1000)) {
          return parsedData.employees || [];
        }
      }
    } catch (error) {
      console.error('Error retrieving stored employees:', error);
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('employeesList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return parsedData.lastFetchTime || 0;
      }
    } catch (error) {
      console.error('Error retrieving last fetch time:', error);
    }
    return 0;
  });
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  
  /**
   * Fetch employees from the database
   */
  const fetchEmployees = useCallback(async (force = false) => {
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Data fetch already in progress, skipping');
      return;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && lastFetchTime && (now - lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(lastFetchTime).toLocaleTimeString()}`);
      return;
    }
    
    // If we have data in cache that's not too old (< 5 minutes), don't show loading state
    const hasRecentData = lastFetchTime && (now - lastFetchTime < 5 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    // Store any manually updated employees before the refresh
    const manuallyUpdatedEmployees = employees.filter(emp => emp._manuallyUpdated);
    
    try {
      console.log('Fetching employees data...');
      
      // Use secure database function to get profiles with emails
      const { data, error: fetchError } = await supabase.rpc(
        'get_profiles_with_emails'
      );
      
      if (fetchError) throw fetchError;
      
      if (!data) {
        throw new Error('No data returned from profiles query');
      }
      
      // Process the data to add a name field by combining first_name and last_name
      let processedData = data.map((employee: any) => ({
        ...employee,
        name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      }));
      
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
      
      // Update state with fetched data
      setEmployees(processedData as Employee[]);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('employeesList', JSON.stringify({
          employees: processedData,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing employees in session storage:', storageError);
      }
      
      return processedData;
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [employees, lastFetchTime]);
  
  /**
   * Create a new employee
   */
  const createEmployee = async (employeeData: CreateEmployeeData) => {
    try {
      setLoading(true);
      
      // 1. Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
      
      if (authError) throw authError;
      
      // 2. Create profile (should be handled by database trigger)
      // But we'll check if it exists and create it if not
      if (authData.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile exists
        const { data: profileData, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          // If error is not "no rows returned", it's a real error
          throw profileCheckError;
        }
        
        // If profile doesn't exist, create it manually
        if (!profileData) {
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              first_name: employeeData.first_name,
              last_name: employeeData.last_name,
              role: 'employee'
            }]);
          
          if (createProfileError) throw createProfileError;
        }
      }
      
      // Refresh the employee list
      await fetchEmployees(true);
      
      toast.success('Mitarbeiter erfolgreich erstellt');
      return authData.user;
    } catch (err) {
      console.error('Error creating employee:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen des Mitarbeiters');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update employee status (active/inactive)
   */
  const updateEmployeeStatus = async (id: string, status: 'Aktiv' | 'Inaktiv') => {
    try {
      setLoading(true);
      
      // Create precise banned_until values consistently across both hooks
      const banned_until = status === 'Inaktiv'
        ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years in future
        : null;
      
      // Immediately update the local state to reflect the status change
      // Do this BEFORE the API call to ensure UI responsiveness
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
      
      // Update the session storage as well
      try {
        const storedData = sessionStorage.getItem('employeesList');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          
          // Update the stored employees list
          if (parsedData.employees) {
            parsedData.employees = parsedData.employees.map((emp: any) => {
              if (emp.id === id) {
                return { 
                  ...emp, 
                  banned_until,
                  _manuallyUpdated: true,
                  _lastUpdateTime: Date.now()
                };
              }
              return emp;
            });
            
            // Store the updated data back
            sessionStorage.setItem('employeesList', JSON.stringify(parsedData));
          }
        }
      } catch (storageError) {
        console.error('Error updating session storage:', storageError);
      }
      
      // Update the user's status in auth - AFTER the local state is updated
      if (status === 'Inaktiv') {
        const { error: disableError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { ban_duration: '87600h' } // 10 years
        );
        if (disableError) throw disableError;
        
        console.log(`Employee ${id} deactivated in auth system (from useEmployeesStats)`);
      } else {
        const { error: enableError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { ban_duration: '0h' }
        );
        if (enableError) throw enableError;
        
        console.log(`Employee ${id} activated in auth system (from useEmployeesStats)`);
      }
      
      // Also update the profile in the database to ensure consistent banned_until values
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            banned_until,
            updated_at: new Date().toISOString(),
            status_manually_set: true // Add this field to mark manual updates
          })
          .eq('id', id);
          
        if (error) {
          console.error('Error updating profile banned_until:', error);
        } else {
          console.log(`Successfully updated profile banned_until for ${id}`);
        }
      } catch (err) {
        console.error('Failed to update profile banned_until:', err);
      }
      
      // No forced refresh to ensure UI stays consistent with local state
      toast.success(`Mitarbeiter ${status === 'Aktiv' ? 'aktiviert' : 'deaktiviert'}`);
    } catch (err) {
      console.error('Error updating employee status:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Mitarbeiterstatus');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update employee details
   */
  const updateEmployee = async (id: string, data: UpdateEmployeeData) => {
    try {
      setLoading(true);
      
      // Update the user's metadata and role
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { 
          user_metadata: {
            first_name: data.first_name,
            last_name: data.last_name
          },
          role: data.role
        }
      );
      
      if (updateError) throw updateError;
      
      // Update the profile in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role
        })
        .eq('id', id);
      
      if (profileError) throw profileError;
      
      // Refresh the employee list
      await fetchEmployees(true);
      
      toast.success('Mitarbeiter erfolgreich aktualisiert');
    } catch (err) {
      console.error('Error updating employee:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Mitarbeiters');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  
  return {
    employees,
    loading,
    error,
    lastFetchTime,
    createEmployee,
    updateEmployee,
    updateEmployeeStatus,
    fetchEmployees,
    setEmployees
  };
}; 