import React from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { ApiHealthStatus } from "../types/api";

interface ApiStatusBadgeProps {
  status: ApiHealthStatus;
  message?: string;
  spreadsheetName?: string;
  onRefresh: () => void;
}

export const ApiStatusBadge: React.FC<ApiStatusBadgeProps> = ({
  status,
  message,
  spreadsheetName,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          status === "connected"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : status === "error"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}
        title={message || spreadsheetName || "Apps Script API 연결 상태"}
      >
        {status === "checking" && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>API 확인 중...</span>
          </>
        )}

        {status === "connected" && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>API 연결됨</span>
            {spreadsheetName && (
              <span className="hidden sm:inline text-emerald-600/80 max-w-[140px] truncate">
                ({spreadsheetName})
              </span>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>API 연결 오류</span>
          </>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={status === "checking"}
        aria-label="API 상태 새로고침"
        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
};
