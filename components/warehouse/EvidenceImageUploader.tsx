"use client";

import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import EvidenceImageCropModal from "./EvidenceImageCropModal";

interface EvidenceImageUploaderProps {
  images: string[]; // Holds local DataURLs / Cloudinary URLs
  onChange: (newImages: string[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
}

export default function EvidenceImageUploader({
  images = [],
  onChange,
  maxFiles = 3,
  maxSizeMb = 5,
  disabled = false,
}: EvidenceImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState<boolean>(false);
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSelectFiles = (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (images.length >= maxFiles) {
      toast.error(`Maksimal ${maxFiles} foto bukti fisik yang dapat diunggah!`);
      return;
    }

    const file = fileArray[0]; // Process first file
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type) && !["jpg", "jpeg", "png"].includes(ext || "")) {
      toast.error(`File "${file.name}" tidak valid. Hanya format .jpg dan .png yang diperbolehkan!`);
      return;
    }

    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`Ukuran file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas maks ${maxSizeMb}MB!`);
      return;
    }

    // Read into Data URL locally and open Crop Editor Modal
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setEditingIndex(null); // New image
        setActiveImageSrc(dataUrl);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenEditExisting = (indexToEdit: number) => {
    if (disabled) return;
    setEditingIndex(indexToEdit);
    setActiveImageSrc(images[indexToEdit]);
    setCropModalOpen(true);
  };

  const handleSaveCrop = (croppedDataUrl: string) => {
    if (editingIndex !== null && editingIndex >= 0) {
      // Replace existing image at editingIndex
      const updated = [...images];
      updated[editingIndex] = croppedDataUrl;
      onChange(updated);
      toast.success("Hasil foto bukti fisik berhasil diperbarui.");
    } else {
      // Append new cropped image
      if (images.length < maxFiles) {
        onChange([...images, croppedDataUrl]);
        toast.success("Foto bukti fisik berhasil ditambahkan ke draf.");
      }
    }
    setCropModalOpen(false);
    setActiveImageSrc(null);
    setEditingIndex(null);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (disabled) return;
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
          Foto Bukti Fisik <span className="text-slate-400 font-normal">({images.length}/{maxFiles} Foto)</span>
        </label>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          Format .JPG/.PNG (Maks {maxSizeMb}MB/file)
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        disabled={disabled || images.length >= maxFiles}
        onChange={(e) => e.target.files && handleSelectFiles(e.target.files)}
        className="hidden"
      />

      {/* Grid Display & Dropzone Container */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Uploaded Local Data URL / Thumbnail Items */}
        {images.map((url, idx) => (
          <div
            key={idx}
            className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] bg-slate-100 dark:bg-slate-800 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Bukti Fisik ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />

            {/* Hover Action Controls (Edit & Delete) */}
            {!disabled && (
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditExisting(idx)}
                  className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[10px] rounded border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                  title="Edit & Rotasi"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] rounded border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                  title="Hapus Foto"
                >
                  Hapus
                </button>
              </div>
            )}

            <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">
              #{idx + 1}
            </span>
          </div>
        ))}

        {/* Upload Dropzone Tile */}
        {images.length < maxFiles && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-[#6366F1] bg-indigo-50 dark:bg-indigo-950/40 scale-[0.98]"
                : "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-900 dark:hover:border-slate-300"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <svg
              className="w-6 h-6 text-slate-500 dark:text-slate-400 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">
              + Pilih Foto
            </span>
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Drag & Drop
            </span>
          </div>
        )}
      </div>

      {/* Local Image Crop & Rotate Modal */}
      <EvidenceImageCropModal
        isOpen={cropModalOpen}
        imageSrc={activeImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          setActiveImageSrc(null);
          setEditingIndex(null);
        }}
        onSaveCrop={handleSaveCrop}
      />
    </div>
  );
}
