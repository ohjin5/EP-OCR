import React, { useEffect, useState } from "react";
import {
  History,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit,
  Calendar,
  Building,
  ChevronDown,
  ChevronUp,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { HistoryItem, ProductGroup } from "../types/api";
import { getInspectionHistory } from "../services/appsScriptApi";
import { getKoreanErrorMessage } from "../utils/errorUtils";
import { formatKoreanDateTime } from "../utils/dateUtils";
import { EditHistoryModal } from "./EditHistoryModal";
import { ResultCodeList } from "./ResultCodeList";

interface HistoryViewProps {
  productGroups: ProductGroup[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ productGroups }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Expandable cards & edit modal state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getInspectionHistory(100);
      setHistory(data);
    } catch (err) {
      setError(getKoreanErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter items
  const filteredHistory = history.filter((item) => {
    if (verdictFilter !== "all" && item.verdict !== verdictFilter) return false;
    if (groupFilter !== "all" && item.sheetName !== groupFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inVendor = (item.vendor || "").toLowerCase().includes(q);
      const inMemo = (item.memo || "").toLowerCase().includes(q);
      const inSheet = (item.sheetName || "").toLowerCase().includes(q);
      const inMatched = (item.matched || []).some((c) => c.toLowerCase().includes(q));
      const inMissing = (item.missing || []).some((c) => c.toLowerCase().includes(q));
      const inExtra = (item.extra || []).some((c) => c.toLowerCase().includes(q));
      return inVendor || inMemo || inSheet || inMatched || inMissing || inExtra;
    }

    return true;
  });

  const verdictBadgeStyle = {
    일치: "bg-emerald-100 text-emerald-800 border-emerald-300",
    부분일치: "bg-amber-100 text-amber-800 border-amber-300",
    불일치: "bg-rose-100 text-rose-800 border-rose-300",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 my-4 px-2 sm:px-4">
      {/* Header & Filter Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              검수 이력 조회
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Google Sheet에 기록된 최근 검수 내역을 확인하고 정보를 수정할 수 있습니다.
            </p>
          </div>

          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="self-end sm:self-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Verdict Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">판정 결과 필터</label>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">전체 판정 보기</option>
              <option value="일치">일치</option>
              <option value="부분일치">부분일치</option>
              <option value="불일치">불일치</option>
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">제품군 필터</label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">전체 제품군</option>
              {productGroups.map((g) => (
                <option key={g.sheetName} value={g.sheetName}>
                  {g.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">검색 (업체명, 코드, 메모)</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어 입력..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History Items List */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-sm text-slate-600 font-medium">검수 이력을 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 rounded-xl border border-rose-300 font-semibold text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            다시 시도
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
            <span>총 {filteredHistory.length}건의 검수 이력</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
              조건에 맞는 검수 이력이 없습니다.
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isExpanded = expandedId === item.id;
              const badgeClass = verdictBadgeStyle[item.verdict] || verdictBadgeStyle["불일치"];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Card Main Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                          {item.verdict}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{item.sheetName}</span>
                        {item.vendor && (
                          <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {item.vendor}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          수술일: {item.surgeryDate || "-"}
                        </span>
                        <span>검수시각: {formatKoreanDateTime(item.timestamp)}</span>
                      </div>

                      {item.memo && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xl">
                          "{item.memo}"
                        </p>
                      )}
                    </div>

                    {/* Right Summary Metrics & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-2 text-center text-xs font-mono">
                        <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">기준</span>
                          <span className="font-bold text-slate-700">{item.referenceCount}</span>
                        </div>
                        <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                          <span className="text-[10px] text-emerald-600 block">일치</span>
                          <span className="font-bold text-emerald-700">{item.matchedCount}</span>
                        </div>
                        <div className="bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                          <span className="text-[10px] text-rose-600 block">누락</span>
                          <span className="font-bold text-rose-700">{item.missingCount}</span>
                        </div>
                        <div className="bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <span className="text-[10px] text-amber-600 block">추가</span>
                          <span className="font-bold text-amber-700">{item.extraCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors"
                          title="이력 수정"
                          aria-label="이력 수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium"
                          aria-label="상세 보기 토글"
                        >
                          <span>{isExpanded ? "접기" : "상세"}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-4">
                      <div className="text-xs text-slate-400 font-mono">
                        이력 ID: {item.id}
                      </div>

                      {/* Code Lists */}
                      <div className="space-y-2">
                        <ResultCodeList title="일치 모델" codes={item.matched || []} type="matched" />
                        <ResultCodeList title="누락 모델" codes={item.missing || []} type="missing" />
                        <ResultCodeList title="추가 후보" codes={item.extra || []} type="extra" />
                      </div>

                      {/* OCR Text if present */}
                      {item.ocrText && (
                        <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs max-h-48 overflow-y-auto leading-relaxed">
                          <div className="text-[10px] font-bold text-teal-400 uppercase mb-1">
                            OCR 원문 ({item.ocrText.length}자)
                          </div>
                          {item.ocrText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit History Modal */}
      {editingItem && (
        <EditHistoryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            fetchHistory();
          }}
        />
      )}
    </div>
  );
};
