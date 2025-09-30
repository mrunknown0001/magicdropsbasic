import React from 'react';

interface ShimmerEffectProps {
  className?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
}

const ShimmerEffect: React.FC<ShimmerEffectProps> = ({
  className = '',
  width = '100%',
  height = '20px',
  borderRadius = '0.375rem',
}) => {
  return (
    <div 
      className={`relative overflow-hidden bg-gray-200 ${className}`}
      style={{ 
        width, 
        height, 
        borderRadius 
      }}
    >
      <div className="absolute inset-0">
        <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
      </div>
    </div>
  );
};

export default ShimmerEffect;
