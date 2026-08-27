'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center select-none"
    >
      <div className="flex flex-col items-center space-y-6 text-center max-w-xs px-4">
        
        {/* Central Logo Box */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600 border-2 border-slate-700 shadow-[4px_4px_0px_0px_rgba(37,99,235,1)] flex items-center justify-center font-black text-3xl text-white tracking-tighter">
          D
        </div>

        {/* Brand & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-base font-bold text-slate-100 tracking-wider uppercase">
            DAILYMART <span className="text-blue-500">POS</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Memverifikasi Sesi Keamanan...
          </p>
        </div>

        {/* Minimalist Progress Bar (Cyber Blue #2563EB) */}
        <div className="w-48 bg-slate-800/80 rounded-full h-1.5 overflow-hidden relative">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
            }}
          />
        </div>

      </div>
    </motion.div>
  );
}
