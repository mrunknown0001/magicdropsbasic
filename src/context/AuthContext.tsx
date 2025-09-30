import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Profile } from '../types/database';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authReady: boolean;
  isAdmin: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  completeProfile: (userId: string, profileData: Partial<Profile>) => Promise<Profile>;
  refreshProfile: () => Promise<void>;
  // Per-user payment mode helpers
  getUserPaymentMode: () => 'vertragsbasis' | 'verguetung' | null;
  isContractBasedUser: () => boolean;
  isTaskBasedUser: () => boolean;
  hasPaymentModeAssigned: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Fetch user profile data
  const fetchProfile = async (user: User) => {
    try {
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If profile exists, set it
      if (data) {
        console.log('Profile found:', data);
        setProfile(data as Profile);
        setAuthReady(true);
      } else {
        // If no profile exists yet (new user), create one
        console.log('No profile found, creating new profile');
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'employee',
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          // If insert fails due to duplicate email, try to fetch the profile again
          if (insertError.code === '23505') {
            console.log('Duplicate profile error, fetching existing profile');
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (fetchError) throw fetchError;
            setProfile(existingProfile as Profile);
            setAuthReady(true);
            return;
          }
          throw insertError;
        }

        setProfile(newProfile as Profile);
        setAuthReady(true);
      }
    } catch (error) {
      console.error('Error fetching/creating user profile:', error);
      // Create a minimal profile with defaults if all else fails
      setProfile({
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'employee',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Profile);
      
      setAuthReady(true);
      
      toast.error('Error loading user profile');
    }
  };

  useEffect(() => {
    console.log('Setting up auth listeners');
    setAuthReady(false);
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        setAuthReady(true);
        return;
      }
      
      if (session?.user) {
        console.log('Session found, setting user:', session.user.id);
        setUser(session.user);
        fetchProfile(session.user);
      } else {
        console.log('No session found');
        setUser(null);
        setProfile(null);
        setAuthReady(true);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setProfile(null);
        setAuthReady(true);
        return;
      }
      
      if (session?.user) {
        console.log('User authenticated:', session.user.id);
        setUser(session.user);
        if (!profile || profile.id !== session.user.id) {
          fetchProfile(session.user);
        } else {
          setAuthReady(true);
        }
      } else if (event !== 'INITIAL_SESSION') {
        console.log('User signed out');
        setUser(null);
        setProfile(null);
        setAuthReady(true);
      }
    });

    // Clean up on unmount
    return () => {
      console.log('Cleaning up auth listeners');
      subscription.unsubscribe();
    };
  }, []);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time profile subscription for user:', user.id);
    
    const profileSubscription = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time profile update received:', payload);
          
          if (payload.new) {
            const updatedProfile = payload.new as Profile;
            console.log('🔄 Updating profile state with real-time data:', {
              old_kyc_status: profile?.kyc_status,
              new_kyc_status: updatedProfile.kyc_status
            });
            
            setProfile(updatedProfile);
            
            // Show toast notification for KYC status changes
            if (profile && profile.kyc_status !== updatedProfile.kyc_status) {
              if (updatedProfile.kyc_status === 'approved') {
                toast.success('🎉 Ihre KYC-Verifizierung wurde genehmigt!');
              } else if (updatedProfile.kyc_status === 'rejected') {
                toast.error('Ihre KYC-Verifizierung wurde abgelehnt. Bitte überprüfen Sie Ihre Dokumente.');
              } else if (updatedProfile.kyc_status === 'in_review') {
                toast('Ihre KYC-Dokumente werden überprüft.', { icon: 'ℹ️' });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Profile subscription status:', status);
      });

    return () => {
      console.log('Cleaning up profile subscription');
      supabase.removeChannel(profileSubscription);
    };
  }, [user, profile]);

  const login = async (email: string, password: string) => {
    try {
      setAuthReady(false);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Auth state change listener will update the context
    } catch (error) {
      console.error('Login error:', error);
      setAuthReady(true);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setAuthReady(false);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'employee',
          }
        }
      });
      
      if (error) throw error;
      if (!data.user) throw new Error('User registration failed');
      
      // Auth state change listener will update the context
      return data.user;
    } catch (error) {
      console.error('Registration error:', error);
      setAuthReady(true);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthReady(false);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any cached data
      localStorage.removeItem('dashboardStats');
      sessionStorage.removeItem('cachedData');
      sessionStorage.removeItem('isAdminUser');
      sessionStorage.removeItem('userDashboardRole');
      
      // Auth state change listener will clear the context
    } catch (error) {
      console.error('Logout error:', error);
      setAuthReady(true);
      throw error;
    }
  };
  
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Force refreshing profile from database for user:', user.id);
      
      // Force fetch fresh data from database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        console.log('🔄 Profile refreshed with fresh data:', {
          kyc_status: data.kyc_status,
          updated_at: data.updated_at
        });
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast.error('Failed to refresh profile');
      throw error;
    }
  };

  const isAdmin = useCallback(() => {
    // Most authoritative check
    if (profile?.role === 'admin') {
      return true;
    }
    
    // Fallback to user metadata
    if (user?.user_metadata?.role === 'admin') {
      return true;
    }
    
    return false;
  }, [profile, user]);

  // Per-user payment mode helpers
  const getUserPaymentMode = useCallback(() => {
    return profile?.payment_mode || null; // Return null if not assigned
  }, [profile?.payment_mode]);

  const isContractBasedUser = useCallback(() => {
    return getUserPaymentMode() === 'vertragsbasis';
  }, [getUserPaymentMode]);

  const isTaskBasedUser = useCallback(() => {
    return getUserPaymentMode() === 'verguetung';
  }, [getUserPaymentMode]);

  const hasPaymentModeAssigned = useCallback(() => {
    return profile?.payment_mode !== null && profile?.payment_mode !== undefined;
  }, [profile?.payment_mode]);

  const completeProfile = async (userId: string, profileData: Partial<Profile>) => {
    try {
      console.log('CompleteProfile called with:', { userId, profileData });
      
      // Validate required fields
      if (!profileData.first_name || !profileData.last_name) {
        throw new Error('First name and last name are required');
      }
      
      // Always try to update the profile first (since Supabase creates a basic profile automatically)
      console.log('Attempting to update existing profile for user:', userId);
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        // If update fails because no profile exists, try to create one
        if (updateError.code === 'PGRST116') {
          console.log('No existing profile found, creating new profile for user:', userId);
          const insertData = {
            id: userId,
            ...profileData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          console.log('Inserting profile data:', insertData);
          
          const { data: insertData2, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert(insertData)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
          
          console.log('Profile created successfully:', insertData2);
          setProfile(insertData2 as Profile);
          setAuthReady(true);
          toast.success('Profil erfolgreich erstellt');
          return insertData2 as Profile;
        } else {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }
      } else {
        console.log('Profile updated successfully:', updateData);
        setProfile(updateData as Profile);
        setAuthReady(true);
        toast.success('Profil erfolgreich aktualisiert');
        return updateData as Profile;
      }
    } catch (error: any) {
      console.error('Error completing profile:', error);
      const errorMessage = error?.message || error?.details || error?.hint || 'Unbekannter Fehler';
      toast.error(`Fehler beim Erstellen des Profils: ${errorMessage}`);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    authReady,
    isAdmin,
    login,
    register,
    logout,
    updateProfile,
    completeProfile,
    refreshProfile,
    getUserPaymentMode,
    isContractBasedUser,
    isTaskBasedUser,
    hasPaymentModeAssigned
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
