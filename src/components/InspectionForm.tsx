import React, { useRef, useState } from "react";
import { Camera, Upload, AlertCircle, RefreshCw, Calendar, Building, FileText, CheckCircle } from "lucide-react";
import { ProductGroup } from "../types/api";
import { getTodayDateString } from "../utils/dateUtils";
import { readFileAsDataUrl } from "../utils/imageUtils";

interface InspectionFormProps {
  productGroups: ProductGroup[];
  isLoadingGroups: boolean;
  groupError: string | null;
  selectedGroup: string;
  vendor: string;
  surgeryDate: string;
  memo: string;
  onSelectGroup: (group: string) => void;
  onChangeVendor: (vendor: string) => void;
  onChangeSurgeryDate: (date: string) => void;
  onChangeMemo: (memo: string) => void;
  onRetryLoadGroups: () => void;
  onStartCamera: () => void;
  onFileSelected: (dataUrl: string) => void;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({
  productGroups,
  isLoadingGroups,
  groupError,
  selectedGroup,
  vendor,
  surgeryDate,
  memo,
  onSelectGroup,
  onChangeVendor,
  onChangeSurgeryDate,
  onChangeMemo,
  onRetryLoadGroups,
  onStartCamera,
  onFileSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for HEIC format warning
    if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
      setFileError(
        "HEIC 형식은 브라우저에 따라 읽을 수 없을 수 있습니다. 카메라 설정에서 JPG로 전환하거나 다른 사진을 선택해 주세요."
      );
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onFileSelected(dataUrl);
    } catch (err) {
      setFileError("파일을 읽을 수 없습니다. 다시 선택해 주세요.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const selectedGroupInfo = productGroups.find((g) => g.sheetName === selectedGroup);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200 max-w-2xl mx-auto my-4 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>검수 조건 설정</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          제품군과 수술/거래처 정보를 입력한 후 촬영을 시작해 주세요.
        </p>
      </div>

      {/* Product Group Dropdown */}
      <div className="space-y-1.5">
        <label htmlFor="productGroupSelect" className="block text-xs font-bold text-slate-700">
          제품군 선택 <span className="text-rose-500">*</span>
        </label>

        {isLoadingGroups ? (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            <span>제품군 목록을 불러오는 중입니다...</span>
          </div>
        ) : groupError ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{groupError}</span>
            </div>
            <button
              onClick={onRetryLoadGroups}
              className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 rounded-lg border border-rose-300 font-semibold transition-colors shrink-0"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <select
            id="productGroupSelect"
            value={selectedGroup}
            onChange={(e) => onSelectGroup(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
          >
            {productGroups.map((group) => (
              <option key={group.sheetName} value={group.sheetName}>
                {group.displayName} (모델 {group.modelCount}개)
              </option>
            ))}
          </select>
        )}

        {selectedGroupInfo && (
          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium pl-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>선택된 제품군: {selectedGroupInfo.displayName} (기준 모델 {selectedGroupInfo.modelCount}개)</span>
          </div>
        )}
      </div>

      {/* Vendor & Surgery Date Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="vendorInput" className="block text-xs font-bold text-slate-700">
            업체명 (거래처)
          </label>
          <div className="relative">
            <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              id="vendorInput"
              type="text"
              value={vendor}
              onChange={(e) => onChangeVendor(e.target.value)}
              placeholder="예: 오페라살루따리스(주)"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="surgeryDateInput" className="block text-xs font-bold text-slate-700">
            수술일 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              id="surgeryDateInput"
              type="date"
              value={surgeryDate || getTodayDateString()}
              onChange={(e) => onChangeSurgeryDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Memo Input */}
      <div className="space-y-1.5">
        <label htmlFor="memoInput" className="block text-xs font-bold text-slate-700">
          메모
        </label>
        <div className="relative">
          <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            id="memoInput"
            type="text"
            value={memo}
            onChange={(e) => onChangeMemo(e.target.value)}
            placeholder="검수 관련 참고 사항 입력"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* File format warning if any */}
      {fileError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Action Mode Buttons */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <label className="block text-xs font-bold text-slate-700">검수 촬영 방식 선택</label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Main Primary Camera Button */}
          <button
            type="button"
            onClick={onStartCamera}
            disabled={!selectedGroup || isLoadingGroups}
            className="py-4 px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-base shadow-md shadow-teal-900/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Camera className="w-6 h-6" />
            <span>카메라로 실시간 촬영</span>
          </button>

          {/* Secondary File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedGroup || isLoadingGroups}
            className="py-4 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-800 font-bold text-base border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Upload className="w-5 h-5 text-slate-600" />
            <span>사진 파일 선택</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
