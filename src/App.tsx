import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// Styles
import './styles/quill-dark.css';

// Error Handling & Loading Components
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Landing & Legal Pages (always loaded)
import LandingPage from './pages/landing/LandingPage';
import AGB from './pages/legal/AGB';
import Datenschutz from './pages/legal/Datenschutz';
import Impressum from './pages/legal/Impressum';
import Cookies from './pages/legal/Cookies';

// Auth Pages (always loaded)
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load all dashboard pages to prevent imports on landing page
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const Employees = React.lazy(() => import('./pages/admin/Employees'));
const EmployeeDetails = React.lazy(() => import('./pages/admin/EmployeeDetails'));
const Tasks = React.lazy(() => import('./pages/admin/Tasks'));
const TaskDetails = React.lazy(() => import('./pages/admin/TaskDetails'));
const TaskTemplates = React.lazy(() => import('./pages/admin/TaskTemplates'));
const CreateTaskTemplate = React.lazy(() => import('./pages/admin/CreateTaskTemplate'));
const TaskTemplateDetails = React.lazy(() => import('./pages/admin/TaskTemplateDetails'));
const EditTaskTemplate = React.lazy(() => import('./pages/admin/EditTaskTemplate'));
const Contracts = React.lazy(() => import('./pages/admin/Contracts'));
const CreateContractTemplate = React.lazy(() => import('./pages/admin/CreateContractTemplate'));
const EditContractTemplate = React.lazy(() => import('./pages/admin/EditContractTemplate'));
const PhoneNumbers = React.lazy(() => import('./pages/admin/PhoneNumbers'));
const TaskSubmissions = React.lazy(() => import('./pages/admin/TaskSubmissions'));
const TaskSubmissionDetails = React.lazy(() => import('./pages/admin/TaskSubmissionDetails'));
const TaskSubmissionReview = React.lazy(() => import('./pages/admin/TaskSubmissionReview'));
const Settings = React.lazy(() => import('./pages/admin/Settings'));
const PaymentManagement = React.lazy(() => import('./pages/admin/PaymentManagement'));
const AdminSupport = React.lazy(() => import('./pages/admin/AdminSupport'));
const Bankdrops = React.lazy(() => import('./pages/admin/Bankdrops'));
const BankdropDetails = React.lazy(() => import('./pages/admin/BankdropDetails'));
const JobApplications = React.lazy(() => import('./pages/admin/JobApplications'));
const KYCReview = React.lazy(() => import('./pages/admin/KYCReview'));
const GlobalSearchResults = React.lazy(() => import('./pages/admin/GlobalSearchResults'));
const KnowledgeBase = React.lazy(() => import('./pages/admin/KnowledgeBase'));
const AIKnowledgeManagement = React.lazy(() => import('./pages/admin/AIKnowledgeManagement'));

// Public Job Application Pages
const JobApplication = React.lazy(() => import('./pages/JobApplication'));
const JobApplicationSuccess = React.lazy(() => import('./pages/JobApplicationSuccess'));

const EmployeeDashboard = React.lazy(() => import('./pages/employee/EmployeeDashboard'));
const MyTasks = React.lazy(() => import('./pages/employee/MyTasks'));
const MyContracts = React.lazy(() => import('./pages/employee/MyContracts'));
const Auszahlung = React.lazy(() => import('./pages/employee/Auszahlung'));

// Import conditional route component
import ConditionalRoute from './components/routing/ConditionalRoute';

const TaskDetailPage = React.lazy(() => import('./pages/employee/TaskDetailPage'));
const TaskFlow = React.lazy(() => import('./components/tasks/TaskFlow'));

const Profile = React.lazy(() => import('./pages/Profile'));
const KYC = React.lazy(() => import('./pages/KYC'));
const Support = React.lazy(() => import('./pages/Support'));

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import NavigationProvider from './context/NavigationContext';
import { SettingsProvider } from './context/SettingsContext';
import DynamicThemeProvider from './components/theme/DynamicThemeProvider';
import { SearchProvider } from './context/SearchContext';
import GlobalLoadingIndicator from './components/GlobalLoadingIndicator';
import ScrollToTop from './components/ScrollToTop';
import ScrollToTopButton from './components/common/ScrollToTop';

