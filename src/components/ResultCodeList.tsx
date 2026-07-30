import React, { useState } from "react";
import { Copy, Check, Search, ChevronDown, ChevronUp } from "lucide-react";

interface ResultCodeListProps {
  title: string;
  codes: string[];
  type: "matched" | "missing" | "extra";
}

export const ResultCodeList: React.FC<ResultCodeListProps> = ({ title, codes, type }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAll, setShowAll] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const styleMap = {
    matched: {
      headerBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      codeBg: "bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200 text-emerald-950",
    },
    missing: {
      headerBg: "bg-rose-50 text-rose-800 border-rose-200",
      badge: "bg-rose-100 text-rose-800 border-rose-300",
      codeBg: "bg-rose-50/50 hover:bg-rose-100/60 border-rose-200 text-rose-950",
    },
    extra: {
      headerBg: "bg-amber-50 text-amber-800 border-amber-200",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      codeBg: "bg-amber-50/50 hover:bg-amber-100/60 border-amber-200 text-amber-950",
    },
  };

  const currentStyle = styleMap[type];

  // Filter codes
  const filteredCodes = codes.filter((code) =>
    code.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const displayedCodes = showAll ? filteredCodes : filteredCodes.slice(0, 30);

  const handleCopySingle = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleCopyAll = () => {
    if (codes.length === 0) return;
    navigator.clipboard.writeText(codes.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs my-3">
      {/* List Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-3 flex items-center justify-between cursor-pointer select-none border-b transition-colors ${currentStyle.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-sm sm:text-base">{title}</h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${currentStyle.badge}`}>
            {codes.length}개
          </span>
        </div>

        <div className="flex items-center gap-2">
          {codes.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyAll();
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white/80 hover:bg-white text-slate-700 rounded-lg border border-slate-200 shadow-xs transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>전체 복사</span>
                </>
              )}
            </button>
          )}

          <button className="p-1 text-slate-600 hover:text-slate-900" aria-label="목록 토글">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 bg-slate-50/50">
          {codes.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-medium">
              해당되는 모델 코드가 없습니다.
            </div>
          ) : (
            <>
              {/* Search Bar for list */}
              {codes.length > 10 && (
                <div className="relative mb-3 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="코드 검색..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              {/* Grid of Codes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {displayedCodes.map((code, idx) => {
                  const isCopied = copiedCode === code;
                  return (
                    <div
                      key={`${code}-${idx}`}
                      onClick={() => handleCopySingle(code)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-all ${currentStyle.codeBg}`}
                      title="클릭하여 코드 복사"
                    >
                      <span className="truncate mr-1">{code}</span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-40 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Show All Toggle if > 30 items */}
              {filteredCodes.length > 30 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl border border-teal-200 transition-colors"
                  >
                    {showAll ? "접기 (처음 30개만 표시)" : `전체 보기 (${filteredCodes.length}개 모두 표시)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
