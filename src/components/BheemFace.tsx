import React, { useEffect, useState } from 'react';
import type { BheemState } from '../hooks/useRealtimeAPI';

export const BheemFace: React.FC<{ state: BheemState; volume: number }> = ({ state, volume }) => {
  const [blink, setBlink] = useState(false);

  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, Math.random() * 3000 + 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  const eyeScaleY = blink ? 0.1 : (state === 'thinking' ? 0.6 : 1);
  const eyeScaleX = state === 'listening' ? 1.1 : 1;
  const mouthHeight = state === 'speaking' ? Math.max(5, volume * 100) : (state === 'idle' ? 2 : 4);
  const mouthWidth = state === 'speaking' ? 20 + volume * 20 : (state === 'thinking' ? 15 : 30);
  const mouthY = state === 'thinking' ? 65 : 70;

  return (
    <div className="flex items-center justify-center w-full h-full bg-slate-900 rounded-2xl p-4 shadow-xl select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <svg width="200" height="200" viewBox="0 0 100 100" className="transition-all duration-300">
        {/* Left Eye */}
        <ellipse cx="38" cy="40" rx={8 * eyeScaleX} ry={12 * eyeScaleY} fill="#60A5FA" className="transition-all duration-150" />
        {/* Right Eye */}
        <ellipse cx="62" cy="40" rx={8 * eyeScaleX} ry={12 * eyeScaleY} fill="#60A5FA" className="transition-all duration-150" />
        {/* Mouth */}
        <rect 
          x={50 - mouthWidth / 2} 
          y={mouthY} 
          width={mouthWidth} 
          height={mouthHeight} 
          rx={mouthHeight / 2} 
          fill="#60A5FA" 
          className="transition-all duration-75" 
        />
      </svg>
    </div>
  );
};
