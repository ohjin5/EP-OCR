import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  PlusCircle,
  Database,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  CheckSquare,
  Square,
  Undo2,
  Save,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import {
  InspectionResult as IInspectionResult,
  EditableOcrCode,
  CodeStatus,
} from "../types/api";
import { ResultCodeList } from "./ResultCodeList";
import { formatKoreanDate } from "../utils/dateUtils";
import {
  extractCandidateCodes,
  normalizeCode,
  recalculateCodeList,
  compareCandidateCodes,
} from "../utils/codeExtractor";
import { getModels, finalizeInspection } from "../services/appsScriptApi";

interface InspectionResultProps {
  result: IInspectionResult;
  croppedDataUrl?: string;
  onNewInspection: () => void;
  onReinspectSamePhoto: () => void;
  onViewReferenceData: () => void;
}

const STATUS_BADGE_CONFIG: Record<
  CodeStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  matched: {
    label: "기준 일치",
    bg: "bg-emerald-100",
    text: "text-emerald-800 font-bold",
    border: "border-emerald-300",
  },
  unmatched: {
    label: "기준 없음",
    bg: "bg-amber-100",
    text: "text-amber-800 font-bold",
    border: "border-amber-300",
  },
  duplicate: {
    label: "중복",
    bg: "bg-purple-100",
    text: "text-purple-800 font-bold",
    border: "border-purple-300",
  },
  empty: {
    label: "빈 값",
    bg: "bg-slate-100",
    text: "text-slate-500 font-medium",
    border: "border-slate-300",
  },
  excluded: {
    label: "제외됨",
    bg: "bg-slate-100",
    text: "text-slate-400 font-normal line-through",
    border: "border-slate-200",
  },
};

