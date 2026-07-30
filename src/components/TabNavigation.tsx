import React from "react";
import { Camera, Database, History } from "lucide-react";

export type TabType = "scan" | "reference" | "history";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  historyCount?: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  historyCount,
}) => {
  const tabs = [
    {
      id: "scan" as TabType,
      label: "촬영 및 검수",
      icon: Camera,
    },
    {
      id: "reference" as TabType,
      label: "기준 데이터",
      icon: Database,
    },
    {
      id: "history" as TabType,
      label: "검수 이력",
      icon: History,
      badge: historyCount !== undefined && historyCount > 0 ? historyCount : null,
    },
  ];

  return (
    <div className="bg-slate-100 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-2 sm:px-6">
        <nav className="grid grid-cols-3 gap-1 py-1.5" aria-label="메인 탭">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-teal-600" : "text-slate-500"}`} />
                <span className="truncate">{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
