import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Save,
  RotateCcw,
  Info,
  Check,
  Building,
  Calendar,
  FileText,
  Tag,
  Package,
} from "lucide-react";
import {
  ExactModelMatch,
  SimilarModelMatch,
  ModelMatchingResult,
  InspectionVerdict,
} from "../types/api";

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
    verdict: InspectionVerdict
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
  // Checkbox state for exact matches (default: ALL checked)
  const [selectedExactKeys, setSelectedExactKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    matchResult.exactMatches.forEach((m) => {
      const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}`;
      initial.add(key);
    });
    return initial;
  });

  // Checkbox state for similar matches (default: NONE checked, user must confirm)
  const [selectedSimilarKeys, setSelectedSimilarKeys] = useState<Set<string>>(
    new Set()
  );

  // Accordion toggle state for unmatched strings
  const [isUnmatchedOpen, setIsUnmatchedOpen] = useState<boolean>(false);
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

  // Compute selected exact and similar matches
  const confirmedExactMatches = matchResult.exactMatches.filter((m) => {
    const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}`;
    return selectedExactKeys.has(key);
  });

  const confirmedSimilarMatches = matchResult.similarMatches.filter((m) => {
    const key = `${m.reference.sheetName}-${m.reference.rowNumber}-${m.reference.model}-${m.ocrCandidate}`;
    return selectedSimilarKeys.has(key);
  });

  // Calculate dynamic verdict
  const totalConfirmed = confirmedExactMatches.length + confirmedSimilarMatches.length;
  let dynamicVerdict: InspectionVerdict = "불일치";

  if (!ocrText || ocrText.trim().length === 0) {
    dynamicVerdict = "OCR 인식 실패";
  } else if (confirmedExactMatches.length >= 1) {
    dynamicVerdict = "일치";
  } else if (confirmedSimilarMatches.length >= 1) {
    dynamicVerdict = "확인 필요";
  } else {
    dynamicVerdict = "불일치";
  }

  // Submit Final Confirmation
  const handleConfirmSubmit = () => {
    onConfirm(
      confirmedExactMatches,
      confirmedSimilarMatches,
      matchResult.unmatchedCandidates,
      dynamicVerdict
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 my-4 px-2 sm:px-0">
      {/* Top Banner Notice */}
      <div className="bg-teal-900 text-white p-5 rounded-2xl shadow-lg border border-teal-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-300" />
              <h2 className="text-base sm:text-lg font-bold">OCR 인식 확인</h2>
            </div>
            <p className="text-xs text-teal-200 mt-1">
              선택 영역에서 다음 모델 후보를 확인했습니다. 확인 후 [검수 결과 확정]을 눌러주세요.
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

        {/* Cropped Image & Inspection Meta Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-teal-800/80 text-xs">
          {croppedDataUrl && (
            <div className="sm:col-span-1 bg-slate-950/60 p-2 rounded-xl border border-teal-800 flex items-center justify-center">
              <img
                src={croppedDataUrl}
                alt="선택 크롭 이미지"
                className="max-h-20 object-contain rounded"
              />
            </div>
          )}

          <div className="sm:col-span-2 space-y-1 text-teal-200 flex flex-col justify-center">
            {vendor && (
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-400" />
                <span>거래처: <strong className="text-white">{vendor}</strong></span>
              </div>
            )}
            {surgeryDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>수술일: <strong className="text-white">{surgeryDate}</strong></span>
              </div>
            )}
            {memo && (
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>메모: <span className="text-teal-100">{memo}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">OCR 후보 수</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
            {matchResult.exactMatches.length +
              matchResult.similarMatches.length +
              matchResult.unmatchedCandidates.length}
          </span>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 block">정확 일치 모델</span>
          <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">
            {matchResult.exactMatches.length}건
          </span>
        </div>

        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 block">유사 후보</span>
          <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">
            {matchResult.similarMatches.length}건
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">기타 OCR 문자열</span>
          <span className="text-xl font-extrabold text-slate-700 mt-0.5 block">
            {matchResult.unmatchedCandidates.length}건
          </span>
        </div>
      </div>

      {/* SECTION 1: Exact Matches */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              정확 일치 모델 ({matchResult.exactMatches.length}건)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              전체 기준데이터의 모델 코드와 정확히 일치하는 항목입니다.
            </p>
          </div>
        </div>

        {matchResult.exactMatches.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
            OCR 영역에서 정확히 일치하는 기준 모델을 찾지 못했습니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {matchResult.exactMatches.map((item, idx) => {
              const key = `${item.reference.sheetName}-${item.reference.rowNumber}-${item.reference.model}`;
              const isChecked = selectedExactKeys.has(key);

              return (
                <div
                  key={idx}
                  onClick={() => handleToggleExact(key)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
                    isChecked
                      ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                      : "bg-slate-50/50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="text-teal-600 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {item.reference.model}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md border border-teal-200">
                            제품군: {item.reference.sheetName}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 mt-1">
                          {item.reference.itemName || "물품명 없음"}
                        </h4>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg shrink-0">
                      정확 일치
                    </span>
                  </div>

                  {/* Detail details row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-2 border-t border-emerald-100/80">
                    <div>
                      <span className="text-slate-400 block">규격:</span>
                      <span className="font-semibold">{item.reference.specification || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">물품코드:</span>
                      <span className="font-mono font-semibold">{item.reference.itemCode || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">제조사:</span>
                      <span>{item.reference.manufacturer || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">EDI 코드:</span>
                      <span className="font-mono">{item.reference.ediCode || "-"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Similar Matches */}
      {matchResult.similarMatches.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                유사 일치 후보 ({matchResult.similarMatches.length}건)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                OCR 오인식 가능성이 있는 유사 항목입니다. 포함할 경우 체크해 주세요. (자동 확정 안 됨)
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {matchResult.similarMatches.map((item, idx) => {
              const key = `${item.reference.sheetName}-${item.reference.rowNumber}-${item.reference.model}-${item.ocrCandidate}`;
              const isChecked = selectedSimilarKeys.has(key);

              // Suggest character confusion hint
              let note = `OCR 오독 가능성 (문자 거리: ${item.distance})`;
              if (item.ocrCandidate.includes("O") && item.reference.model.includes("0")) {
                note = "OCR이 숫자 '0'을 알파벳 'O'로 오독했을 수 있습니다.";
              } else if (item.ocrCandidate.includes("I") && item.reference.model.includes("1")) {
                note = "OCR이 숫자 '1'을 알파벳 'I'로 오독했을 수 있습니다.";
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleToggleSimilar(key)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
                    isChecked
                      ? "bg-amber-50 border-amber-300 shadow-xs"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500 line-through">
                            OCR: {item.ocrCandidate}
                          </span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="font-mono font-bold text-sm text-amber-900">
                            기준: {item.reference.model}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                          <Info className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{note}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold rounded-lg block">
                        유사 후보
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                        제품군: {item.reference.sheetName}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-2 border-t border-amber-100">
                    <div>
                      <span className="text-slate-400 block">물품명:</span>
                      <span className="font-medium text-slate-800">{item.reference.itemName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">규격:</span>
                      <span className="font-medium">{item.reference.specification || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">물품코드:</span>
                      <span className="font-mono">{item.reference.itemCode || "-"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: Unmatched Candidates (Collapsible) */}
      {matchResult.unmatchedCandidates.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <button
            onClick={() => setIsUnmatchedOpen(!isUnmatchedOpen)}
            className="w-full p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-700">
                기준 모델과 일치하지 않은 OCR 문자열 ({matchResult.unmatchedCandidates.length}건)
              </h3>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <span>{isUnmatchedOpen ? "접기" : "펼치기"}</span>
              {isUnmatchedOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isUnmatchedOpen && (
            <div className="p-4 border-t border-slate-200 space-y-2 bg-white">
              <p className="text-[11px] text-slate-500">
                Lot No, Serial No, 유효기간, 숫자 수량 등 기준 모델에 등록되지 않은 보조 문자열입니다.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {matchResult.unmatchedCandidates.map((cand, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono border border-slate-200"
                  >
                    {cand}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: Raw OCR Text (Collapsible Debug) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          onClick={() => setIsRawTextOpen(!isRawTextOpen)}
          className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
        >
          <span className="text-xs font-bold text-slate-600">
            OCR 전체 추출 원문 보기 (원문 {ocrText?.length || 0}자)
          </span>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            {isRawTextOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
          onClick={onRetakeOrRecrop}
          className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>영역 다시 선택 / 촬영</span>
        </button>

        <button
          onClick={handleConfirmSubmit}
          className="w-full sm:w-auto px-7 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          <span>검수 결과 확정 ({totalConfirmed}개 모델 확정)</span>
        </button>
      </div>
    </div>
  );
};
