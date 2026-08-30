"use client";

import React, { useState, useRef } from "react";
import toast from "react-hot-toast";

interface EvidenceImageUploaderProps {
  images: string[];
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Check max file limit
    if (images.length + fileArray.length > maxFiles) {
      toast.error(`Maksimal ${maxFiles} foto bukti fisik yang dapat diunggah!`);
      return;
    }

    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type) && !["jpg", "jpeg", "png"].includes(ext || "")) {
        toast.error(`File "${file.name}" tidak valid. Hanya format .jpg dan .png yang diperbolehkan!`);
        continue;
      }

      if (file.size > maxSizeBytes) {
        toast.error(`Ukuran file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas maks ${maxSizeMb}MB!`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const newUploadedUrls: string[] = [];

    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderType", "evidence");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (response.ok && result.success && result.imageUrl) {
          newUploadedUrls.push(result.imageUrl);
        } else {
          toast.error(result.message || `Gagal mengunggah ${file.name}`);
        }
      }

      if (newUploadedUrls.length > 0) {
        onChange([...images, ...newUploadedUrls]);
        toast.success(`Berhasil mengunggah ${newUploadedUrls.length} foto bukti.`);
      }
    } catch (err: any) {
      console.error("Gagal mengunggah foto bukti:", err);
      toast.error("Terjadi kesalahan koneksi saat mengunggah foto.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (disabled || isUploading) return;
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
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
        multiple
        disabled={disabled || isUploading || images.length >= maxFiles}
        onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
        className="hidden"
      />

      {/* Grid Display & Dropzone Container */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Uploaded Thumbnail Items */}
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
            
            {/* Overlay Delete Button */}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-transform hover:scale-110 cursor-pointer"
                title="Hapus foto"
              >
                ✕
              </button>
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
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-[#6366F1] bg-indigo-50 dark:bg-indigo-950/40 scale-[0.98]"
                : "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-900 dark:hover:border-slate-300"
            } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">Uploading...</span>
              </div>
            ) : (
              <>
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
                  + Upload Foto
                </span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  Drag & Drop
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
