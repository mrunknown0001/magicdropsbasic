import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  Euro, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Download,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useWorkerBalance } from '../../hooks/useWorkerBalance';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';
import PayoutRequestModal from '../../components/PayoutRequestModal';

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

const Auszahlung: React.FC = () => {
  const { profile, isTaskBasedUser } = useAuth();
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payouts'>('overview');

  const {
    balance,
    transactions,
    payoutRequests,
    loading,
    error,
    createPayoutRequest,
    refreshBalance,
    refreshTransactions,
    refreshPayoutRequests
  } = useWorkerBalance(profile?.id);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  const refreshAllData = async () => {
    try {
      await Promise.all([
        refreshBalance(),
        refreshTransactions(),
        refreshPayoutRequests()
      ]);
      toast.success('Daten aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Daten');
    }
  };

  const handleCreatePayout = async (amount: number, paymentMethod?: Record<string, any>) => {
    try {
      const success = await createPayoutRequest(amount, paymentMethod);
      if (success) {
        setShowPayoutModal(false);
        toast.success('Auszahlungsanfrage erfolgreich eingereicht');
      }
      return success;
    } catch (error) {
      toast.error('Fehler beim Erstellen der Auszahlungsanfrage');
      return false;
    }
  };

  // Redirect if user is not in task-based payment mode
  if (!isTaskBasedUser()) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Auszahlungen nicht verfügbar
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Auszahlungen sind nur für Nutzer im Vergütungsmodus verfügbar. 
              Ihr Konto ist auf Vertragsbasis konfiguriert.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !balance) {
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
        <p>Fehler beim Laden der Auszahlungsdaten: {error}</p>
        <Button onClick={refreshAllData} className="mt-4">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full px-4 py-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auszahlungen</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Verwalten Sie Ihr Guthaben und beantragen Sie Auszahlungen
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button variant="outline" onClick={refreshAllData} disabled={loading}>
              <RefreshCw size={16} className="mr-2" />
              Aktualisieren
            </Button>
            <Button 
              onClick={() => setShowPayoutModal(true)}
              disabled={!balance || balance.current_balance <= 0}
            >
              <Plus size={16} className="mr-2" />
              Auszahlung beantragen
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Übersicht', icon: TrendingUp },
            { id: 'transactions', label: 'Transaktionen', icon: Euro },
            { id: 'payouts', label: 'Auszahlungsanfragen', icon: CreditCard }
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
          {/* Balance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Euro className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktuelles Guthaben</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{balance?.current_balance?.toFixed(2) || '0.00'}
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
                      €{balance?.total_earned?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ausgezahlt</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{balance?.total_paid_out?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Neueste Transaktionen</CardTitle>
              </CardHeader>
              <CardContent>
                {(transactions || []).slice(0, 5).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Noch keine Transaktionen vorhanden
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(transactions || []).slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                        <span className={`font-bold ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount >= 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Payout Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Auszahlungsanfragen</CardTitle>
              </CardHeader>
              <CardContent>
                {(payoutRequests || []).slice(0, 5).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Noch keine Auszahlungsanfragen gestellt
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(payoutRequests || []).slice(0, 5).map((payout) => {
                      const statusInfo = payoutStatusMap[payout.status];
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div key={payout.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <div className={`p-1 rounded-full ${statusInfo.bg} ${statusInfo.darkBg}`}>
                              <StatusIcon size={14} className={`${statusInfo.text} ${statusInfo.darkText}`} />
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Alle Transaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            {(transactions || []).length === 0 ? (
              <div className="text-center py-8">
                <Euro className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500 dark:text-gray-400">
                  Noch keine Transaktionen vorhanden
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Beschreibung
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Betrag
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {(transactions || []).map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="capitalize">
                            {transaction.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {transaction.amount >= 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payouts' && (
        <Card>
          <CardHeader>
            <CardTitle>Meine Auszahlungsanfragen</CardTitle>
          </CardHeader>
          <CardContent>
            {(payoutRequests || []).length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Noch keine Auszahlungsanfragen gestellt
                </p>
                <Button 
                  onClick={() => setShowPayoutModal(true)}
                  disabled={!balance || balance.current_balance <= 0}
                >
                  <Plus size={16} className="mr-2" />
                  Erste Auszahlung beantragen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(payoutRequests || []).map((payout) => {
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Angefragt am {formatDate(payout.requested_at)}
                            </p>
                            {payout.payment_method && payout.payment_method.type === 'bank' && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                IBAN: {payout.payment_method.iban}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.darkBg} ${statusInfo.darkText}`}>
                          {statusInfo.label}
                        </span>
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout Request Modal */}
      <PayoutRequestModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        balance={balance}
        onSubmit={handleCreatePayout}
      />
    </div>
  );
};

export default Auszahlung;
