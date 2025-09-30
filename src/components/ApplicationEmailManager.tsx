import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  email_status?: 'pending' | 'sent' | 'failed';
  email_sent_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
}

interface ApplicationEmailManagerProps {
  className?: string;
}

export const ApplicationEmailManager: React.FC<ApplicationEmailManagerProps> = ({ className = '' }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load applications with email status
  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select('id, first_name, last_name, email, status, created_at, email_status, email_sent_at, approved_at, rejected_at')
        .in('status', ['approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setApplications(data || []);
    } catch (err: any) {
      console.error('Error loading applications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load applications on component mount
  useEffect(() => {
    loadApplications();
  }, []);

  const getStatusIcon = (application: Application) => {
    if (application.email_sent_at) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (application.status === 'approved' || application.status === 'rejected') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (application: Application) => {
    if (application.email_sent_at) {
      return `E-Mail gesendet am ${new Date(application.email_sent_at).toLocaleString('de-DE')}`;
    } else if (application.status === 'approved' || application.status === 'rejected') {
      return 'E-Mail noch nicht gesendet';
    } else {
      return 'Ausstehend';
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Eingestellt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Abgelehnt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Ausstehend
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">E-Mail Status</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Lade E-Mail Status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Mail className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">E-Mail Status</h3>
          <span className="text-sm text-gray-500">
            ({applications.length} bearbeitete Bewerbungen)
          </span>
        </div>
        <button
          onClick={loadApplications}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Keine bearbeiteten Bewerbungen gefunden</p>
          <p className="text-sm text-gray-400 mt-1">
            E-Mail Status wird hier angezeigt, sobald Bewerbungen eingestellt oder abgelehnt wurden.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bewerber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-Mail Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bearbeitet am
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {application.first_name} {application.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{application.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getApplicationStatusBadge(application.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(application)}
                      <span className="ml-2 text-sm text-gray-900">
                        {getStatusText(application)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {application.approved_at && new Date(application.approved_at).toLocaleString('de-DE')}
                    {application.rejected_at && new Date(application.rejected_at).toLocaleString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          💡 <strong>Hinweis:</strong> E-Mails werden jetzt manuell über die Bewerbungsverwaltung versendet. 
          Automatische E-Mail-Warteschlangen sind deaktiviert.
        </p>
      </div>
    </div>
  );
}; 