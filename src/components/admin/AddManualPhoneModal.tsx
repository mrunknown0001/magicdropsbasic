import React, { useState, useEffect } from 'react';
import { FiPhone, FiLink, FiCheck, FiAlertCircle, FiEye, FiGlobe } from 'react-icons/fi';
import { receiveSmsOnlineUtils } from '../../api/phoneApiClient';
import Button from '../ui/Button';

interface AddManualPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => Promise<void>;
  loading?: boolean;
}

interface ParsedUrlData {
  phoneNumber: string;
  accessKey: string;
  country: string;
  isValid: boolean;
}

const AddManualPhoneModalContent: React.FC<Omit<AddManualPhoneModalProps, 'isOpen'>> = ({
  onClose,
  onAdd,
  loading = false
}) => {
  const [url, setUrl] = useState('');
  const [parsedData, setParsedData] = useState<ParsedUrlData | null>(null);
  const [urlError, setUrlError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Reset state when component mounts
  useEffect(() => {
    setUrl('');
    setParsedData(null);
    setUrlError('');
    setPreviewMessages([]);
    setPreviewError('');
    setShowPreview(false);
  }, []);

  // Validate URL when it changes
  useEffect(() => {
    if (!url.trim()) {
      setParsedData(null);
      setUrlError('');
      return;
    }

    const validateUrl = async () => {
      setIsValidating(true);
      setUrlError('');

      try {
        // Basic URL validation
        if (!receiveSmsOnlineUtils.validateUrl(url)) {
          throw new Error('Invalid receive-sms-online.info URL format');
        }

        // Parse URL data
        const parsed = receiveSmsOnlineUtils.parseUrl(url);
        if (!parsed) {
          throw new Error('Could not extract phone number and access key from URL');
        }

        const country = receiveSmsOnlineUtils.detectCountry(parsed.phoneNumber);

        setParsedData({
          phoneNumber: parsed.phoneNumber,
          accessKey: parsed.accessKey,
          country,
          isValid: true
        });

      } catch (error) {
        setUrlError(error instanceof Error ? error.message : 'Invalid URL');
        setParsedData(null);
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateUrl, 500);
    return () => clearTimeout(debounceTimer);
  }, [url]);

  const handlePreviewMessages = async () => {
    if (!parsedData?.isValid || !url) return;

    setIsPreviewLoading(true);
    setPreviewError('');
    setPreviewMessages([]);
    setShowPreview(true); // Always show preview section when button is clicked

    try {
      console.log('Starting backend message preview for URL:', url);
      
      // Use backend endpoint to avoid CORS issues completely
      const response = await fetch('/api/phone/receive-sms/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Backend scraping result:', result);
      
      if (result.success) {
        setPreviewMessages(result.messages);
        if (result.messages.length === 0) {
          setPreviewError('No messages found. The phone number might be new or inactive.');
        }
      } else {
        setPreviewError(result.error || 'Failed to fetch messages from backend');
      }
    } catch (error) {
      console.error('Backend preview error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Failed to preview messages via backend');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parsedData?.isValid || !url.trim()) {
      setUrlError('Please enter a valid receive-sms-online.info URL');
      return;
    }

    try {
      await onAdd(url.trim());
      onClose();
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : 'Failed to add phone number');
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <FiGlobe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add a phone number from receive-sms-online.info by entering the private URL. 
            This will allow you to receive SMS messages through web scraping.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Receive-SMS-Online.info URL
          </label>
          <div className="relative">
            <FiLink className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://receive-sms-online.info/private.php?phone=4915123456789&key=abc123"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
            {isValidating && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {urlError && (
            <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
              <FiAlertCircle className="h-4 w-4 mr-1" />
              {urlError}
            </div>
          )}
        </div>

        {/* Parsed Data Display */}
        {parsedData?.isValid && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <FiCheck className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                URL Successfully Parsed
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-700 dark:text-green-300">Phone Number:</span>
                <div className="text-green-600 dark:text-green-400 font-mono">
                  {parsedData.phoneNumber}
                </div>
              </div>
              <div>
                <span className="font-medium text-green-700 dark:text-green-300">Country:</span>
                <div className="text-green-600 dark:text-green-400">
                  {parsedData.country}
                </div>
              </div>
              <div>
                <span className="font-medium text-green-700 dark:text-green-300">Access Key:</span>
                <div className="text-green-600 dark:text-green-400 font-mono">
                  {parsedData.accessKey.substring(0, 8)}...
                </div>
              </div>
            </div>

            {/* Preview Button */}
            <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviewMessages}
                  disabled={isPreviewLoading}
                  leftIcon={<FiEye />}
                >
                  {isPreviewLoading ? 'Loading Preview...' : 'Preview Messages'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Messages */}
        {showPreview && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Message Preview ({previewMessages.length} messages)
            </h4>
            
            {previewError && (
              <div className="mb-3 flex items-center text-sm text-amber-600 dark:text-amber-400">
                <FiAlertCircle className="h-4 w-4 mr-1" />
                {previewError}
              </div>
            )}

            {isPreviewLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading messages...</span>
                </div>
              </div>
            ) : previewMessages.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {previewMessages.slice(0, 3).map((message, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {message.sender}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.received_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {message.message}
                    </div>
                    {/* Extract and highlight verification codes */}
                    {(() => {
                      const codeMatch = message.message.match(/\b\d{4,8}\b/);
                      return codeMatch ? (
                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                          Code: {codeMatch[0]}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
                {previewMessages.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                    ... and {previewMessages.length - 3} more messages
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No messages found for this phone number
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!parsedData?.isValid || loading}
            isLoading={loading}
            leftIcon={<FiPhone />}
          >
            Add Phone Number
          </Button>
        </div>
      </form>
    </div>
  );
};

// Export the content component for use with the existing Modal wrapper
export { AddManualPhoneModalContent };

// Legacy wrapper for backward compatibility
const AddManualPhoneModal: React.FC<AddManualPhoneModalProps> = (props) => {
  if (!props.isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={props.onClose}
        />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

        {/* Modal */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiPhone className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  Add Manual Phone Number
                </h3>
              </div>
              <button
                onClick={props.onClose}
                className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <AddManualPhoneModalContent
              onClose={props.onClose}
              onAdd={props.onAdd}
              loading={props.loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddManualPhoneModal; 