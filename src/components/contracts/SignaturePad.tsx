import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface SignaturePadProps {
  onChange: (signatureData: string) => void;
  height?: number;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onChange,
  height = 200,
  className = '',
}) => {
  const signaturePadRef = useRef<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isPenMode, setIsPenMode] = useState<boolean>(true);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsEmpty(true);
      onChange(''); // Notify parent that signature was cleared
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current && !isEmpty) {
      // Generate data URL with proper format
      const signatureDataUrl = signaturePadRef.current.toDataURL('image/png');
      
      // Create and load an image to verify it works properly
      const img = new Image();
      
      img.onload = () => {
        // Image loaded successfully, pass to parent
        onChange(signatureDataUrl);
        console.log("Signature saved successfully");
      };
      
      img.onerror = (error) => {
        console.error("Error verifying signature image:", error);
        // Try a fallback method
        try {
          const alternateDataUrl = signaturePadRef.current?.toDataURL('image/png', 1.0);
          onChange(alternateDataUrl || '');
        } catch (fallbackError) {
          console.error("Fallback signature method failed:", fallbackError);
          onChange('');
        }
      };
      
      // Set the source to trigger onload/onerror
      img.src = signatureDataUrl;
    }
  };

  const togglePenMode = () => {
    setIsPenMode(!isPenMode);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-full">
        <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: `${height}px` }}>
          <SignatureCanvas
            ref={signaturePadRef}
            canvasProps={{
              className: 'w-full h-full bg-white dark:bg-gray-800',
              style: {
                width: '100%',
                height: '100%',
                touchAction: 'none', // Prevent scrolling on touch devices
                cursor: 'crosshair', // Better cursor for drawing
              },
            }}
            backgroundColor="transparent"
            onBegin={() => setIsEmpty(false)}
            onEnd={handleSave}
            penColor="#000000"
            dotSize={isPenMode ? 0.5 : 2} // Adjust based on input mode
            minWidth={isPenMode ? 0.5 : 1.5} // Thinner for pen, thicker for finger
            maxWidth={isPenMode ? 1.5 : 3.5} // Thinner for pen, thicker for finger
            velocityFilterWeight={isPenMode ? 0.6 : 0.4} // More smoothing for pen
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none bg-gradient-to-t from-gray-100 dark:from-gray-700 to-transparent opacity-50" />
      </div>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        <button
          onClick={handleClear}
          type="button"
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent flex items-center"
          title="Unterschrift löschen"
        >
          <TrashIcon className="h-4 w-4 mr-1" />
          Löschen
        </button>
        
        <button
          onClick={togglePenMode}
          type="button"
          className={`px-3 py-2 text-sm font-medium rounded-md flex items-center ${isPenMode ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700' : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          title={isPenMode ? "Stift-Modus aktiv" : "Finger-Modus aktiv"}
        >
          <PencilIcon className="h-4 w-4 mr-1" />
          {isPenMode ? "Stift-Modus" : "Finger-Modus"}
        </button>
        
        <p className="mt-2 text-xs text-gray-500 w-full text-center">
          Unterschreiben Sie mit der Maus oder Ihrem Finger im Feld oben.
        </p>
      </div>
    </div>
  );
};

export default SignaturePad;
