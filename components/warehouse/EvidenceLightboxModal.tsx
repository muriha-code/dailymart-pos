"use client";

import React, { useState, useEffect } from "react";

interface EvidenceLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

export default function EvidenceLightboxModal({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title = "Galeri Foto Bukti Fisik",
}: EvidenceLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative bg-slate-900 border-2 border-slate-100 rounded-2xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-800 border-b-2 border-slate-100 flex items-center justify-between shrink-0 text-slate-100">
          <div>
            <h3 className="text-sm font-black tracking-tight">{title}</h3>
            <p className="text-[11px] text-slate-300 font-mono font-bold">
              Foto {currentIndex + 1} dari {images.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 border-2 border-slate-100 hover:bg-slate-700 text-slate-100 flex items-center justify-center font-black text-sm transition-transform active:scale-95 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
            title="Tutup Preview"
          >
            ✕
          </button>
        </div>

        {/* Main Display Area */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-4 min-h-[300px] sm:min-h-[420px] overflow-hidden">
          {/* Main Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[currentIndex]}
            alt={`Bukti ${currentIndex + 1}`}
            className="max-h-[60vh] max-w-full object-contain rounded-lg border border-slate-700 shadow-2xl transition-all"
          />

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border-2 border-slate-100 flex items-center justify-center font-black text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              title="Foto Sebelumnya"
            >
              ‹
            </button>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border-2 border-slate-100 flex items-center justify-center font-black text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              title="Foto Selanjutnya"
            >
              ›
            </button>
          )}
        </div>

        {/* Footer Thumbnail Bar */}
        {images.length > 1 && (
          <div className="p-3 bg-slate-800 border-t-2 border-slate-100 flex items-center justify-center gap-2.5 shrink-0 overflow-x-auto">
            {images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? "border-[#FFB800] ring-2 ring-[#FFB800] scale-105"
                    : "border-slate-600 opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
