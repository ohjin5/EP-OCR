import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Building,
  FileText,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ExactModelMatch,
  SimilarModelMatch,
  ModelMatchingResult,
  InspectionVerdict,
  InspectionTableRow,
  RESULT_LABELS,
  MATCH_STATUS_LABEL,
} from "../types/api";
import { InspectionResultTable } from "./InspectionResultTable";
import { OcrCropImageModal } from "./OcrCropImageModal";

interface OcrRecognitionReviewProps {
  ocrText: string;
  matchResult: ModelMatchingResult;
  vendor: string;
  surgeryDate: string;
  memo: string;
  croppedDataUrl: string;
  onConfirm: (
    selectedExact: ExactModelMatch[],
    selectedSimilar: SimilarModelMatch[],
    unmatched: string[],
    verdict: InspectionVerdict,
    tableRows: InspectionTableRow[]
  ) => void;
  onRetakeOrRecrop: () => void;
}

export const OcrRecognitionReview: React.FC<OcrRecognitionReviewProps> = ({
  ocrText,
  matchResult,
  vendor,
  surgeryDate,
  memo,
  croppedDataUrl,
  onConfirm,
  onRetakeOrRecrop,
}) => {
  // Modal state for viewing enlarged crop image
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);

  // Checkbox state for exact matches (default: all checked)
  const [selectedExactKeys, setSelectedExactKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    matchResult.exactMatches.forEach((m) => {
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}`;
      initial.add(key);
    });
    return initial;
  });

  // Checkbox state for similar matches (default: all checked if distance is 1 or user can toggle)
  const [selectedSimilarKeys, setSelectedSimilarKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    matchResult.similarMatches.forEach((m) => {
      // By default, if distance is 1, let's pre-check or let user review
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}-${m.ocrCandidate}`;
      initial.add(key);
    });
    return initial;
  });

  // Collapsible state for raw text
  const [isRawTextOpen, setIsRawTextOpen] = useState<boolean>(false);

  // Toggle exact match selection
  const handleToggleExact = (key: string) => {
    setSelectedExactKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle similar match selection
  const handleToggleSimilar = (key: string) => {
    setSelectedSimilarKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Filter confirmed items
  const confirmedExactMatches = useMemo(() => {
    return matchResult.exactMatches.filter((m) => {
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}`;
      return selectedExactKeys.has(key);
    });
  }, [matchResult.exactMatches, selectedExactKeys]);

  const confirmedSimilarMatches = useMemo(() => {
    return matchResult.similarMatches.filter((m) => {
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}-${m.ocrCandidate}`;
      return selectedSimilarKeys.has(key);
    });
  }, [matchResult.similarMatches, selectedSimilarKeys]);

  // Build unified InspectionTableRow[] for target items identified in this session
  const tableRows: InspectionTableRow[] = useMemo(() => {
    const rows: InspectionTableRow[] = [];

    // 1. Exact Matches
    matchResult.exactMatches.forEach((m) => {
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}`;
      const isSelected = selectedExactKeys.has(key);
      rows.push({
        sheetName: m.reference.sheetName,
        model: m.reference.model,
        itemName: m.reference.itemName || "-",
        specification: m.reference.specification || "-",
        itemCode: m.reference.itemCode || "-",
        manufacturer: m.reference.manufacturer || "-",
        ediCode: m.reference.ediCode || "-",
        vendor: m.reference.vendor || vendor || "-",
        status: isSelected ? "matched" : "unmatched",
      });
    });

    // 2. Similar Matches
    matchResult.similarMatches.forEach((m) => {
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}-${m.ocrCandidate}`;
      const isSelected = selectedSimilarKeys.has(key);
      rows.push({
        sheetName: m.reference.sheetName,
        model: m.reference.model,
        itemName: m.reference.itemName || "-",
        specification: m.reference.specification || "-",
        itemCode: m.reference.itemCode || "-",
        manufacturer: m.reference.manufacturer || "-",
        ediCode: m.reference.ediCode || "-",
        vendor: m.reference.vendor || vendor || "-",
        status: isSelected ? "matched" : "unmatched",
      });
    });

    return rows;
  }, [
    matchResult.exactMatches,
    matchResult.similarMatches,
    selectedExactKeys,
    selectedSimilarKeys,
    vendor,
  ]);

  // Calculate dynamic overall verdict
  const matchedRowsCount = tableRows.filter((r) => r.status === "matched").length;
  let dynamicVerdict: InspectionVerdict = "불일치";

  if (!ocrText || ocrText.trim().length === 0) {
    dynamicVerdict = "OCR 인식 실패";
  } else if (matchedRowsCount > 0 && matchedRowsCount === tableRows.length) {
    dynamicVerdict = "일치";
  } else if (matchedRowsCount > 0) {
    dynamicVerdict = "확인 필요";
  } else {
    dynamicVerdict = "불일치";
  }

  // Handle status toggle from the table
  const handleToggleRowStatus = (modelName: string) => {
    // Find in exact matches
    const exact = matchResult.exactMatches.find((m) => m.reference.model === modelName);
    if (exact) {
      const key = `${exact.reference.sheetName}-${exact.reference.rowNumber}-${exact.reference.model}`;
      handleToggleExact(key);
      return;
    }
    // Find in similar matches
    const similar = matchResult.similarMatches.find((m) => m.reference.model === modelName);
    if (similar) {
      const key = `${similar.reference.sheetName}-${similar.reference.rowNumber}-${similar.reference.model}-${similar.ocrCandidate}`;
      handleToggleSimilar(key);
    }
  };

  // Submit Final Confirmation
  const handleConfirmSubmit = () => {
    onConfirm(
      confirmedExactMatches,
      confirmedSimilarMatches,
      matchResult.unmatchedCandidates,
      dynamicVerdict,
      tableRows
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 my-4 px-2 sm:px-0">
      {/* Top Banner Notice */}
      <div className="bg-teal-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-teal-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">OCR 인식 확인</h2>
            </div>
            <p className="text-xs text-teal-200 mt-1">
              인식된 기준데이터 항목과 일치 여부를 확인 후 [검수 결과 확정]을 눌러주세요.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border shrink-0 ${
              dynamicVerdict === "일치"
                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                : dynamicVerdict === "확인 필요"
                ? "bg-amber-400 text-slate-950 border-amber-300"
                : "bg-rose-500 text-white border-rose-400"
            }`}
          >
            {dynamicVerdict}
          </span>
        </div>

        {/* Cropped Image Thumbnail & Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-teal-800/80 text-xs items-center">
          {croppedDataUrl && (
            <div
              onClick={() => setIsImageModalOpen(true)}
              className="sm:col-span-1 bg-slate-950/80 p-1.5 rounded-xl border border-teal-700/80 flex items-center justify-center cursor-pointer group hover:border-teal-400 transition-all relative overflow-hidden"
              title="클릭하여 선택 영역 크게 보기"
            >
              <img
                src={croppedDataUrl}
                alt="OCR 선택 영역"
                className="max-h-16 object-contain rounded"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white text-[11px] font-bold transition-opacity">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>확대</span>
              </div>
            </div>
          )}

          <div
            className={`${
              croppedDataUrl ? "sm:col-span-3" : "sm:col-span-4"
            } space-y-1 text-teal-200 flex flex-col justify-center`}
          >
            {vendor && (
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>
                  업체명: <strong className="text-white">{vendor}</strong>
                </span>
              </div>
            )}
            {memo && (
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>
                  메모: <span className="text-teal-100">{memo}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Inspection Result Table (Excel Data Table View) */}
      <InspectionResultTable
        rows={tableRows}
        onToggleStatus={handleToggleRowStatus}
        isInteractive={true}
        title="OCR 인식 및 기준데이터 매칭 결과"
        showSheetColumn={true}
      />

      {/* Similar Candidate Clarification Hint Section if any */}
      {matchResult.similarMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>유사 후보 알림 ({matchResult.similarMatches.length}건)</span>
          </div>
          <p className="text-amber-800">
            문자 유사도(0 ↔ O, 1 ↔ I 등)에 따라 감지된 후보입니다. 위 표에서 상태를 클릭하여 [일치/불일치]를 직접 변경할 수 있습니다.
          </p>
          <div className="space-y-1.5 pt-1">
            {matchResult.similarMatches.map((sim, idx) => (
              <div
                key={idx}
                className="bg-white/80 p-2 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-500 line-through">
                    OCR 인식: {sim.ocrCandidate}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-mono font-bold text-amber-900">
                    기준 모델: {sim.reference.model} ({sim.reference.sheetName})
                  </span>
                </div>
                <span className="text-[11px] text-slate-600">
                  {sim.reference.itemName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Raw Text Accordion (Clean and minimal) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setIsRawTextOpen(!isRawTextOpen)}
          className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <span className="text-xs font-bold text-slate-700">
            OCR 전체 추출 텍스트 원문 ({ocrText?.length || 0}자)
          </span>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <span>{isRawTextOpen ? "접기" : "원문 보기"}</span>
            {isRawTextOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {isRawTextOpen && (
          <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs whitespace-pre-wrap rounded-b-2xl max-h-48 overflow-y-auto">
            {ocrText || "추출된 OCR 텍스트가 없습니다."}
          </div>
        )}
      </div>

      {/* Main Action Bar */}
      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onRetakeOrRecrop}
          className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>영역 다시 선택 / 재촬영</span>
        </button>

        <button
          type="button"
          onClick={handleConfirmSubmit}
          className="w-full sm:w-auto px-7 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-5 h-5" />
          <span>검수 결과 확정 ({matchedRowsCount}건 일치)</span>
        </button>
      </div>

      {/* Enlarged Crop Image Modal */}
      {isImageModalOpen && croppedDataUrl && (
        <OcrCropImageModal
          imageUrl={croppedDataUrl}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
    </div>
  );
};
