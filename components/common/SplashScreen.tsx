'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const LOG_MESSAGES = [
  'STATUS: INITIALIZING_SECURITY_CONTEXT...',
  'SESSION: VERIFYING_SINGLE_TAB_INTEGRITY...',
  'SUCCESS: GRANTED_NAVIGATING...',
];

export default function SplashScreen() {
  const [logIndex, setLogIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Progress bar increment animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 15;
      });
    }, 350);

    // Terminal log text switcher
    const logInterval = setInterval(() => {
      setLogIndex((prev) => (prev < LOG_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 600);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: 'blur(4px)' }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* Background Cyber Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.15) 0%, transparent 70%), 
                            linear-gradient(to right, rgba(34, 211, 238, 0.08) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(34, 211, 238, 0.08) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />

      {/* Cyber Ambient Radial Glow */}
      <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center space-y-8">
        
        {/* Central Badge Container */}
        <div className="relative group">
          {/* Cyber Glow behind Badge */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-500" />
          
          {/* Central Badge (Logo Box) */}
          <div className="relative bg-blue-600 border-4 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(34,211,238,1)] flex flex-col items-center justify-center min-w-[120px] min-h-[120px]">
            
            {/* Horizontal Neon Cyan Scanner Line */}
            <div className="absolute left-0 right-0 top-0 h-1 bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-pulse" />

            {/* Industrial Corner Accents */}
            <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-cyan-200 opacity-70">
              [+01]
            </span>
            <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold text-cyan-200 opacity-70">
              [POS]
            </span>

            {/* Big "D" Monogram */}
            <span className="font-black text-6xl text-slate-950 drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)] tracking-tighter">
              D
            </span>
          </div>
        </div>

        {/* Brand & System Title */}
        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase">
            DAILYMART <span className="text-cyan-400">POS</span>
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            INDUSTRIAL CYBER EDITION v2.5
          </p>
        </div>

        {/* Progress Bar & Spinner Container */}
        <div className="w-full space-y-3">
          {/* Progress Bar Frame */}
          <div className="relative w-full bg-slate-900 border border-slate-800 rounded-full h-3 p-0.5 overflow-hidden shadow-[0_0_10px_rgba(34,211,238,0.15)]">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee]"
              initial={{ width: '5%' }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Spinner and Status Indicator */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <svg 
                className="animate-spin h-3.5 w-3.5 text-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-20" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                />
                <path 
                  className="opacity-90" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                />
              </svg>
              <span className="text-[10px] font-mono text-cyan-300 font-semibold tracking-wider">
                {Math.min(progress, 100)}%
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              SECURE_LINK // SYNC
            </span>
          </div>
        </div>

        {/* Terminal Text Logger */}
        <div className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 shadow-inner">
          <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 flex items-center justify-center gap-2 min-h-[20px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            <motion.span
              key={logIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {LOG_MESSAGES[logIndex]}
            </motion.span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
