import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  CreditCard, 
  Euro, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { usePaymentManagement } from '../../hooks/usePaymentManagement';
import { useSettingsContext } from '../../context/SettingsContext';
import { useEmployees } from '../../hooks/useEmployees';
import { WorkerBalance, PayoutRequest, PaymentTransaction } from '../../types/database';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Input from '../../components/ui/Input';

// Status mapping for payout requests
const payoutStatusMap = {
  'pending': { 
    label: 'Ausstehend', 
    bg: 'bg-yellow-100', 
    text: 'text-yellow-800', 
    icon: Clock,
    darkBg: 'dark:bg-yellow-900/30', 
    darkText: 'dark:text-yellow-300' 
  },
  'approved': { 
    label: 'Genehmigt', 
    bg: 'bg-green-100', 
    text: 'text-green-800', 
    icon: CheckCircle,
    darkBg: 'dark:bg-green-900/30', 
    darkText: 'dark:text-green-300' 
  },
  'rejected': { 
    label: 'Abgelehnt', 
    bg: 'bg-red-100', 
    text: 'text-red-800', 
    icon: XCircle,
    darkBg: 'dark:bg-red-900/30', 
    darkText: 'dark:text-red-300' 
  },
  'paid': { 
    label: 'Ausgezahlt', 
    bg: 'bg-blue-100', 
    text: 'text-blue-800', 
    icon: CheckCircle,
    darkBg: 'dark:bg-blue-900/30', 
    darkText: 'dark:text-blue-300' 
  }
};

