import React, { useState } from "react";
import { X, Save, Loader2, Calendar, Building, FileText } from "lucide-react";
import { HistoryItem, UpdateHistoryRequest } from "../types/api";
import { updateHistoryRecord } from "../services/appsScriptApi";
import { getKoreanErrorMessage } from "../utils/errorUtils";

interface EditHistoryModalProps {
  item: HistoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditHistoryModal: React.FC<EditHistoryModalProps> = ({
  item,
  onClose,
  onSuccess,
}) => {
  const [vendor, setVendor] = useState(item.vendor || "");
  const [surgeryDate, setSurgeryDate] = useState(item.surgeryDate || "");
  const [memo, setMemo] = useState(item.memo || "");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const req: UpdateHistoryRequest = {
      historyId: item.id,
      sheetName: item.sheetName,
      vendor,
      surgeryDate,
      memo,
    };

    try {
      const res = await updateHistoryRecord(req);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "검수 이력 수정에 실패했습니다.");
      }
    } catch (err) {
      setError(getKoreanErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-slate-900">검수 이력 정보 수정</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span>제품군: </span>
            <span className="font-bold text-slate-800">{item.sheetName}</span>
            <span className="ml-2">• 판정: {item.verdict}</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">업체명 (거래처)</label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="업체명 입력"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">수술일</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={surgeryDate}
                onChange={(e) => setSurgeryDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">메모</label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="검수 관련 메모"
                rows={3}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-slate-700 text-sm hover:bg-slate-50 transition-colors"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>저장하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
