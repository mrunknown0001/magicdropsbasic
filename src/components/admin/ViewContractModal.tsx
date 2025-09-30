import React from 'react';
import { FiX, FiDownload } from 'react-icons/fi';
import Button from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract } from '../../types/database';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { extractVariables } from '../../utils/contractUtils';
import './ViewContractModal.css';

interface ViewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  isAdmin: boolean;
}

const ViewContractModal: React.FC<ViewContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  isAdmin
}) => {
  // Safely handle the case when contract is null
  if (!isOpen || !contract) return null;

  // Function to render contract content with variables highlighted
  const renderContractContent = (content: string) => {
    // First create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Walk through text nodes and replace variables with highlighted versions
    const highlightVariablesInNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const fragment = document.createDocumentFragment();
        const regex = /{{(.*?)}}/g;
        let lastIndex = 0;
        let match;
        
        // For each match, create highlighted span
        while ((match = regex.exec(node.textContent)) !== null) {
          // Add text before the match
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(
              node.textContent.substring(lastIndex, match.index)
            ));
          }
          
          // Create highlighted span for the variable
          const span = document.createElement('span');
          span.className = 'bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded';
          span.textContent = match[0];
          fragment.appendChild(span);
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text
        if (lastIndex < node.textContent.length) {
          fragment.appendChild(document.createTextNode(
            node.textContent.substring(lastIndex)
          ));
        }
        
        // Replace the original node with our fragment
        if (node.parentNode && lastIndex > 0) {
          node.parentNode.replaceChild(fragment, node);
          return true; // Node was modified
        }
      }
      return false; // Node was not modified
    };
    
    // Process all text nodes in the document
    const processNode = (node: Node) => {
      // Process children first (depth-first), but make a copy of the children list
      // because it might change during processing
      const childNodes = Array.from(node.childNodes);
      
      for (const child of childNodes) {
        processNode(child);
      }
      
      // Now process this node
      highlightVariablesInNode(node);
    };
    
    // Start processing from the root
    processNode(tempDiv);
    
    // Return the modified HTML
    return <div className="rich-content-preview" dangerouslySetInnerHTML={{ __html: tempDiv.innerHTML }} />;
  };

  // Extract variables from the contract content
  const contentVariables = extractVariables(contract.content);

  // Function to generate PDF (placeholder for now)
  const handleDownload = () => {
    // TODO: Implement PDF generation
    alert('PDF Download functionality will be implemented soon.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-4xl mx-auto max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {contract.title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Contract metadata */}
                  <div className="md:col-span-1 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Kategorie</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{contract.category}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        v{contract.version} {contract.version_number ? `(${contract.version_number})` : ''}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contract.status === 'Aktiv' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900' 
                        : 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900'
                      }`}>
                        {contract.status || 'Aktiv'}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Letzte Aktualisierung</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDistanceToNow(new Date(contract.updated_at), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                    
                    {/* Show variables used in the contract content */}
                    {contentVariables.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Verwendete Variablen</h4>
                        <div className="mt-1 space-y-2">
                          {contentVariables.map(variable => (
                            <div key={variable} className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">
                                {`{{${variable}}}`}:
                              </span>
                              <span className="text-xs text-gray-900 dark:text-white ml-2">
                                {contract.template_data && contract.template_data[variable] 
                                  ? String(contract.template_data[variable]) 
                                  : 'Nicht definiert'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show all template data if available */}
                    {contract.template_data && Object.keys(contract.template_data).length > 0 && 
                     contentVariables.length < Object.keys(contract.template_data).length && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Alle Variablen</h4>
                        <div className="mt-1 space-y-2">
                          {Object.entries(contract.template_data).map(([key, value]) => (
                            <div key={key} className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">
                                {`{{${key}}}`}:
                              </span>
                              <span className="text-xs text-gray-900 dark:text-white ml-2">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Contract content */}
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Vertragstext</h4>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50 overflow-auto max-h-[600px]">
                      {renderContractContent(contract.content)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<FiDownload size={16} />}
                  onClick={handleDownload}
                >
                  PDF herunterladen
                </Button>
                

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ViewContractModal;