const PaymentManagement: React.FC = () => {
  const { shouldShowPaymentManagement } = useSettingsContext();
  const { employees, loading: employeesLoading } = useEmployees();
  const [activeTab, setActiveTab] = useState<'overview' | 'balances' | 'payouts' | 'transactions'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const {
    workerBalances,
    payoutRequests,
    paymentTransactions,
    loading,
    error,
    approvePayout,
    rejectPayout,
    recordTaskPayment,
    adjustBalance,
    refreshData
  } = usePaymentManagement(shouldShowPaymentManagement());

  // Helper function to get worker name
  const getWorkerName = (workerId: string) => {
    if (employeesLoading) return 'Lädt...';
    const employee = employees.find(emp => emp.id === workerId);
    return employee ? `${employee.first_name} ${employee.last_name}` : `ID: ${workerId.slice(0, 8)}...`;
  };

  // Calculate overview statistics
  const stats = useMemo(() => {
    if (!workerBalances || !payoutRequests) {
      return {
        totalBalance: 0,
        totalEarned: 0,
        totalPaidOut: 0,
        pendingPayouts: 0,
        pendingAmount: 0,
        activeWorkers: 0
      };
    }

    const totalBalance = workerBalances.reduce((sum, balance) => sum + (balance.current_balance || 0), 0);
    const totalEarned = workerBalances.reduce((sum, balance) => sum + (balance.total_earned || 0), 0);
    const totalPaidOut = workerBalances.reduce((sum, balance) => sum + (balance.total_paid_out || 0), 0);
    const pendingPayouts = payoutRequests.filter(req => req.status === 'pending');
    const pendingAmount = pendingPayouts.reduce((sum, req) => sum + (req.amount || 0), 0);

    return {
      totalBalance,
      totalEarned,
      totalPaidOut,
      pendingPayouts: pendingPayouts.length,
      pendingAmount,
      activeWorkers: workerBalances.filter(balance => (balance.current_balance || 0) > 0).length
    };
  }, [workerBalances, payoutRequests]);

  // Filter payout requests
  const filteredPayouts = useMemo(() => {
    if (!payoutRequests) return [];
    
    return payoutRequests.filter(payout => {
      const workerName = getWorkerName(payout.worker_id);
      const matchesSearch = searchTerm === '' || 
        workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.worker_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payoutRequests, searchTerm, statusFilter, employees, employeesLoading]);

  const handleApprovePayout = async (payoutId: string) => {
    try {
      await approvePayout(payoutId);
      toast.success('Auszahlung genehmigt');
    } catch (error) {
      toast.error('Fehler beim Genehmigen der Auszahlung');
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !rejectionReason.trim()) {
      toast.error('Bitte geben Sie einen Ablehnungsgrund an');
      return;
    }

    try {
      await rejectPayout(selectedPayout.id, rejectionReason);
      toast.success('Auszahlung abgelehnt');
      setShowRejectModal(false);
      setSelectedPayout(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Fehler beim Ablehnen der Auszahlung');
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  // Redirect if not in task-based payment mode
  if (!shouldShowPaymentManagement()) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Zahlungsmanagement nicht verfügbar
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Das Zahlungsmanagement ist nur im Vergütungsmodus verfügbar. 
              Wechseln Sie in den Einstellungen zu "Vergütung pro Aufgabe".
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <AlertCircle className="mx-auto mb-2" size={48} />
        <p>Fehler beim Laden der Zahlungsdaten: {error.message}</p>
        <Button onClick={refreshData} className="mt-4">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zahlungsmanagement</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verwalten Sie Mitarbeiterguthaben und Auszahlungsanfragen
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={refreshData}
            leftIcon={<RefreshCw size={16} />}
          >
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
            { id: 'balances', label: 'Guthaben', icon: Euro },
            { id: 'payouts', label: 'Auszahlungen', icon: CreditCard },
            { id: 'transactions', label: 'Transaktionen', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary text-primary dark:text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="mr-2" size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Euro className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gesamtguthaben</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{stats.totalBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gesamt verdient</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{stats.totalEarned.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ausstehende Auszahlungen</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{stats.pendingAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.pendingPayouts} Anfragen
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payout Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Neueste Auszahlungsanfragen</CardTitle>
            </CardHeader>
            <CardContent>
              {(payoutRequests || []).slice(0, 5).map((payout) => {
                const statusInfo = payoutStatusMap[payout.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={payout.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${statusInfo.bg} ${statusInfo.darkBg}`}>
                        <StatusIcon size={16} className={`${statusInfo.text} ${statusInfo.darkText}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          €{payout.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(payout.requested_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.darkBg} ${statusInfo.darkText}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'balances' && (
        <Card>
          <CardHeader>
            <CardTitle>Mitarbeiterguthaben</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mitarbeiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aktuelles Guthaben
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gesamt verdient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ausgezahlt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {(workerBalances || []).map((balance) => (
                    <tr key={balance.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {getWorkerName(balance.worker_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        €{balance.current_balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        €{balance.total_earned.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        €{balance.total_paid_out.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Eye size={16} />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'payouts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Mitarbeiter suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Alle Status</option>
              <option value="pending">Ausstehend</option>
              <option value="approved">Genehmigt</option>
              <option value="rejected">Abgelehnt</option>
              <option value="paid">Ausgezahlt</option>
            </select>
          </div>

          {/* Payout Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Auszahlungsanfragen ({filteredPayouts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPayouts.map((payout) => {
                  const statusInfo = payoutStatusMap[payout.status];
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={payout.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${statusInfo.bg} ${statusInfo.darkBg}`}>
                            <StatusIcon size={20} className={`${statusInfo.text} ${statusInfo.darkText}`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              €{payout.amount.toFixed(2)}
                            </h4>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {getWorkerName(payout.worker_id)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Angefragt am {formatDate(payout.requested_at)}
                            </p>
                            {payout.payment_method && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {payout.payment_method.type === 'bank' && 
                                  `IBAN: ${payout.payment_method.iban}`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.darkBg} ${statusInfo.darkText}`}>
                            {statusInfo.label}
                          </span>
                          
                          {payout.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprovePayout(payout.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Genehmigen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setShowRejectModal(true);
                                }}
                              >
                                Ablehnen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {payout.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            <strong>Ablehnungsgrund:</strong> {payout.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Zahlungstransaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mitarbeiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Beschreibung
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {(paymentTransactions || []).slice(0, 20).map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getWorkerName(transaction.worker_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transaction.transaction_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount >= 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {transaction.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Payout Modal */}
      {showRejectModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Auszahlung ablehnen
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Auszahlung von €{selectedPayout.amount.toFixed(2)} ablehnen?
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ablehnungsgrund *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Grund für die Ablehnung..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedPayout(null);
                  setRejectionReason('');
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleRejectPayout}
                disabled={!rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Ablehnen
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
