import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RotateCcw,
  RotateCw,
  RefreshCw,
  Check,
  Eye,
  RotateCw as RotateIcon,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Crop,
  Sparkles,
} from "lucide-react";
import { ImageAdjustOptions, ImageQualityResult } from "../types/inspection";
import { applyImageAdjustments } from "../services/imageProcessing";
import { loadImage } from "../utils/imageUtils";
import { CropPreviewModal } from "./CropPreviewModal";

interface ImageReviewEditorProps {
  initialDataUrl: string;
  initialQuality?: ImageQualityResult;
  onConfirm: (finalBase64Image: string, finalDataUrl: string) => void;
  onRetake: () => void;
}

// Normalized crop box on displayed image (percentages 0..100)
interface SelectionBox {
  x: number; // percentage from left (0..100)
  y: number; // percentage from top (0..100)
  width: number; // percentage width (0..100)
  height: number; // percentage height (0..100)
}

type DragMode =
  | "move"
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "w"
  | "e"
  | null;

export const ImageReviewEditor: React.FC<ImageReviewEditorProps> = ({
  initialDataUrl,
  initialQuality,
  onConfirm,
  onRetake,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [documentMode, setDocumentMode] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Source image state
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  // Selection box in percentage relative to image dimensions (0..100)
  // Default: Center-left column covering approx 35% width, 80% height (typical item code column)
  const [selection, setSelection] = useState<SelectionBox>({
    x: 10,
    y: 10,
    width: 35,
    height: 80,
  });

  // Dragging state
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startSelectionRef = useRef<SelectionBox>(selection);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewCroppedUrl, setPreviewCroppedUrl] = useState<string>("");

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize source image canvas
  const initSourceCanvas = useCallback(async (dataUrl: string, rotAngle: number) => {
    try {
      setIsProcessing(true);
      const img = await loadImage(dataUrl);

      // Create rotated source canvas
      const canvas = document.createElement("canvas");
      const isRotated = rotAngle % 180 !== 0;

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      canvas.width = isRotated ? h : w;
      canvas.height = isRotated ? w : h;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotAngle * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2);
        ctx.restore();
      }

      sourceCanvasRef.current = canvas;
      setNaturalWidth(canvas.width);
      setNaturalHeight(canvas.height);
      setImageLoaded(true);
    } catch (err) {
      console.error("Failed to initialize source canvas:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    initSourceCanvas(initialDataUrl, rotation);
  }, [initialDataUrl, rotation, initSourceCanvas]);

  // Reset selection area
  const handleResetSelection = () => {
    setSelection({
      x: 10,
      y: 10,
      width: 35,
      height: 80,
    });
  };

  // Rotate image 90 degrees
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    handleResetSelection();
  };

  // Helper: Calculate pixel crop rect from percentage selection
  const getCropPixelRect = useCallback(() => {
    if (!naturalWidth || !naturalHeight) return null;

    const sx = Math.max(0, Math.min(naturalWidth - 10, (selection.x / 100) * naturalWidth));
    const sy = Math.max(0, Math.min(naturalHeight - 10, (selection.y / 100) * naturalHeight));
    const sw = Math.max(20, Math.min(naturalWidth - sx, (selection.width / 100) * naturalWidth));
    const sh = Math.max(20, Math.min(naturalHeight - sy, (selection.height / 100) * naturalHeight));

    return {
      x: Math.round(sx),
      y: Math.round(sy),
      width: Math.round(sw),
      height: Math.round(sh),
    };
  }, [naturalWidth, naturalHeight, selection]);

  // Check if selection meets minimum pixel threshold
  const isSelectionValid = useCallback(() => {
    const rect = getCropPixelRect();
    if (!rect) return false;
    return rect.width >= 30 && rect.height >= 30;
  }, [getCropPixelRect]);

  // Generate cropped canvas and base64
  const generateCroppedImage = useCallback(async (): Promise<{
    dataUrl: string;
    cleanBase64: string;
  } | null> => {
    if (!sourceCanvasRef.current || !naturalWidth || !naturalHeight) return null;

    const cropRect = getCropPixelRect();
    if (!cropRect) return null;

    // Convert cropRect to normalized 0..1 values for applyImageAdjustments
    const normCrop = {
      x: cropRect.x / naturalWidth,
      y: cropRect.y / naturalHeight,
      width: cropRect.width / naturalWidth,
      height: cropRect.height / naturalHeight,
    };

    const res = await applyImageAdjustments(sourceCanvasRef.current, {
      rotation: 0, // Source canvas is already rotated
      documentMode,
      brightness: 10,
      contrast: 15,
      cropRect: normCrop,
    });

    return {
      dataUrl: res.dataUrl,
      cleanBase64: res.base64Clean,
    };
  }, [naturalWidth, naturalHeight, getCropPixelRect, documentMode]);

  // Open Preview Modal
  const handleOpenPreview = async () => {
    setIsProcessing(true);
    try {
      const cropped = await generateCroppedImage();
      if (cropped) {
        setPreviewCroppedUrl(cropped.dataUrl);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      console.error("Failed to generate preview crop:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit ROI Crop to OCR
  const handleSubmitOcr = async () => {
    setIsProcessing(true);
    try {
      const cropped = await generateCroppedImage();
      if (cropped) {
        onConfirm(cropped.cleanBase64, cropped.dataUrl);
      }
    } catch (err) {
      console.error("Failed to process cropped OCR image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Pointer Event Handlers for Dragging ROI Box ---
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: DragMode
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    setDragMode(mode);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    startSelectionRef.current = { ...selection };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMode || !imgRef.current) return;

    const imgRect = imgRef.current.getBoundingClientRect();
    if (imgRect.width <= 0 || imgRect.height <= 0) return;

    // Calculate delta in percentage relative to rendered image display width & height
    const deltaXPercent = ((e.clientX - dragStartPosRef.current.x) / imgRect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPosRef.current.y) / imgRect.height) * 100;

    const start = startSelectionRef.current;
    let nextX = start.x;
    let nextY = start.y;
    let nextW = start.width;
    let nextH = start.height;

    const minW = 5; // Minimum 5% width
    const minH = 5; // Minimum 5% height

    switch (dragMode) {
      case "move":
        nextX = Math.max(0, Math.min(100 - start.width, start.x + deltaXPercent));
        nextY = Math.max(0, Math.min(100 - start.height, start.y + deltaYPercent));
        break;

      case "nw":
        nextX = Math.max(0, Math.min(start.x + start.width - minW, start.x + deltaXPercent));
        nextY = Math.max(0, Math.min(start.y + start.height - minH, start.y + deltaYPercent));
        nextW = start.x + start.width - nextX;
        nextH = start.y + start.height - nextY;
        break;

      case "ne":
        nextW = Math.max(minW, Math.min(100 - start.x, start.width + deltaXPercent));
        nextY = Math.max(0, Math.min(start.y + start.height - minH, start.y + deltaYPercent));
        nextH = start.y + start.height - nextY;
        break;

      case "sw":
        nextX = Math.max(0, Math.min(start.x + start.width - minW, start.x + deltaXPercent));
        nextW = start.x + start.width - nextX;
        nextH = Math.max(minH, Math.min(100 - start.y, start.height + deltaYPercent));
        break;

      case "se":
        nextW = Math.max(minW, Math.min(100 - start.x, start.width + deltaXPercent));
        nextH = Math.max(minH, Math.min(100 - start.y, start.height + deltaYPercent));
        break;

      case "n":
        nextY = Math.max(0, Math.min(start.y + start.height - minH, start.y + deltaYPercent));
        nextH = start.y + start.height - nextY;
        break;

      case "s":
        nextH = Math.max(minH, Math.min(100 - start.y, start.height + deltaYPercent));
        break;

      case "w":
        nextX = Math.max(0, Math.min(start.x + start.width - minW, start.x + deltaXPercent));
        nextW = start.x + start.width - nextX;
        break;

      case "e":
        nextW = Math.max(minW, Math.min(100 - start.x, start.width + deltaXPercent));
        break;
    }

    setSelection({
      x: Math.round(nextX * 100) / 100,
      y: Math.round(nextY * 100) / 100,
      width: Math.round(nextW * 100) / 100,
      height: Math.round(nextH * 100) / 100,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode) {
      try {
        const target = e.currentTarget as HTMLElement;
        target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // pointer capture released
      }
      setDragMode(null);
    }
  };

  // Convert current source canvas to dataURL for image src rendering
  const displaySrc = sourceCanvasRef.current
    ? sourceCanvasRef.current.toDataURL("image/jpeg", 0.9)
    : initialDataUrl;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-5 shadow-2xl max-w-4xl mx-auto my-3 border border-slate-800 space-y-4">
      {/* Top Header & Instruction Banner */}
      <div className="space-y-2 border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-teal-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              품목코드 영역 선택
            </h2>
          </div>

          <button
            onClick={onRetake}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            다시 촬영
          </button>
        </div>

        <div className="bg-teal-950/80 border border-teal-800/80 p-3 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-200 leading-relaxed font-medium">
            <p className="font-bold text-teal-300">
              품목코드가 있는 영역을 선택해주세요.
            </p>
            <p className="text-[11px] text-teal-200/90 mt-0.5">
              품목코드가 있는 열 전체를 선택해주세요. Lot No, Serial No, 유효기간, 보험코드는 포함하지 않는 것이 좋습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage with ROI Overlay */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden min-h-[300px] max-h-[520px] flex items-center justify-center p-2 select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl">
              <RefreshCw className="w-4 h-4 animate-spin" />
              크롭 및 OCR 처리 준비 중...
            </div>
          </div>
        )}

        {/* Display Image Container */}
        <div
          className="relative inline-block max-w-full max-h-[480px] overflow-visible transition-transform duration-150"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            ref={imgRef}
            src={displaySrc}
            alt="OCR 대상 문서"
            onLoad={() => setImageLoaded(true)}
            className="max-h-[480px] w-auto h-auto object-contain block mx-auto pointer-events-none rounded"
          />

          {imageLoaded && (
            <>
              {/* Semi-transparent dark overlays outside ROI */}
              {/* Top overlay */}
              <div
                className="absolute left-0 top-0 w-full bg-black/60 pointer-events-none"
                style={{ height: `${selection.y}%` }}
              />
              {/* Bottom overlay */}
              <div
                className="absolute left-0 w-full bg-black/60 pointer-events-none"
                style={{
                  top: `${selection.y + selection.height}%`,
                  bottom: 0,
                }}
              />
              {/* Left overlay */}
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  top: `${selection.y}%`,
                  height: `${selection.height}%`,
                  left: 0,
                  width: `${selection.x}%`,
                }}
              />
              {/* Right overlay */}
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  top: `${selection.y}%`,
                  height: `${selection.height}%`,
                  left: `${selection.x + selection.width}%`,
                  right: 0,
                }}
              />

              {/* Selection Rectangle Box */}
              <div
                className="absolute border-2 border-teal-400 bg-teal-400/10 shadow-lg cursor-move transition-shadow"
                style={{
                  left: `${selection.x}%`,
                  top: `${selection.y}%`,
                  width: `${selection.width}%`,
                  height: `${selection.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "move")}
              >
                {/* Top Badge Label */}
                <div className="absolute -top-6 left-0 bg-teal-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-t-md whitespace-nowrap shadow-md pointer-events-none flex items-center gap-1">
                  <Crop className="w-3 h-3" />
                  <span>품목코드 OCR 영역</span>
                </div>

                {/* Corner Handles (Minimum touch target 44px, visual handle 28px) */}
                {/* NW Top-Left */}
                <div
                  className="absolute -top-3.5 -left-3.5 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "nw")}
                >
                  <div className="w-5 h-5 bg-teal-400 border-2 border-white rounded-full shadow-md" />
                </div>

                {/* NE Top-Right */}
                <div
                  className="absolute -top-3.5 -right-3.5 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "ne")}
                >
                  <div className="w-5 h-5 bg-teal-400 border-2 border-white rounded-full shadow-md" />
                </div>

                {/* SW Bottom-Left */}
                <div
                  className="absolute -bottom-3.5 -left-3.5 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "sw")}
                >
                  <div className="w-5 h-5 bg-teal-400 border-2 border-white rounded-full shadow-md" />
                </div>

                {/* SE Bottom-Right */}
                <div
                  className="absolute -bottom-3.5 -right-3.5 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "se")}
                >
                  <div className="w-5 h-5 bg-teal-400 border-2 border-white rounded-full shadow-md" />
                </div>

                {/* Edge Handles */}
                {/* N Top Edge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-ns-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "n")}
                >
                  <div className="w-8 h-2 bg-teal-400 border border-white rounded-full shadow-md" />
                </div>

                {/* S Bottom Edge */}
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-ns-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "s")}
                >
                  <div className="w-8 h-2 bg-teal-400 border border-white rounded-full shadow-md" />
                </div>

                {/* W Left Edge */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-12 flex items-center justify-center cursor-ew-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "w")}
                >
                  <div className="w-2 h-8 bg-teal-400 border border-white rounded-full shadow-md" />
                </div>

                {/* E Right Edge */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-12 flex items-center justify-center cursor-ew-resize z-20 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, "e")}
                >
                  <div className="w-2 h-8 bg-teal-400 border border-white rounded-full shadow-md" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-700/80 shadow-lg z-20">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
            className="p-1 text-slate-300 hover:text-white"
            title="축소"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
            className="p-1 text-slate-300 hover:text-white"
            title="확대"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRotate}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700/80 flex items-center gap-1.5 transition-colors"
          >
            <RotateIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>이미지 90° 회전</span>
          </button>

          <button
            onClick={handleResetSelection}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700/80 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>영역 초기화</span>
          </button>

          <button
            onClick={() => setDocumentMode(!documentMode)}
            className={`px-3 py-2 rounded-xl font-semibold border transition-all flex items-center gap-1.5 ${
              documentMode
                ? "bg-teal-950 text-teal-300 border-teal-600 shadow-xs"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>문서 선명도 {documentMode ? "ON" : "OFF"}</span>
          </button>
        </div>

        <button
          onClick={handleOpenPreview}
          disabled={!isSelectionValid() || isProcessing}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold rounded-xl border border-teal-800/80 flex items-center gap-1.5 transition-colors disabled:opacity-40"
        >
          <Eye className="w-4 h-4" />
          <span>선택 영역 미리보기</span>
        </button>
      </div>

      {/* Main Action Buttons Bar with Safe Area Bottom */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5 pb-[env(safe-area-inset-bottom,0px)]">
        <button
          onClick={onRetake}
          className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-colors text-center"
        >
          다시 촬영
        </button>

        <button
          onClick={handleSubmitOcr}
          disabled={!isSelectionValid() || isProcessing}
          className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="w-5 h-5" />
          <span>선택 영역 OCR 시작</span>
        </button>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <CropPreviewModal
          cropDataUrl={previewCroppedUrl}
          onClose={() => setIsPreviewOpen(false)}
          onConfirmOcr={handleSubmitOcr}
        />
      )}
    </div>
  );
};
