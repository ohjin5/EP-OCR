import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Database,
  Building,
  FileText,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  InspectionResult as IInspectionResult,
  InspectionTableRow,
  RESULT_LABELS,
  MATCH_STATUS_LABEL,
} from "../types/api";
import { InspectionResultTable } from "./InspectionResultTable";
import { OcrCropImageModal } from "./OcrCropImageModal";
import { formatKoreanDateTime } from "../utils/dateUtils";

interface InspectionResultProps {
  result: IInspectionResult;
  tableRows?: InspectionTableRow[];
  croppedDataUrl?: string;
  onNewInspection: () => void;
  onReinspectSamePhoto: () => void;
  onViewReferenceData: () => void;
}

export const InspectionResult: React.FC<InspectionResultProps> = ({
  result,
  tableRows: initialTableRows,
  croppedDataUrl,
  onNewInspection,
  onReinspectSamePhoto,
  onViewReferenceData,
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isRawTextOpen, setIsRawTextOpen] = useState<boolean>(false);

  // Reconstruct table rows if not passed directly
  const rows: InspectionTableRow[] = useMemo(() => {
    if (initialTableRows && initialTableRows.length > 0) {
      return initialTableRows;
    }

    if (result.inspectionRows && result.inspectionRows.length > 0) {
      return result.inspectionRows;
    }

    // Build from result.exactMatches, result.similarMatches, or matched list
    const constructed: InspectionTableRow[] = [];

    if (result.exactMatches) {
      result.exactMatches.forEach((m) => {
        constructed.push({
          sheetName: m.reference.sheetName,
          model: m.reference.model,
          itemName: m.reference.itemName || "-",
          specification: m.reference.specification || "-",
          itemCode: m.reference.itemCode || "-",
          manufacturer: m.reference.manufacturer || "-",
          ediCode: m.reference.ediCode || "-",
          vendor: result.vendor || "-",
          status: "matched",
        });
      });
    }

    if (result.similarMatches) {
      result.similarMatches.forEach((m) => {
        constructed.push({
          sheetName: m.reference.sheetName,
          model: m.reference.model,
          itemName: m.reference.itemName || "-",
          specification: m.reference.specification || "-",
          itemCode: m.reference.itemCode || "-",
          manufacturer: m.reference.manufacturer || "-",
          ediCode: m.reference.ediCode || "-",
          vendor: result.vendor || "-",
          status: "matched",
        });
      });
    }

    // Fallback if structured matches weren't saved
    if (constructed.length === 0 && result.matched) {
      result.matched.forEach((mod) => {
        constructed.push({
          sheetName: result.sheetName,
          model: mod,
          itemName: "-",
          specification: "-",
          itemCode: "-",
          manufacturer: "-",
          ediCode: "-",
          vendor: result.vendor || "-",
          status: "matched",
        });
      });
    }

    return constructed;
  }, [initialTableRows, result]);

  const verdictBadgeStyle = {
    일치: "bg-emerald-500 text-slate-950 border-emerald-400",
    "확인 필요": "bg-amber-400 text-slate-950 border-amber-300",
    부분일치: "bg-amber-400 text-slate-950 border-amber-300",
    불일치: "bg-rose-500 text-white border-rose-400",
    "OCR 인식 실패": "bg-slate-700 text-slate-200 border-slate-600",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 my-4 px-2 sm:px-0">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold">검수 완료 결과</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Google Sheet 검수 이력에 저장이 완료되었습니다.
            </p>
          </div>

          <span
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border self-start sm:self-auto shrink-0 ${
              verdictBadgeStyle[result.verdict] || verdictBadgeStyle["불일치"]
            }`}
          >
            판정: {result.verdict}
          </span>
        </div>

        {/* Cropped Image & Details Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs items-center">
          {croppedDataUrl && (
            <div
              onClick={() => setIsImageModalOpen(true)}
              className="sm:col-span-1 bg-slate-950 p-1.5 rounded-xl border border-slate-700 flex items-center justify-center cursor-pointer group hover:border-teal-400 transition-all relative overflow-hidden"
              title="클릭하여 선택 영역 크게 보기"
            >
              <img
                src={croppedDataUrl}
                alt="OCR 크롭 이미지"
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
            } grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300`}
          >
            <div>
              <span className="text-slate-400 block">검수시각:</span>
              <span className="font-semibold text-white">
                {formatKoreanDateTime(result.inspectedAt || new Date().toISOString())}
              </span>
            </div>

            {result.vendor && (
              <div>
                <span className="text-slate-400 block">업체명:</span>
                <span className="font-semibold text-white">{result.vendor}</span>
              </div>
            )}

            {result.historyId && (
              <div className="sm:col-span-2 text-[11px] text-slate-400 font-mono">
                이력 ID: {result.historyId}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Excel Data Table for Desktop & Mobile */}
      <InspectionResultTable
        rows={rows}
        isInteractive={false}
        title="최종 확정된 기준데이터 검수 목록"
        showSheetColumn={true}
      />

      {/* Raw OCR Text Collapsible */}
      {result.ocrText && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsRawTextOpen(!isRawTextOpen)}
            className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700">
              OCR 추출 텍스트 원문 ({result.ocrText.length}자)
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
              {result.ocrText}
            </div>
          )}
        </div>
      )}

      {/* Actions Bottom Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReinspectSamePhoto}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>동일 사진 다시 검수</span>
          </button>

          <button
            type="button"
            onClick={onViewReferenceData}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>기준데이터 조회</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNewInspection}
          className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>새 검수 시작</span>
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
