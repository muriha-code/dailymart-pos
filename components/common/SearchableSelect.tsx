"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Cari...",
  disabled = false,
  emptyMessage = "Produk/Supplier tidak ditemukan",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Selected Option Object
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered Options based on Search Query (Label & Sublabel)
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSublabel = opt.sublabel
        ? opt.sublabel.toLowerCase().includes(query)
        : false;
      return matchLabel || matchSublabel;
    });
  }, [options, searchQuery]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-xs font-sans ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-900 rounded-xl flex items-center justify-between text-left shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all ${
          isOpen ? "bg-white ring-2 ring-slate-900/10" : "bg-slate-50 hover:bg-white"
        } ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {selectedOption ? (
            <div className="truncate">
              <span className="font-black text-slate-900">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="ml-2 font-mono font-bold text-[11px] text-slate-600">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-bold">{placeholder}</span>
          )}
        </div>

        {/* Chevron Icon */}
        <svg
          className={`w-4 h-4 text-slate-900 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu (Always opens downward: top-full mt-1.5 z-50) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b-2 border-slate-900 bg-slate-100">
            <div className="relative flex items-center">
              <svg
                className="w-3.5 h-3.5 text-slate-700 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Options List Container */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-slate-400 text-xs font-medium">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-amber-50/90 text-amber-950 font-semibold"
                        : "hover:bg-amber-50/60 text-slate-800"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-slate-900 truncate">
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="font-mono text-[11px] text-slate-500 truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {opt.badge && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
