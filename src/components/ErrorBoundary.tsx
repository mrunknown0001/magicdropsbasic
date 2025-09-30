import React, { Component, ErrorInfo } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isConnectionError: boolean;
  isAuthError: boolean;
}

/**
 * Enhanced global error boundary component
 * Captures and handles React errors, with special handling for:
 * - Network/connection errors
 * - Authentication errors
 * - Supabase errors
 * 
 * Provides fallback UI and recovery options
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isConnectionError: false,
      isAuthError: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a connection error
    const isConnectionError = 
      error.message.includes('network') ||
      error.message.includes('connection') ||
      error.message.includes('offline') ||
      error.message.includes('failed to fetch') ||
      error.message.toLowerCase().includes('timeout');
      
    // Check if this is an auth error
    const isAuthError = 
      error.message.includes('auth') ||
      error.message.includes('JWT') ||
      error.message.includes('token') ||
      error.message.includes('session') ||
      error.message.includes('permission') ||
      error.message.includes('login');
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      isConnectionError,
      isAuthError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // If it looks like a connection error, try to reconnect
    if (
      error.message.includes('network') ||
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      error.message.includes('fetch') ||
      error.message.includes('supabase')
    ) {
      console.log('Connection-related error detected, attempting to reconnect');
      this.triggerRefetch();
      
      // Set state to indicate connection error
      this.setState({
        isConnectionError: true
      });
    }
    
    // If it looks like an auth error, try to refresh session
    if (
      error.message.includes('auth') ||
      error.message.includes('JWT') ||
      error.message.includes('token') ||
      error.message.includes('session')
    ) {
      console.log('Auth-related error detected, attempting to refresh session');
      this.refreshAuthSession();
      
      // Set state to indicate auth error
      this.setState({
        isAuthError: true
      });
    }
  }
  
  // Trigger data refetch in all components
  triggerRefetch = (): void => {
    console.log('Triggering global data refetch from error boundary');
    // Dispatch a custom event for components to listen for
    window.dispatchEvent(new CustomEvent('error-boundary-refetch'));
  };
  
  // Try to refresh the auth session
  refreshAuthSession = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Failed to refresh session in error boundary:', error);
        return;
      }
      
      if (data.session) {
        console.log('Successfully refreshed session in error boundary');
        window.dispatchEvent(new CustomEvent('session-refresh-required'));
      }
    } catch (e) {
      console.error('Exception refreshing session in error boundary:', e);
    }
  };
  
  // Reset the error state and try to recover
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isConnectionError: false,
      isAuthError: false
    });
    
    // Try to refresh data and session
    this.triggerRefetch();
    
    if (this.state.isAuthError) {
      this.refreshAuthSession();
    }
    
    toast.success('Attempting recovery...');
  };
  
  // Force page reload
  handleReload = (): void => {
    window.location.reload();
  };
  
  // Try to sign in again
  handleSignInAgain = (): void => {
    // First sign out
    supabase.auth.signOut().catch(e => {
      console.error('Error signing out:', e);
    });
    
    // Then redirect to login
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI based on error type
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-md w-full">
            <div className="text-red-500 text-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-2">
              {this.state.isConnectionError 
                ? 'Verbindungsproblem erkannt' 
                : this.state.isAuthError 
                  ? 'Anmeldesitzung abgelaufen' 
                  : 'Ein Fehler ist aufgetreten'}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {this.state.isConnectionError 
                ? 'Es scheint ein Problem mit Ihrer Netzwerkverbindung zu geben. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.' 
                : this.state.isAuthError 
                  ? 'Ihre Anmeldesitzung ist abgelaufen oder wurde unterbrochen. Bitte melden Sie sich erneut an.' 
                  : this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>
            
            <div className="space-y-3">
          <button
            onClick={this.handleRetry}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Erneut versuchen
              </button>
              
              <button 
                onClick={this.handleReload}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Seite neu laden
              </button>
              
              {this.state.isAuthError && (
                <button 
                  onClick={this.handleSignInAgain}
                  className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Erneut anmelden
          </button>
              )}
            </div>
            
            {/* Display technical details only in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-md text-xs overflow-auto max-h-40">
                <p className="font-mono text-red-600 dark:text-red-400">{this.state.error?.toString()}</p>
                <p className="font-mono text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
              </p>
            </div>
          )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
