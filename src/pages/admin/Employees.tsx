import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AnimatedButton from '../../components/ui/AnimatedButton';
import { toast } from 'react-hot-toast';
// Import all the icons individually
import { 
  CheckCircle, XCircle, RefreshCw, Edit, ExternalLink,
  Search, Filter, UserPlus, Users, AlertCircle, Euro, CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateEmployeeData, Employee, UpdateEmployeeData, useEmployees } from '../../hooks/useEmployees';
import { useEmployeesStats } from '../../hooks/useEmployeesStats';
import AddEmployeeModal from '../../components/admin/AddEmployeeModal';
import EditEmployeeModal from '../../components/admin/EditEmployeeModal';
import { useSettingsContext } from '../../context/SettingsContext';
import { usePaymentManagement } from '../../hooks/usePaymentManagement';
import PaymentModeAssignment from '../../components/admin/PaymentModeAssignment';
import BulkPaymentModeAssignment from '../../components/admin/BulkPaymentModeAssignment';

// No tabs needed anymore - only show active employees

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const { colors, shouldShowPaymentManagement } = useSettingsContext();
  const [searchTerm, setSearchTerm] = useState('');
  // Removed tab state since we only show active employees now
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  // Payment mode assignment state
  const [isPaymentModeModalOpen, setIsPaymentModeModalOpen] = useState(false);
  const [paymentModeEmployee, setPaymentModeEmployee] = useState<Employee | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [isBulkPaymentModeOpen, setIsBulkPaymentModeOpen] = useState(false);
  
  // Use the new stats hook
  const { 
    employees, 
    loading, 
    error, 
    createEmployee, 
    updateEmployee, 
    updateEmployeeStatus, 
    fetchEmployees,
    setEmployees
  } = useEmployeesStats();
  
  // Get the deleteEmployee function from the original useEmployees hook
  const { deleteEmployee } = useEmployees();
  
  // Get worker balances (only in task-based payment mode)
  const {
    workerBalances,
    loading: paymentLoading
  } = usePaymentManagement(shouldShowPaymentManagement());
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchEmployees(true); // Force refresh
  };
  
  // Helper function to get worker balance
  const getWorkerBalance = (employeeId: string) => {
    return workerBalances.find(balance => balance.worker_id === employeeId);
  };

  // Payment mode assignment handlers
  const handleOpenPaymentModeAssignment = (employee: Employee) => {
    setPaymentModeEmployee(employee);
    setIsPaymentModeModalOpen(true);
  };

  const handleToggleEmployeeSelection = (employee: Employee) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.some(emp => emp.id === employee.id);
      if (isSelected) {
        return prev.filter(emp => emp.id !== employee.id);
      } else {
        return [...prev, employee];
      }
    });
  };

  const handleOpenBulkPaymentModeAssignment = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }
    setIsBulkPaymentModeOpen(true);
  };

  const getPaymentModeDisplay = (paymentMode?: string) => {
    switch (paymentMode) {
      case 'verguetung':
        return { text: 'Vergütung', color: 'bg-emerald-100 text-emerald-800' };
      case 'vertragsbasis':
        return { text: 'Vertrag', color: 'bg-blue-100 text-blue-800' };
      default:
        return { text: 'Nicht gesetzt', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Only show active employees (not banned/deleted)
  const activeEmployees = Array.isArray(employees) 
    ? employees.filter(employee => {
        if (!employee) return false;
        return !employee.banned_until || new Date(employee.banned_until) < new Date();
      })
    : [];

  // Filtered employees based on search only (no tabs)
  const filteredEmployees = activeEmployees.filter(employee => {
    if (!employee) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      (employee.name?.toLowerCase() || '').includes(searchLower) ||
      (employee.first_name?.toLowerCase() || '').includes(searchLower) ||
      (employee.last_name?.toLowerCase() || '').includes(searchLower) ||
      (employee.email?.toLowerCase() || '').includes(searchLower)
    );
  });
  
  const handleCreateEmployee = async (data: CreateEmployeeData) => {
    try {
      await createEmployee(data);
      setIsAddModalOpen(false);
    } catch (error) {
      // Error is handled in the hook with toast
    }
  };
  
  const handleEditEmployee = async (id: string, data: UpdateEmployeeData) => {
    try {
      await updateEmployee(id, data);
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      // Error is handled in the hook with toast
    }
  };
  
  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      // Show immediate feedback by updating the UI optimistically
      const newStatus = currentStatus ? 'Inaktiv' : 'Aktiv';
      const banned_until = newStatus === 'Inaktiv' 
        ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years in future
        : null;
        
      // Get current employee for more accurate update
      const targetEmployee = employees.find(emp => emp.id === id);
      if (!targetEmployee) {
        toast.error('Mitarbeiter nicht gefunden');
        return;
      }
      
      console.log(`Updating employee ${targetEmployee.name} status:`, newStatus, "Banned until:", banned_until);
      
      // Create a cloned employees array with the updated status
      const updatedEmployees = employees.map(emp => {
        if (emp.id === id) {
          return { 
            ...emp, 
            banned_until,
            // Add a flag to track manual updates and prevent realtime overwrites
            _manuallyUpdated: true,
            _lastUpdateTime: Date.now()
          };
        }
        return emp;
      });
      
      // Store the updated status in sessionStorage for persistence
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
            sessionStorage.setItem('employeesList', JSON.stringify({
              ...parsedData,
              lastFetchTime: Date.now()
            }));
            console.log('Updated employee status in session storage');
          }
        }
      } catch (storageError) {
        console.error('Error updating session storage:', storageError);
      }
      
      // Update UI optimistically - this must happen before the API call
      setEmployees(updatedEmployees);
      
      // Make the actual API call without waiting for it to complete
      updateEmployeeStatus(id, newStatus)
        .then(() => {
          // After API completes, update UI one more time to ensure consistency
          // But preserve our manual update flag
          setTimeout(() => {
            setEmployees(current => 
              current.map(emp => {
                if (emp.id === id) {
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
          }, 100);
          
          // Auto-switch to appropriate tab after status change
          if (newStatus === 'Aktiv') {
            setActiveTab('active');
          } else {
            setActiveTab('inactive');
          }
        })
        .catch(error => {
          // On error, refresh to get correct state
          console.error('Error updating status:', error);
          fetchEmployees(true);
        });
    } catch (error) {
      console.error('Error in handleStatusChange:', error);
      toast.error('Fehler beim Ändern des Status');
      // If there was an error, refresh to restore correct state
      fetchEmployees(true);
    }
  };
  
  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    
    try {
      await deleteEmployee(employeeToDelete.id, employeeToDelete.name);
      setIsDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      // Refresh the employee list
      await fetchEmployees(true);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Fehler beim Löschen des Mitarbeiters');
    }
  };
  
  const openDeleteConfirm = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteConfirmOpen(true);
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <>
      <div className="space-y-6 w-full">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center">
              <div className={`p-2 rounded-md bg-[${colors.primary}]/10 dark:bg-gray-700 mr-4`}>
                <Users size={24} className={`text-[${colors.primary}] dark:text-white dark:text-[${colors.primaryLight}]`} />
              </div>
              <div>
                <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Mitarbeiter</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400 font-app">
                  Verwalten Sie Ihre Mitarbeiter und deren Konten.
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={loading}
                leftIcon={<RefreshCw size={16} />}
              >
                Aktualisieren
              </Button>
              <Button
                leftIcon={<UserPlus size={16} />}
                size="md"
                onClick={() => setIsAddModalOpen(true)}
                style={{ backgroundColor: colors.primary, color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                Mitarbeiter hinzufügen
              </Button>
              {selectedEmployees.length > 0 && (
                <Button
                  leftIcon={<CreditCard size={16} />}
                  size="md"
                  onClick={handleOpenBulkPaymentModeAssignment}
                  style={{ backgroundColor: colors.accent, color: 'white' }}
                  className="hover:opacity-90 transition-opacity"
                >
                  Zahlungsmodus zuweisen ({selectedEmployees.length})
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-4">
            {/* Tab navigation with search */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4">
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Mitarbeiter ({activeEmployees.length})
                  </h2>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className={`text-[${colors.primary}] dark:text-white/60`} />
                    </div>
                    <input
                      type="text"
                      placeholder="Suchen..."
                      className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md w-full sm:w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<Filter size={16} />}
                    className="border-gray-200 dark:border-gray-700 hover:border-accent hover:text-accent dark:hover:text-accent transition-colors"
                  >
                    Filter
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-6 rounded-lg flex flex-col items-center">
                <div className="flex items-center mb-4">
                  <RefreshCw className="mr-2" size={20} />
                  <p>Ein Fehler ist aufgetreten beim Laden der Mitarbeiterdaten.</p>
                </div>
                <div className="mt-2">
                  <AnimatedButton
                    onClick={handleRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={loading}
                    icon={<RefreshCw size={16} className="mr-2" />}
                  >
                    Daten neu laden
                  </AnimatedButton>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchTerm ? (
                      <p>Keine Mitarbeiter gefunden, die "{searchTerm}" entsprechen.</p>
                    ) : (
                      <p>Keine Mitarbeiter vorhanden. Fügen Sie neue Mitarbeiter hinzu.</p>
                    )}
                  </div>
                ) : (
                  <motion.table
                    className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th
                          scope="col"
                          className="px-3 py-3 text-left"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployees(filteredEmployees);
                              } else {
                                setSelectedEmployees([]);
                              }
                            }}
                          />
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-app font-app-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-app font-app-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Rolle
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-app font-app-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-app font-app-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Zahlungsmodus
                        </th>
                        {shouldShowPaymentManagement() && (
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-app font-app-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Guthaben
                          </th>
                        )}
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-app font-app-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredEmployees.map((employee) => {
                        // Explicit check for active status
                        // Consider an employee active only if banned_until is null or a date in the past
                        const isActive = !employee.banned_until || new Date(employee.banned_until) < new Date();

                        return (
                          <motion.tr key={employee.id} variants={item} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-3 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedEmployees.some(emp => emp.id === employee.id)}
                                onChange={() => handleToggleEmployeeSelection(employee)}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div 
                                  className={`h-10 w-10 flex-shrink-0 flex items-center justify-center font-app font-app-medium ${
                                    isActive 
                                      ? `bg-[${colors.primary}]/10 dark:bg-gray-700 text-[${colors.primary}] dark:text-white dark:text-[${colors.primaryLight}]` 
                                      : `bg-[${colors.accent}]/10 dark:bg-gray-700 text-[${colors.accent}] dark:text-white dark:text-[${colors.accentLight}]`
                                  } rounded-full cursor-pointer shadow-sm border ${isActive ? `border-[${colors.primary}]/20 dark:border-gray-600` : `border-[${colors.accent}]/20 dark:border-gray-600`}`}
                                  onClick={() => navigate(`/admin/employees/${employee.id}`)}
                                >
                                  {employee.name?.charAt(0) || '?'}
                                </div>
                                <div className="ml-4">
                                  <div 
                                    className={`text-sm font-app font-app-medium text-gray-900 dark:text-white hover:text-[${colors.primary}] dark:text-white dark:hover:text-[${colors.primaryLight}] cursor-pointer flex items-center transition-colors`}
                                    onClick={() => navigate(`/admin/employees/${employee.id}`)}
                                  >
                                    {employee.name || 'Unbenannt'}
                                    {!isActive && (
                                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-app font-app-medium bg-[${colors.accent}]/10 dark:bg-gray-700 text-[${colors.accent}] dark:text-white dark:text-[${colors.accentLight}] border border-[${colors.accent}]/20 dark:border-gray-600 shadow-sm`}>
                                        DEAKTIVIERT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-app text-gray-500 dark:text-gray-400">
                                    {employee.email || 'Keine E-Mail'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-app text-gray-900 dark:text-white">
                              {employee.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-app font-app-medium ${
                                  isActive
                                    ? `bg-[${colors.primary}]/10 dark:bg-gray-700 text-[${colors.primary}] dark:text-white dark:text-[${colors.primaryLight}] border border-[${colors.primary}]/20 dark:border-gray-600`
                                    : `bg-[${colors.accent}]/10 dark:bg-gray-700 text-[${colors.accent}] dark:text-white dark:text-[${colors.accentLight}] border border-[${colors.accent}]/20 dark:border-gray-600`
                                } shadow-sm`}
                              >
                                {isActive ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentModeDisplay(employee.payment_mode).color}`}>
                                  {getPaymentModeDisplay(employee.payment_mode).text}
                                </span>
                                <button
                                  onClick={() => handleOpenPaymentModeAssignment(employee)}
                                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                  Ändern
                                </button>
                              </div>
                            </td>
                            {shouldShowPaymentManagement() && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {(() => {
                                  const balance = getWorkerBalance(employee.id);
                                  if (paymentLoading) {
                                    return (
                                      <div className="flex items-center">
                                        <LoadingSpinner size="sm" />
                                        <span className="ml-2 text-gray-500">Lädt...</span>
                                      </div>
                                    );
                                  }
                                  if (balance) {
                                    return (
                                      <div className="flex items-center">
                                        <Euro className="text-emerald-600 dark:text-emerald-400 mr-1" size={16} />
                                        <span className="font-medium">
                                          €{balance.current_balance.toFixed(2)}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center text-gray-400">
                                      <Euro className="mr-1" size={16} />
                                      <span>€0.00</span>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<ExternalLink size={16} />}
                                onClick={() => navigate(`/admin/employees/${employee.id}`)}
                              >
                                Details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Edit size={16} />}
                                onClick={() => openEditModal(employee)}
                              >
                                Bearbeiten
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<XCircle size={16} />}
                                onClick={() => openDeleteConfirm(employee)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Löschen
                              </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </motion.table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateEmployee}
        isLoading={loading}
      />
      
      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleEditEmployee}
        employee={selectedEmployee}
        isLoading={loading}
      />
      
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Mitarbeiter löschen
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sind Sie sicher, dass Sie <strong>{employeeToDelete.name}</strong> permanent löschen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden und entfernt alle Daten des Mitarbeiters.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setEmployeeToDelete(null);
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteEmployee}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Mode Assignment Modal */}
      {isPaymentModeModalOpen && paymentModeEmployee && (
        <PaymentModeAssignment
          employee={paymentModeEmployee}
          onUpdate={() => {
            handleRefresh();
            setPaymentModeEmployee(null);
          }}
          onClose={() => {
            setIsPaymentModeModalOpen(false);
            setPaymentModeEmployee(null);
          }}
        />
      )}

      {/* Bulk Payment Mode Assignment Modal */}
      {isBulkPaymentModeOpen && (
        <BulkPaymentModeAssignment
          selectedEmployees={selectedEmployees}
          onUpdate={() => {
            handleRefresh();
            setSelectedEmployees([]);
          }}
          onClose={() => {
            setIsBulkPaymentModeOpen(false);
          }}
        />
      )}
    </>
  );
};

export default React.memo(Employees);