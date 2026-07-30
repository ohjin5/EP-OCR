import React from "react";
import { X, Check, ArrowLeft, Crop, AlertCircle } from "lucide-react";

interface CropPreviewModalProps {
  cropDataUrl: string;
  onClose: () => void;
  onConfirmOcr: () => void;
}

export const CropPreviewModal: React.FC<CropPreviewModalProps> = ({
  cropDataUrl,
  onClose,
  onConfirmOcr,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-teal-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              선택 영역 크롭 미리보기
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Message */}
        <div className="bg-teal-950/60 border border-teal-800/80 p-3 rounded-xl mb-3 flex items-start gap-2.5 shrink-0">
          <AlertCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-200 font-medium leading-relaxed">
            <span className="font-bold text-teal-300">품목코드 열만 포함되어 있는지 확인해주세요.</span>
            <br />
            Lot No, Serial No, 유효기간, 보험코드가 함께 포함되어 있다면 [영역 다시 조정]을 눌러 선택 영역을 좁혀주세요.
          </p>
        </div>

        {/* Cropped Image Viewport */}
        <div className="flex-1 min-h-[160px] bg-slate-950 rounded-xl overflow-auto border border-slate-800 p-2 flex items-center justify-center">
          <img
            src={cropDataUrl}
            alt="크롭 영역 미리보기"
            className="max-h-[360px] w-auto h-auto object-contain rounded border border-slate-800 shadow-md"
          />
        </div>

        {/* Footer Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            영역 다시 조정
          </button>

          <button
            onClick={() => {
              onConfirmOcr();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-900/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            선택 영역 OCR 시작
          </button>
        </div>
      </div>
    </div>
  );
};
