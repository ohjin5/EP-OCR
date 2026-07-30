import React from "react";
import { ShieldCheck } from "lucide-react";
import { ApiStatusBadge } from "./ApiStatusBadge";
import { ApiHealthStatus } from "../types/api";

interface AppHeaderProps {
  apiStatus: ApiHealthStatus;
  apiMessage?: string;
  spreadsheetName?: string;
  onRefreshApi: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  apiStatus,
  apiMessage,
  spreadsheetName,
  onRefreshApi,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
                INVENTORY VERIFICATION
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI OCR 코드 자동 검수
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                사진 속 모델 코드를 기준 데이터와 자동 비교합니다.
              </p>
            </div>
          </div>

          <div className="self-end sm:self-auto">
            <ApiStatusBadge
              status={apiStatus}
              message={apiMessage}
              spreadsheetName={spreadsheetName}
              onRefresh={onRefreshApi}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
