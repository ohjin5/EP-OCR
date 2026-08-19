import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Check,
  Building,
  Package,
} from "lucide-react";
import {
  InspectionTableRow,
  MatchStatus,
  MATCH_STATUS_LABEL,
  RESULT_LABELS,
} from "../types/api";

interface InspectionResultTableProps {
  rows: InspectionTableRow[];
  onToggleStatus?: (model: string) => void;
  isInteractive?: boolean;
  emptyMessage?: string;
  title?: string;
  showSheetColumn?: boolean;
}

export const InspectionResultTable: React.FC<InspectionResultTableProps> = ({
  rows,
  onToggleStatus,
  isInteractive = false,
  emptyMessage = "검수 대상 기준데이터가 없습니다.",
  title,
  showSheetColumn = false,
}) => {
  // Filter state: 'all' | 'matched' | 'unmatched'
  const [filterType, setFilterType] = useState<"all" | MatchStatus>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Counts calculated strictly from rows
  const totalCount = rows.length;
  const matchedCount = useMemo(
    () => rows.filter((r) => r.status === "matched").length,
    [rows]
  );
  const unmatchedCount = useMemo(
    () => rows.filter((r) => r.status === "unmatched").length,
    [rows]
  );

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Status Filter
      if (filterType !== "all" && row.status !== filterType) {
        return false;
      }
      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inModel = (row.model || "").toLowerCase().includes(q);
        const inName = (row.itemName || "").toLowerCase().includes(q);
        const inSpec = (row.specification || "").toLowerCase().includes(q);
        const inCode = (row.itemCode || "").toLowerCase().includes(q);
        const inEdi = (row.ediCode || "").toLowerCase().includes(q);
        const inMfg = (row.manufacturer || "").toLowerCase().includes(q);
        return inModel || inName || inSpec || inCode || inEdi || inMfg;
      }
      return true;
    });
  }, [rows, filterType, searchQuery]);

  return (
    <div className="space-y-4">
      {/* 3 Summary Clickable Filter Metrics */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* 1. Total */}
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === "all"
              ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900 ring-offset-2 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <span
            className={`text-xs sm:text-xs font-bold block ${
              filterType === "all" ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {RESULT_LABELS.total}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono">
              {totalCount}
            </span>
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${
                filterType === "all"
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              전체
            </span>
          </div>
        </button>

        {/* 2. Matched */}
        <button
          type="button"
          onClick={() => setFilterType("matched")}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === "matched"
              ? "bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-600 ring-offset-2 shadow-md"
              : "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:border-emerald-300 shadow-2xs"
          }`}
        >
          <span
            className={`text-xs sm:text-xs font-bold block ${
              filterType === "matched" ? "text-emerald-100" : "text-emerald-800"
            }`}
          >
            {RESULT_LABELS.matched}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono">
              {matchedCount}
            </span>
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${
                filterType === "matched"
                  ? "bg-emerald-800 text-emerald-100"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {MATCH_STATUS_LABEL.matched}
            </span>
          </div>
        </button>

        {/* 3. Unmatched */}
        <button
          type="button"
          onClick={() => setFilterType("unmatched")}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === "unmatched"
              ? "bg-rose-700 text-white border-rose-700 ring-2 ring-rose-600 ring-offset-2 shadow-md"
              : "bg-rose-50/70 text-rose-950 border-rose-200 hover:border-rose-300 shadow-2xs"
          }`}
        >
          <span
            className={`text-xs sm:text-xs font-bold block ${
              filterType === "unmatched" ? "text-rose-100" : "text-rose-800"
            }`}
          >
            {RESULT_LABELS.unmatched}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono">
              {unmatchedCount}
            </span>
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${
                filterType === "unmatched"
                  ? "bg-rose-800 text-rose-100"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {MATCH_STATUS_LABEL.unmatched}
            </span>
          </div>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Search & Title Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-600 shrink-0" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              {title || "기준데이터 검수 결과 목록"}
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              ({filteredRows.length}건 표시)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="모델, 물품명, 규격 검색..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Dense Excel-like Table for Desktop */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-2.5 px-3 whitespace-nowrap">모델</th>
                {showSheetColumn && (
                  <th className="py-2.5 px-3 whitespace-nowrap">제품군</th>
                )}
                <th className="py-2.5 px-3 min-w-[160px]">물품명</th>
                <th className="py-2.5 px-3 min-w-[120px]">규격</th>
                <th className="py-2.5 px-3 whitespace-nowrap">물품코드</th>
                <th className="py-2.5 px-3 whitespace-nowrap">제조사</th>
                <th className="py-2.5 px-3 whitespace-nowrap">EDI 코드</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">
                  검수 결과
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={showSheetColumn ? 8 : 7}
                    className="py-10 text-center text-slate-400 font-medium"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isMatched = row.status === "matched";

                  return (
                    <tr
                      key={`${row.model}-${idx}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isMatched ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      {/* 모델 */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {row.model}
                      </td>

                      {/* 제품군 */}
                      {showSheetColumn && (
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {row.sheetName}
                        </td>
                      )}

                      {/* 물품명 */}
                      <td className="py-2.5 px-3 font-medium text-slate-900 break-keep">
                        {row.itemName || "-"}
                      </td>

                      {/* 규격 */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.specification || "-"}
                      </td>

                      {/* 물품코드 */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {row.itemCode || "-"}
                      </td>

                      {/* 제조사 */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {row.manufacturer || "-"}
                      </td>

                      {/* EDI 코드 */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {row.ediCode || "-"}
                      </td>

                      {/* 검수 결과 (Rightmost Column) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isInteractive && onToggleStatus ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(row.model)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              isMatched
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                                : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200"
                            }`}
                          >
                            {isMatched ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{MATCH_STATUS_LABEL.matched}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>{MATCH_STATUS_LABEL.unmatched}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              isMatched
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-rose-100 text-rose-800 border-rose-300"
                            }`}
                          >
                            {isMatched ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{MATCH_STATUS_LABEL.matched}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>{MATCH_STATUS_LABEL.unmatched}</span>
                              </>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