export const InspectionResult: React.FC<InspectionResultProps> = ({
  result,
  croppedDataUrl,
  onNewInspection,
  onReinspectSamePhoto,
  onViewReferenceData,
}) => {
  const [showOcrText, setShowOcrText] = useState<boolean>(false);
  const [copiedOcr, setCopiedOcr] = useState<boolean>(false);

  // Reference models for dynamic recalculation
  const [refModels, setRefModels] = useState<string[]>([]);
  const [isLoadingRefModels, setIsLoadingRefModels] = useState<boolean>(true);

  // Finalize / Save state
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Extract raw candidate strings from OCR text
  const rawCandidates = useMemo(() => {
    const extracted = extractCandidateCodes(result.ocrText);
    const combined = new Set([...extracted, ...result.matched, ...result.extra]);
    return Array.from(combined);
  }, [result.ocrText, result.matched, result.extra]);

  // Initial editable items list state
  const [codeItems, setCodeItems] = useState<EditableOcrCode[]>([]);

  // Initialize code items when rawCandidates change
  useEffect(() => {
    const initialItems: EditableOcrCode[] = rawCandidates.map((cand, idx) => ({
      id: `item-${idx}-${cand}`,
      originalValue: cand,
      editedValue: cand,
      normalizedValue: normalizeCode(cand),
      selected: true,
      status: "unmatched",
    }));
    setCodeItems(initialItems);
    setIsSaved(false);
  }, [rawCandidates]);

  // Fetch reference models for the current sheet
  useEffect(() => {
    let isMounted = true;
    async function fetchRef() {
      if (!result.sheetName) return;
      setIsLoadingRefModels(true);
      try {
        const models = await getModels(result.sheetName);
        if (isMounted) setRefModels(models);
      } catch (err) {
        console.error("Failed to load reference models:", err);
      } finally {
        if (isMounted) setIsLoadingRefModels(false);
      }
    }
    fetchRef();
    return () => {
      isMounted = false;
    };
  }, [result.sheetName]);

  // Recalculate code items' statuses whenever codeItems or refModels change
  const processedCodeItems = useMemo(() => {
    return recalculateCodeList(codeItems, refModels);
  }, [codeItems, refModels]);

  // Compute overall comparison verdict & counts dynamically
  const computedComparison = useMemo(() => {
    // Collect active, non-empty, non-duplicate selected candidate strings for comparison
    const activeCandidates = processedCodeItems
      .filter(
        (item) =>
          item.selected &&
          item.status !== "empty" &&
          item.status !== "excluded" &&
          item.status !== "duplicate"
      )
      .map((item) => item.editedValue);

    if (refModels.length > 0) {
      return compareCandidateCodes(activeCandidates, refModels);
    }

    // Fallback using server initial response
    return {
      verdict: result.verdict,
      matched: result.matched,
      extra: result.extra,
      missing: result.missing,
      matchedCount: result.matchedCount,
      extraCount: result.extraCount,
      missingCount: result.missingCount,
      referenceCount: result.referenceCount,
    };
  }, [processedCodeItems, refModels, result]);

  // Handle single code input change
  const handleItemValueChange = (id: string, newValue: string) => {
    setCodeItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              editedValue: newValue,
              normalizedValue: normalizeCode(newValue),
            }
          : item
      )
    );
    setIsSaved(false);
    setSaveStatusMessage(null);
  };

  // Toggle single item checkbox
  const handleItemToggleSelect = (id: string) => {
    setCodeItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
    setIsSaved(false);
    setSaveStatusMessage(null);
  };

  // Restore single item to originalValue
  const handleRestoreItem = (id: string) => {
    setCodeItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              editedValue: item.originalValue,
              normalizedValue: normalizeCode(item.originalValue),
            }
          : item
      )
    );
    setIsSaved(false);
    setSaveStatusMessage(null);
  };

  // Add new blank candidate code row
  const handleAddCodeRow = () => {
    const newId = `new-item-${Date.now()}`;
    const newItem: EditableOcrCode = {
      id: newId,
      originalValue: "",
      editedValue: "",
      normalizedValue: "",
      selected: true,
      status: "empty",
    };
    setCodeItems((prev) => [...prev, newItem]);
    setIsSaved(false);
  };

  // Delete candidate row
  const handleDeleteCodeRow = (id: string) => {
    setCodeItems((prev) => prev.filter((item) => item.id !== id));
    setIsSaved(false);
  };

  // Bulk action: Restore ALL to original values
  const handleRestoreAll = () => {
    setCodeItems((prev) =>
      prev.map((item) => ({
        ...item,
        editedValue: item.originalValue,
        normalizedValue: normalizeCode(item.originalValue),
        selected: true,
      }))
    );
    setIsSaved(false);
    setSaveStatusMessage(null);
  };

  // Bulk action: Select ALL
  const handleSelectAll = () => {
    setCodeItems((prev) => prev.map((item) => ({ ...item, selected: true })));
    setIsSaved(false);
    setSaveStatusMessage(null);
  };

  // Bulk action: Unselect ALL
  const handleUnselectAll = () => {
    setCodeItems((prev) => prev.map((item) => ({ ...item, selected: false })));
    setIsSaved(false);
    setSaveStatusMessage(null);
  };

  // Force Refresh Comparison
  const handleRefreshComparison = () => {
    setCodeItems((prev) => [...prev]);
    setSaveStatusMessage({
      type: "success",
      text: "수정된 내용을 바탕으로 실시간 판정이 다시 계산되었습니다.",
    });
    setTimeout(() => setSaveStatusMessage(null), 3000);
  };

  // Finalize Inspection & Save to Google Sheet
  const handleFinalizeInspection = async () => {
    setIsSaving(true);
    setSaveStatusMessage(null);

    const activeEditedCodes = processedCodeItems
      .filter(
        (item) =>
          item.selected &&
          item.status !== "empty" &&
          item.status !== "excluded"
      )
      .map((item) => item.editedValue);

    try {
      const res = await finalizeInspection({
        historyId: result.historyId,
        sheetName: result.sheetName,
        editedCodes: activeEditedCodes,
        matched: computedComparison.matched,
        missing: computedComparison.missing,
        verdict: computedComparison.verdict,
      });

      if (res.success) {
        setIsSaved(true);
        setSaveStatusMessage({
          type: "success",
          text: "최종 검수 결과가 Google Sheet 이력에 저장되었습니다.",
        });
      } else {
        setSaveStatusMessage({
          type: "error",
          text: res.message || "최종 검수 이력 저장에 실패했습니다.",
        });
      }
    } catch (err) {
      console.error("Failed to finalize inspection:", err);
      setSaveStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "서버 통신 오류로 확정에 실패했습니다.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasDuplicateCodes = processedCodeItems.some(
    (item) => item.status === "duplicate"
  );

  const hasValidSelectedCodes = processedCodeItems.some(
    (item) => item.selected && item.status !== "empty" && item.status !== "excluded"
  );

  const verdictConfig = {
    일치: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-950",
      badge: "bg-emerald-600 text-white",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      title: "기준 데이터와 완벽히 일치합니다",
      subtitle: "선택된 모든 모델 코드가 검증되었습니다.",
    },
    부분일치: {
      bg: "bg-amber-50 border-amber-200 text-amber-950",
      badge: "bg-amber-600 text-white",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      title: "일부 모델이 누락되었거나 추가 코드가 있습니다",
      subtitle: "누락 항목과 추가 후보 코드를 확인해 주세요.",
    },
    불일치: {
      bg: "bg-rose-50 border-rose-200 text-rose-950",
      badge: "bg-rose-600 text-white",
      icon: XCircle,
      iconColor: "text-rose-600",
      title: "기준 모델을 확인하지 못했습니다",
      subtitle: "선택된 품목코드 중 기준 데이터와 일치하는 코드가 없습니다.",
    },
  };

  const currentVerdict =
    verdictConfig[computedComparison.verdict] || verdictConfig["불일치"];
  const VerdictIcon = currentVerdict.icon;

  const handleCopyOcr = () => {
    if (!result.ocrText) return;
    navigator.clipboard.writeText(result.ocrText);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 my-4 px-2 sm:px-0">
      {/* Save Notification Banner */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all ${
          isSaved
            ? "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs"
            : "bg-amber-50 border-amber-200 text-amber-900 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isSaved ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
          )}
          <span>
            {isSaved
              ? "최종 검수 결과가 저장되었습니다."
              : "수정 내용은 아직 저장되지 않았습니다. 검수 완료 후 [최종 검수 확정] 버튼을 눌러주세요."}
          </span>
        </div>

        {isSaved && (
          <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[11px] rounded-lg shrink-0">
            저장완료
          </span>
        )}
      </div>

      {/* Verdict Card */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-xs transition-all ${currentVerdict.bg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl bg-white shadow-2xs shrink-0 ${currentVerdict.iconColor}`}>
              <VerdictIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${currentVerdict.badge}`}>
                  {computedComparison.verdict}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {result.sheetName} {result.vendor ? `• ${result.vendor}` : ""}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold mt-1 text-slate-900">
                {currentVerdict.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {currentVerdict.subtitle}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 shrink-0 self-start sm:self-auto">
            <div>수술일: {formatKoreanDate(result.surgeryDate)}</div>
          </div>
        </div>
      </div>

      {/* Selected OCR Crop Preview Thumbnail & Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Cropped ROI Thumbnail */}
        {croppedDataUrl && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Crop className="w-4 h-4 text-teal-600" />
              <span>스캔한 OCR 영역</span>
            </div>
            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-200 h-28 flex items-center justify-center p-1">
              <img
                src={croppedDataUrl}
                alt="OCR 스캔 크롭 영역"
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              품목코드 영역만 크롭하여 OCR 전송됨
            </p>
          </div>
        )}

        {/* Right: Summary Metrics Grid */}
        <div className={`grid grid-cols-2 gap-3 ${croppedDataUrl ? "md:col-span-2" : "col-span-full"} grid-cols-2 sm:grid-cols-4`}>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center flex flex-col justify-center">
            <div className="text-[11px] font-semibold text-slate-500">기준 모델 수</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">
              {computedComparison.referenceCount}
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs text-center flex flex-col justify-center">
            <div className="text-[11px] font-semibold text-emerald-800">일치 모델</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">
              {computedComparison.matchedCount}
            </div>
          </div>

          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-2xs text-center flex flex-col justify-center">
            <div className="text-[11px] font-semibold text-rose-800">누락 모델</div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-0.5">
              {computedComparison.missingCount}
            </div>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-2xs text-center flex flex-col justify-center">
            <div className="text-[11px] font-semibold text-amber-800">추가 후보</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5">
              {computedComparison.extraCount}
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Code Editable Form Section ("추출 코드 확인 및 검수 조정") */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Header & Bulk Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-teal-600" />
              추출 코드 확인 및 검수 조정
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              OCR로 추출된 품목코드를 직접 수정, 체크 해제 또는 복원할 수 있습니다. 입력 변경 시 실시간으로 판정이 재계산됩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={handleRestoreAll}
              className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-1"
              title="모든 항목을 OCR 원본 값으로 복원합니다"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>전체 원본 복원</span>
            </button>

            <button
              onClick={handleSelectAll}
              className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
              <span>전체 선택</span>
            </button>

            <button
              onClick={handleUnselectAll}
              className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" />
              <span>전체 해제</span>
            </button>

            <button
              onClick={handleAddCodeRow}
              className="text-xs px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold rounded-xl border border-teal-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>코드 추가</span>
            </button>
          </div>
        </div>

        {/* Duplicate Notice Banner */}
        {hasDuplicateCodes && (
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="font-medium">
              <span className="font-bold">동일 코드가 여러 번 인식되었습니다.</span>{" "}
              중복 항목은 화면에 표시되나, 최종 검수 및 일치 개수에는 1건으로 자동 계산됩니다.
            </p>
          </div>
        )}

        {/* Status Message / Error Message Toast */}
        {saveStatusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              saveStatusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {saveStatusMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{saveStatusMessage.text}</span>
          </div>
        )}

        {/* Editable Items List */}
        {processedCodeItems.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 space-y-2">
            <p>OCR 결과에서 추출된 품목코드가 없습니다.</p>
            <button
              onClick={handleAddCodeRow}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              직접 품목코드 입력하기
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {processedCodeItems.map((item) => {
              const badge = STATUS_BADGE_CONFIG[item.status];
              const isEdited = item.editedValue !== item.originalValue;

              return (
                <div
                  key={item.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    item.selected
                      ? "bg-white border-slate-200 shadow-2xs"
                      : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleItemToggleSelect(item.id)}
                      className="p-1 text-slate-600 hover:text-teal-600 transition-colors shrink-0"
                      title={item.selected ? "검수 대상에서 제외" : "검수 대상에 포함"}
                    >
                      {item.selected ? (
                        <CheckSquare className="w-5 h-5 text-teal-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>

                    {/* Editable Input */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <input
                        type="text"
                        value={item.editedValue}
                        onChange={(e) =>
                          handleItemValueChange(item.id, e.target.value)
                        }
                        placeholder="품목코드 입력 (예: RSZ7300MCS)"
                        className={`w-full px-3 py-1.5 text-xs sm:text-sm font-mono font-bold rounded-lg border transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-500/50 ${
                          item.selected
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                            : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                        }`}
                      />

                      {/* Delete button for added rows or manual cleanup */}
                      <button
                        onClick={() => handleDeleteCodeRow(item.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                        title="항목 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    {/* Original Value hint if edited */}
                    {isEdited && item.originalValue && (
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[120px]">
                        (원문: {item.originalValue})
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>

                    {/* Restore Button */}
                    {isEdited && item.originalValue && (
                      <button
                        onClick={() => handleRestoreItem(item.id)}
                        className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                        title="OCR 원본 문자열로 복원"
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>원본 복원</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section Action Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            총 {processedCodeItems.length}개 중{" "}
            <span className="font-bold text-slate-800">
              {
                processedCodeItems.filter(
                  (i) => i.selected && i.status !== "empty"
                ).length
              }
              개 선택됨
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRefreshComparison}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              <span>수정 내용 다시 비교</span>
            </button>

            <button
              onClick={handleFinalizeInspection}
              disabled={!hasValidSelectedCodes || isSaving}
              className="flex-1 sm:flex-initial px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Google Sheet 저장 중...</span>
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>최종 검수 확정 완료</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>최종 검수 확정</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Result Code Lists */}
      <div className="space-y-2">
        <ResultCodeList
          title="일치 모델"
          codes={computedComparison.matched}
          type="matched"
        />
        <ResultCodeList
          title="누락 모델 (기준에 포함됨)"
          codes={computedComparison.missing}
          type="missing"
        />
        <ResultCodeList
          title="추가 후보 (기준에 미포함됨)"
          codes={computedComparison.extra}
          type="extra"
        />
      </div>

      {/* OCR Raw Text Accordion */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
        <div
          onClick={() => setShowOcrText(!showOcrText)}
          className="px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer select-none border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-xs sm:text-sm text-slate-800">
              OCR 인식 전체 원문 보기
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({result.ocrText.length}자)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {result.ocrText && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyOcr();
                }}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-2xs"
              >
                {copiedOcr ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>원문 복사</span>
                  </>
                )}
              </button>
            )}

            <button className="p-1 text-slate-500">
              {showOcrText ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {showOcrText && (
          <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs max-h-60 overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
            {result.ocrText || "인식된 텍스트 원문이 없습니다."}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onNewInspection}
          className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          새 사진 선택 (기본 정보 유지)
        </button>

        <button
          onClick={onReinspectSamePhoto}
          className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          다시 OCR (같은 사진 재검수)
        </button>

        <button
          onClick={onViewReferenceData}
          className="py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <Database className="w-4 h-4 text-teal-600" />
          기준 데이터 보기
        </button>
      </div>
    </div>
  );
};
