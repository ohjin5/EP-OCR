import React, { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";

interface OcrCropImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const OcrCropImageModal: React.FC<OcrCropImageModalProps> = ({
  imageUrl,
  onClose,
}) => {
  const [scale, setScale] = useState<number>(1);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                OCR 분석 대상 영역 (선택 이미지)
              </h3>
              <p className="text-[11px] text-slate-400">
                실제 OCR 문자 인식에 전달된 크롭 이미지입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 mr-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                title="축소"
                aria-label="축소"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold px-2 text-slate-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                title="확대"
                aria-label="확대"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors border-l border-slate-700 ml-0.5"
                title="원본 크기"
                aria-label="원본 크기"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] max-h-[70vh] bg-slate-950/50">
          <div className="transition-transform duration-150 ease-out flex items-center justify-center">
            <img
              src={imageUrl}
              alt="OCR 선택 영역 확대"
              style={{ transform: `scale(${scale})` }}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg border border-slate-800"
            />
          </div>
        </div>

        {/* Footer controls for mobile */}
        <div className="sm:hidden flex items-center justify-between px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="px-2.5 py-1 bg-slate-800 rounded-lg font-bold disabled:opacity-30"
            >
              -
            </button>
            <span className="font-mono">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="px-2.5 py-1 bg-slate-800 rounded-lg font-bold disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
