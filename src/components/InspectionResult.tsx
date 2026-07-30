import React, { useState, useEffect, useMemo } from "react";
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
  Filter,
  Layers,
} from "lucide-react";
import { InspectionResult as IInspectionResult } from "../types/api";
import { ResultCodeList } from "./ResultCodeList";
import { formatKoreanDate } from "../utils/dateUtils";
import {
  extractCandidateCodes,
  compareCandidateCodes,
} from "../utils/codeExtractor";
import { getModels } from "../services/appsScriptApi";

interface InspectionResultProps {
  result: IInspectionResult;
  croppedDataUrl?: string;
  onNewInspection: () => void;
  onReinspectSamePhoto: () => void;
  onViewReferenceData: () => void;
}

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

  // Extracted candidates & Checkbox selection state
  const rawCandidates = useMemo(() => {
    // 1. First extract candidates from OCR text using strict code extractor
    const candidates = extractCandidateCodes(result.ocrText);
    // 2. Combine with server returned matched & extra if any were missed
    const combined = new Set([...candidates, ...result.matched, ...result.extra]);
    return Array.from(combined);
  }, [result.ocrText, result.matched, result.extra]);

  // Checked candidates Set (default: ALL checked)
  const [checkedCandidates, setCheckedCandidates] = useState<Set<string>>(
    new Set(rawCandidates)
  );

  // Sync checked candidates if rawCandidates changes
  useEffect(() => {
    setCheckedCandidates(new Set(rawCandidates));
  }, [rawCandidates]);

  // Fetch reference models for the current sheet to support dynamic live re-comparison
  useEffect(() => {
    let isMounted = true;
    async function fetchRef() {
      if (!result.sheetName) return;
      setIsLoadingRefModels(true);
      try {
        const models = await getModels(result.sheetName);
        if (isMounted) setRefModels(models);
      } catch (err) {
        console.error("Failed to load reference models for re-comparison:", err);
      } finally {
        if (isMounted) setIsLoadingRefModels(false);
      }
    }
    fetchRef();
    return () => {
      isMounted = false;
    };
  }, [result.sheetName]);

  // Dynamically calculate comparison based on checked candidate codes
  const computedComparison = useMemo(() => {
    const activeCandidates = rawCandidates.filter((cand) =>
      checkedCandidates.has(cand)
    );

    // If reference models loaded, perform strict comparison
    if (refModels.length > 0) {
      return compareCandidateCodes(activeCandidates, refModels);
    }

    // Fallback using initial server response if reference models haven't loaded
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
  }, [rawCandidates, checkedCandidates, refModels, result]);

  // Toggle individual code check status
  const handleToggleCode = (code: string) => {
    const next = new Set(checkedCandidates);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setCheckedCandidates(next);
  };

  // Toggle select all / unselect all
  const handleToggleSelectAll = () => {
    if (checkedCandidates.size === rawCandidates.length) {
      setCheckedCandidates(new Set());
    } else {
      setCheckedCandidates(new Set(rawCandidates));
    }
  };

  const verdictConfig = {
    일치: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-950",
      badge: "bg-emerald-600 text-white",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      title: "기준 데이터와 완벽히 일치합니다",
      subtitle: "체크된 모든 모델 코드가 검증되었습니다.",
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
      subtitle: "선택된 품목코드 후보 중 기준 데이터와 일치하는 코드가 없습니다.",
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

      {/* Extracted Candidate Codes Checklist ("추출 코드 확인") */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-teal-600" />
              추출 코드 확인 및 검수 조정
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              OCR로 인식된 품목코드 후보입니다. 오인식된 노이즈 항목의 체크를 해제하면 실시간으로 최종 판정이 다시 계산됩니다.
            </p>
          </div>

          <button
            onClick={handleToggleSelectAll}
            className="self-start sm:self-auto text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            {checkedCandidates.size === rawCandidates.length ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>전체 해제</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>전체 선택 ({rawCandidates.length}개)</span>
              </>
            )}
          </button>
        </div>

        {rawCandidates.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
            OCR 결과에서 추출된 품목코드 형태의 문자열이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {rawCandidates.map((code) => {
              const isChecked = checkedCandidates.has(code);
              const isMatched = computedComparison.matched.includes(code);

              return (
                <div
                  key={code}
                  onClick={() => handleToggleCode(code)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2 ${
                    isChecked
                      ? isMatched
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold"
                        : "bg-slate-50 border-slate-300 text-slate-900 font-semibold"
                      : "bg-slate-50/50 border-slate-200 text-slate-400 line-through opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono text-xs overflow-hidden">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate">{code}</span>
                  </div>

                  {isChecked && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                        isMatched
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {isMatched ? "기준일치" : "추가후보"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
          새 검수 시작 (기본 정보 유지)
        </button>

        <button
          onClick={onReinspectSamePhoto}
          className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          같은 사진 다시 검수
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
