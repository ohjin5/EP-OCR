import React, { useEffect, useState } from "react";
import { Loader2, XCircle, CheckCircle2, Cpu } from "lucide-react";

interface InspectionProgressProps {
  onCancel: () => void;
}

const STEPS = [
  "이미지 최적화 중...",
  "OCR 서버로 전송 중...",
  "문서 텍스트 인식 중...",
  "기준 모델 코드 자동 비교 중...",
  "검수 이력 저장 중...",
];

export const InspectionProgress: React.FC<InspectionProgressProps> = ({ onCancel }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Timer counter
    const timerId = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    // Step progression simulation for UI feedback while waiting for single Apps Script response
    const stepTimerId = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4500);

    return () => {
      clearInterval(timerId);
      clearInterval(stepTimerId);
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border border-teal-100 max-w-lg mx-auto my-6 text-slate-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">AI OCR 검수 진행 중</h3>
          <p className="text-xs text-slate-500">
            Apps Script API를 통해 모델 코드를 분석하고 있습니다. ({elapsedSeconds}초 경과)
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
        <div
          className="bg-teal-600 h-full transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.min(95, ((currentStepIndex + 1) / STEPS.length) * 100)}%` }}
        />
      </div>

      {/* Step Checklist */}
      <div className="space-y-3 mb-6">
        {STEPS.map((stepLabel, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 text-xs sm:text-sm transition-all ${
                isCurrent
                  ? "font-semibold text-teal-700 bg-teal-50/70 p-2.5 rounded-xl border border-teal-100"
                  : isDone
                  ? "text-slate-600 p-1"
                  : "text-slate-400 p-1"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              <span>{stepLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
        <span>최대 90초 소요될 수 있습니다.</span>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-rose-600 font-medium py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          요청 취소
        </button>
      </div>
    </div>
  );
};