// KYC Protection
import KycProtectedRoute from './components/common/KycProtectedRoute';

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show spinner while loading auth state
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only redirect if not loading and no user
  if (!user) {
    console.log('No authenticated user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we have a user, render children
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading, user, authReady, profile } = useAuth();
  const location = useLocation();
  
  // Use cached admin status to avoid showing loading state on tab switches
  const cachedAdmin = sessionStorage.getItem('isAdminUser') === 'true';
  
  // If we have a cached admin status and user is present, use that
  if (cachedAdmin && user) {
    if (location.pathname.startsWith('/admin/')) {
      sessionStorage.setItem('lastAdminPath', location.pathname);
    }
    return <>{children}</>;
  }

  // Wait for auth to be fully ready
  if (!authReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Verifying admin access...
        </p>
      </div>
    );
  }

  // First check if user is authenticated at all
  if (!user) {
    console.log('No authenticated user found in AdminRoute, redirecting to login');
    sessionStorage.removeItem('isAdminUser');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Then check if user is an admin
  if (!isAdmin()) {
    console.log('User is not an admin, redirecting to employee dashboard');
    console.log('User profile role:', profile?.role);
    
    // Store the attempted admin path for future reference
    sessionStorage.removeItem('lastAdminPath');
    sessionStorage.removeItem('isAdminUser');
    
    return <Navigate to="/mitarbeiter/dashboard" state={{ from: location }} replace />;
  }

  // User is authenticated and is an admin - cache this information
  sessionStorage.setItem('isAdminUser', 'true');
  
  // Store the current admin path
  if (location.pathname.startsWith('/admin/')) {
    sessionStorage.setItem('lastAdminPath', location.pathname);
  }
  
  return <>{children}</>;
};

