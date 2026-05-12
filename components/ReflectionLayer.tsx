import React, { useState, useEffect } from 'react';

interface ReflectionLayerProps {
  text: string;
}

const ReflectionLayer: React.FC<ReflectionLayerProps> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reset when primary text changes
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text.charAt(index));
        setIndex(prev => prev + 1);
      }, 30); // Speed of typing
      return () => clearTimeout(timeout);
    }
  }, [index, text]);

  return (
    <div className="bg-[#1a1a1a] rounded-t-3xl p-12 text-center relative overflow-hidden mt-8 min-h-[160px] flex items-center justify-center">
       {/* Decorative subtle header */}
       <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase">
          Neural Reflection Layer
       </div>

       {/* Main Text */}
       <p className="serif text-2xl md:text-3xl text-white/90 max-w-4xl mx-auto leading-relaxed h-auto">
          "{displayedText}"<span className="animate-pulse inline-block w-1 h-6 bg-emerald-500 ml-1">|</span>
       </p>

       {/* Decorative Icon */}
       <div className="absolute bottom-[-20px] right-[-20px] opacity-10">
          <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
             <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
          </svg>
       </div>
    </div>
  );
};

export default ReflectionLayer;