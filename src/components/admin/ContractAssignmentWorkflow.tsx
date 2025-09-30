import React, { useState, useEffect } from 'react';
import { FileText, User, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { Profile, Contract } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface ContractAssignmentWorkflowProps {
  employee: Profile;
  onUpdate: () => void;
  onClose: () => void;
}

const ContractAssignmentWorkflow: React.FC<ContractAssignmentWorkflowProps> = ({
  employee,
  onUpdate,
  onClose
}) => {
  const { profile: currentUser } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch available contract templates
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('is_active', true)
          .eq('is_template', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContracts(data || []);
      } catch (error) {
        console.error('Error fetching contracts:', error);
        toast.error('Fehler beim Laden der Verträge');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const handleAssignContract = async () => {
    if (!selectedContract || !currentUser) {
      toast.error('Bitte wählen Sie einen Vertrag aus');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Create a new instance of the contract template
      const { data: newContract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          title: selectedContract.title,
          content: selectedContract.content,
          category: selectedContract.category,
          is_template: false,
          parent_id: selectedContract.id,
          version_number: selectedContract.version_number,
          template_data: selectedContract.template_data,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create the contract assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('contract_assignments')
        .insert({
          contract_id: newContract.id,
          user_id: employee.id,
          status: 'pending',
          assigned_at: now
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Update user's profile to link to the contract
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          contract_id: newContract.id,
          updated_at: now
        })
        .eq('id', employee.id);

      if (profileError) throw profileError;

      toast.success(`Vertrag erfolgreich an ${employee.first_name} ${employee.last_name} zugewiesen`);
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error assigning contract:', error);
      toast.error('Fehler beim Zuweisen des Vertrags');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Lade Verträge...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Vertrag zuweisen
              </h2>
              <p className="text-gray-600">
                {employee.first_name} {employee.last_name}
              </p>
            </div>
          </div>

          {employee.contract_id ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Bereits einem Vertrag zugewiesen
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Dieser Mitarbeiter hat bereits einen Vertrag zugewiesen bekommen.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  Kein Vertrag zugewiesen
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Wählen Sie einen Vertrag aus, um ihn diesem Mitarbeiter zuzuweisen.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verfügbare Verträge:</h3>
          
          {contracts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Keine aktiven Vertragsvorlagen gefunden.</p>
              <p className="text-sm">Erstellen Sie zuerst eine Vertragsvorlage.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => {
                const isSelected = selectedContract?.id === contract.id;
                
                return (
                  <button
                    key={contract.id}
                    onClick={() => setSelectedContract(contract)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-gray-400 bg-gray-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-base font-bold text-gray-900">{contract.title}</h4>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{contract.category}</p>
                        <p className="text-xs text-gray-500">
                          Version {contract.version_number} • Erstellt am {new Date(contract.created_at!).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          
          <button
            onClick={handleAssignContract}
            disabled={!selectedContract || isSubmitting || !!employee.contract_id}
            className="px-8 py-3 text-white rounded-lg font-semibold transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: (!selectedContract || !!employee.contract_id) 
                ? '#9CA3AF' 
                : `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
            }}
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
            <span className="relative z-10">
              {isSubmitting ? 'Wird zugewiesen...' : 
               employee.contract_id ? 'Bereits zugewiesen' : 'Vertrag zuweisen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractAssignmentWorkflow;
