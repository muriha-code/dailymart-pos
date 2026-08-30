"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Area, getRadianAngle, rotateSize, createImage } from "@/lib/cropImage";
import toast from "react-hot-toast";

interface EvidenceImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSaveCrop: (croppedDataUrl: string) => void;
}

/**
 * Custom canvas crop & rotate function generating Data URL
 */
async function generateCroppedDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Gagal menginisialisasi kanvas gambar.");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Gagal menginisialisasi kanvas potongan.");
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas.toDataURL("image/jpeg", 0.92);
}

export default function EvidenceImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSaveCrop,
}: EvidenceImageCropModalProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  if (!isOpen || !imageSrc) return null;

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      toast.error("Area potongan belum dipilih.");
      return;
    }

    setIsProcessing(true);
    try {
      const croppedDataUrl = await generateCroppedDataUrl(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      onSaveCrop(croppedDataUrl);
      onClose();
    } catch (err: any) {
      console.error("Gagal memotong gambar:", err);
      toast.error("Gagal memproses hasil potongan gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">
              Edit & Potong Foto Bukti Fisik
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">
              Sesuaikan rotasi & area pemotongan gambar sebelum disimpan ke draf.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center font-black text-xs cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
          >
            ✕
          </button>
        </div>

        {/* Editor Cropper Workspace Area */}
        <div className="relative w-full h-[340px] bg-slate-950 overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={4 / 3}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
          />
        </div>

        {/* Toolbar Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-900 dark:border-slate-100 space-y-3 shrink-0 text-xs font-bold text-slate-900 dark:text-slate-100">
          
          {/* Zoom Slider & Rotations Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">Zoom:</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#6366F1] cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <span className="font-mono text-xs">{zoom.toFixed(1)}x</span>
            </div>

            {/* Rotate & Reset Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotateLeft}
                className="px-2.5 py-1.5 rounded-lg border border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-black text-xs flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                title="Putar 90 Derajat Kiri"
              >
                ↺ 90° Kiri
              </button>
              <button
                type="button"
                onClick={handleRotateRight}
                className="px-2.5 py-1.5 rounded-lg border border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-black text-xs flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                title="Putar 90 Derajat Kanan"
              >
                ↻ 90° Kanan
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1.5 text-rose-600 dark:text-rose-400 hover:underline font-bold text-xs cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-slate-200 text-slate-900 dark:text-slate-100 font-bold text-xs cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="px-5 py-2 rounded-xl bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer flex items-center gap-1.5"
          >
            {isProcessing && (
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            )}
            <span>Simpan Potongan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
