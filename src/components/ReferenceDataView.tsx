import React, { useEffect, useState } from "react";
import { Database, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { ProductGroup, ReferenceRow } from "../types/api";
import { getReferenceRows } from "../services/appsScriptApi";
import { getKoreanErrorMessage } from "../utils/errorUtils";

interface ReferenceDataViewProps {
  productGroups: ProductGroup[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
}

export const ReferenceDataView: React.FC<ReferenceDataViewProps> = ({
  productGroups,
  selectedGroup,
  onSelectGroup,
}) => {
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (!selectedGroup) return;

    let isMounted = true;
    async function fetchRows() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getReferenceRows(selectedGroup);
        if (isMounted) {
          setRows(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(getKoreanErrorMessage(err));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRows();
    return () => {
      isMounted = false;
    };
  }, [selectedGroup]);

  // Filter rows based on search query
  const filteredRows = rows.filter((row) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (row.model || "").toLowerCase().includes(q) ||
      (row.itemCode || "").toLowerCase().includes(q) ||
      (row.itemName || "").toLowerCase().includes(q) ||
      (row.specification || "").toLowerCase().includes(q) ||
      (row.manufacturer || "").toLowerCase().includes(q) ||
      (row.ediCode || "").toLowerCase().includes(q) ||
      (row.vendor || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4 my-4 px-2 sm:px-4">
      {/* Top Header & Group Selector */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-600" />
              기준 데이터 목록 조회
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Google Sheet에 등록된 제품군별 기준 물품 정보를 조회합니다.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <label htmlFor="refGroupSelect" className="block text-[11px] font-bold text-slate-600 mb-1">
              제품군 선택
            </label>
            <select
              id="refGroupSelect"
              value={selectedGroup}
              onChange={(e) => onSelectGroup(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {productGroups.map((g) => (
                <option key={g.sheetName} value={g.sheetName}>
                  {g.displayName} ({g.modelCount}개)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="모델명, 물품코드, 물품명, 규격, 제조사, EDI 코드, 거래처 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-sm text-slate-600 font-medium">기준 데이터를 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => onSelectGroup(selectedGroup)}
            className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 rounded-xl border border-rose-300 font-semibold text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            다시 시도
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
            <span>총 {filteredRows.length}개 검색됨 (전체 {rows.length}개)</span>
          </div>

          {filteredRows.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
              검색 조건에 해당되는 기준 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* Mobile Cards View (< md) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          {row.model || "모델 없음"}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">
                          {row.itemName || "-"}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">#{row.rowNumber}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">규격</span>
                        <span className="font-medium text-slate-800">{row.specification || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">물품코드</span>
                        <span className="font-mono text-slate-800">{row.itemCode || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">제조사</span>
                        <span className="text-slate-800">{row.manufacturer || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">EDI 코드</span>
                        <span className="font-mono text-slate-800">{row.ediCode || "-"}</span>
                      </div>
                    </div>
                    {row.vendor && (
                      <div className="text-xs text-slate-500 border-t border-slate-50 pt-1.5">
                        <span className="text-slate-400">거래처: </span>
                        <span>{row.vendor}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                        <th className="p-3.5">모델</th>
                        <th className="p-3.5">물품명</th>
                        <th className="p-3.5">규격</th>
                        <th className="p-3.5">물품코드</th>
                        <th className="p-3.5">제조사</th>
                        <th className="p-3.5">EDI 코드</th>
                        <th className="p-3.5">거래처</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-teal-800 bg-teal-50/30">
                            {row.model || "-"}
                          </td>
                          <td className="p-3.5 font-medium text-slate-900">{row.itemName || "-"}</td>
                          <td className="p-3.5 text-slate-600">{row.specification || "-"}</td>
                          <td className="p-3.5 font-mono text-slate-700">{row.itemCode || "-"}</td>
                          <td className="p-3.5 text-slate-600">{row.manufacturer || "-"}</td>
                          <td className="p-3.5 font-mono text-slate-600">{row.ediCode || "-"}</td>
                          <td className="p-3.5 text-slate-600">{row.vendor || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