// Role-based Dashboard Router
const RoleBasedDashboard = () => {
  const { isAdmin, loading, user, authReady, profile } = useAuth();
  const location = useLocation();
  
  // Use cached role information to avoid loading states on tab switches
  const cachedIsAdmin = sessionStorage.getItem('isAdminUser') === 'true';
  const cachedDashboardRole = sessionStorage.getItem('userDashboardRole');
  
  // If we have a cached role and user is present, use that
  if (user && cachedDashboardRole) {
    console.log('Using cached dashboard role:', cachedDashboardRole);
    const lastAdminPath = sessionStorage.getItem('lastAdminPath');
    
    if (cachedDashboardRole === 'admin') {
      // If we have a previous admin path, navigate back to it
      if (lastAdminPath && lastAdminPath.startsWith('/admin/')) {
        return <Navigate to={lastAdminPath} replace />;
      }
      // Otherwise go to admin dashboard
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      // Direct to employee dashboard for non-admins
      return <Navigate to="/mitarbeiter/dashboard" replace />;
    }
  }
  
  // Don't redirect until authentication is fully ready with both user and profile data
  if (!authReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Preparing your dashboard...
        </p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    console.log('No authenticated user in RoleBasedDashboard, redirecting to login');
    sessionStorage.removeItem('userDashboardRole');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check for stored admin path in session storage
  const lastAdminPath = sessionStorage.getItem('lastAdminPath');
  
  // Now we can safely determine the role since profile is loaded
  const userIsAdmin = isAdmin();
  console.log('Auth ready, user is admin:', userIsAdmin, 'with profile:', profile?.role);
  
  // Cache the role for future use
  sessionStorage.setItem('userDashboardRole', userIsAdmin ? 'admin' : 'employee');
  
  if (userIsAdmin) {
    // If we have a previous admin path, navigate back to it
    if (lastAdminPath && lastAdminPath.startsWith('/admin/')) {
      return <Navigate to={lastAdminPath} replace />;
    }
    // Otherwise go to admin dashboard
    return <Navigate to="/admin/dashboard" replace />;
  } else {
    // Clear any stored admin paths for non-admin users
    sessionStorage.removeItem('lastAdminPath');
    return <Navigate to="/mitarbeiter/dashboard" replace />;
  }
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <ScrollToTop />
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes - Completely isolated, no API calls */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/legal/agb" element={<AGB />} />
            <Route path="/legal/datenschutz" element={<Datenschutz />} />
            <Route path="/legal/impressum" element={<Impressum />} />
            <Route path="/legal/cookies" element={<Cookies />} />
            
            {/* Public Job Application Routes */}
            <Route path="/bewerbung" element={
              <SettingsProvider>
                <DynamicThemeProvider>
                  <Suspense fallback={<PageLoader />}>
                    <JobApplication />
                  </Suspense>
                </DynamicThemeProvider>
              </SettingsProvider>
            } />
            <Route path="/application-success" element={
              <SettingsProvider>
                <DynamicThemeProvider>
                  <Suspense fallback={<PageLoader />}>
                    <JobApplicationSuccess />
                  </Suspense>
                </DynamicThemeProvider>
              </SettingsProvider>
            } />
            
            {/* All other routes require full provider stack */}
            <Route path="/*" element={
              <SettingsProvider>
                <DynamicThemeProvider>
                  <AuthProvider>
                    <NavigationProvider>
                      <SearchProvider>
                        <GlobalLoadingIndicator />
                      <Routes>
                        {/* Auth Routes */}
                        <Route element={<AuthLayout />}>
                          <Route path="login" element={<Login />} />
                        </Route>
                        <Route path="register" element={<Register />} />
                        
                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                          {/* Dashboard Router - redirects based on role */}
                          <Route path="dashboard" element={<RoleBasedDashboard />} />
                          <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                          <Route path="kyc" element={<Suspense fallback={<PageLoader />}><KYC /></Suspense>} />
                          <Route path="support" element={<Suspense fallback={<PageLoader />}><Support /></Suspense>} />
                          
                          {/* Direct route redirects */}
                          <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
                          <Route path="mitarbeiter" element={<Navigate to="/mitarbeiter/dashboard" replace />} />
                          
                          {/* Admin Routes */}
                          <Route path="admin/dashboard" element={<AdminRoute><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></AdminRoute>} />
                          <Route path="admin/employees" element={<AdminRoute><Suspense fallback={<PageLoader />}><Employees /></Suspense></AdminRoute>} />
                          <Route path="admin/employees/:id" element={<AdminRoute><Suspense fallback={<PageLoader />}><EmployeeDetails /></Suspense></AdminRoute>} />
                          <Route path="admin/tasks" element={<AdminRoute><Suspense fallback={<PageLoader />}><Tasks /></Suspense></AdminRoute>} />
                          <Route path="admin/tasks/:id" element={<AdminRoute><Suspense fallback={<PageLoader />}><TaskDetails /></Suspense></AdminRoute>} />
                          <Route path="admin/task-templates" element={<AdminRoute><Suspense fallback={<PageLoader />}><TaskTemplates /></Suspense></AdminRoute>} />
                          <Route path="admin/task-templates/create" element={<AdminRoute><Suspense fallback={<PageLoader />}><CreateTaskTemplate /></Suspense></AdminRoute>} />
                          <Route path="admin/task-templates/:id" element={<AdminRoute><Suspense fallback={<PageLoader />}><TaskTemplateDetails /></Suspense></AdminRoute>} />
                          <Route path="admin/task-templates/:id/edit" element={<AdminRoute><Suspense fallback={<PageLoader />}><EditTaskTemplate /></Suspense></AdminRoute>} />
                          <Route path="admin/bankdrops" element={<AdminRoute><Suspense fallback={<PageLoader />}><Bankdrops /></Suspense></AdminRoute>} />
                          <Route path="admin/bankdrops/:id" element={<AdminRoute><Suspense fallback={<PageLoader />}><BankdropDetails /></Suspense></AdminRoute>} />
                          <Route path="admin/contracts" element={<AdminRoute><Suspense fallback={<PageLoader />}><Contracts /></Suspense></AdminRoute>} />
                          <Route path="admin/contracts/create" element={<AdminRoute><Suspense fallback={<PageLoader />}><CreateContractTemplate /></Suspense></AdminRoute>} />
                          <Route path="admin/contracts/:id/edit" element={<AdminRoute><Suspense fallback={<PageLoader />}><EditContractTemplate /></Suspense></AdminRoute>} />
                          <Route path="admin/phone-numbers" element={<AdminRoute><Suspense fallback={<PageLoader />}><PhoneNumbers key="admin-phone-numbers" /></Suspense></AdminRoute>} />
                          <Route path="admin/task-submissions" element={<AdminRoute><Suspense fallback={<PageLoader />}><TaskSubmissionReview /></Suspense></AdminRoute>} />
                          <Route path="admin/submissions" element={<AdminRoute><Suspense fallback={<PageLoader />}><TaskSubmissions key="admin-submissions" /></Suspense></AdminRoute>} />
                          <Route path="admin/submissions/:submissionId" element={<AdminRoute><Suspense fallback={<PageLoader />}><TaskSubmissionDetails /></Suspense></AdminRoute>} />
                          <Route path="admin/kyc-review" element={<AdminRoute><Suspense fallback={<PageLoader />}><KYCReview /></Suspense></AdminRoute>} />
                          <Route path="admin/settings" element={<AdminRoute><Suspense fallback={<PageLoader />}><Settings /></Suspense></AdminRoute>} />
                          <Route path="admin/payment-management" element={<AdminRoute><Suspense fallback={<PageLoader />}><PaymentManagement /></Suspense></AdminRoute>} />
                          <Route path="admin/support" element={<AdminRoute><Suspense fallback={<PageLoader />}><AdminSupport /></Suspense></AdminRoute>} />
                          <Route path="admin/job-applications" element={<AdminRoute><Suspense fallback={<PageLoader />}><JobApplications /></Suspense></AdminRoute>} />
                          <Route path="admin/knowledge-base" element={<AdminRoute><Suspense fallback={<PageLoader />}><KnowledgeBase /></Suspense></AdminRoute>} />
                          <Route path="admin/ai-knowledge" element={<AdminRoute><Suspense fallback={<PageLoader />}><AIKnowledgeManagement /></Suspense></AdminRoute>} />
                          <Route path="admin/search" element={<AdminRoute><Suspense fallback={<PageLoader />}><GlobalSearchResults /></Suspense></AdminRoute>} />
                          
                          {/* Employee Routes - Updated to /mitarbeiter/* */}
                          <Route path="mitarbeiter/dashboard" element={<Suspense fallback={<PageLoader />}><EmployeeDashboard /></Suspense>} />
                          <Route path="mitarbeiter/tasks" element={<Suspense fallback={<PageLoader />}><MyTasks /></Suspense>} />
                          <Route path="mitarbeiter/task-assignments/:assignmentId" element={
                            <KycProtectedRoute showPrompt={true}>
                              <Suspense fallback={<PageLoader />}><TaskDetailPage /></Suspense>
                            </KycProtectedRoute>
                          } />
                          <Route path="mitarbeiter/task-assignments/:assignmentId/flow" element={
                            <KycProtectedRoute showPrompt={true}>
                              <Suspense fallback={<PageLoader />}><TaskFlow /></Suspense>
                            </KycProtectedRoute>
                          } />
                          <Route path="mitarbeiter/contracts" element={
                            <ConditionalRoute condition="contractMode" showMessage={false}>
                              <Suspense fallback={<PageLoader />}><MyContracts /></Suspense>
                            </ConditionalRoute>
                          } />
                          <Route path="mitarbeiter/auszahlung" element={
                            <ConditionalRoute condition="taskMode" showMessage={false}>
                              <Suspense fallback={<PageLoader />}><Auszahlung /></Suspense>
                            </ConditionalRoute>
                          } />

                          
                          {/* Legacy Employee Routes - Redirect to new structure */}
                          <Route path="employee/dashboard" element={<Navigate to="/mitarbeiter/dashboard" replace />} />
                          <Route path="my-tasks" element={<Navigate to="/mitarbeiter/tasks" replace />} />
                          <Route path="task-assignments/:assignmentId" element={
                            <KycProtectedRoute showPrompt={true}>
                              <Suspense fallback={<PageLoader />}><TaskDetailPage /></Suspense>
                            </KycProtectedRoute>
                          } />
                          <Route path="task-assignments/:assignmentId/flow" element={
                            <KycProtectedRoute showPrompt={true}>
                              <Suspense fallback={<PageLoader />}><TaskFlow /></Suspense>
                            </KycProtectedRoute>
                          } />
                          <Route path="my-contracts" element={<Navigate to="/mitarbeiter/contracts" replace />} />
                          
                        </Route>
                        
                        {/* Fallback for protected routes */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                      </SearchProvider>
                    </NavigationProvider>
                  </AuthProvider>
                </DynamicThemeProvider>
              </SettingsProvider>
            } />
          </Routes>
          <ScrollToTopButton />
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;