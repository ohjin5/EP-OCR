import React from "react";
import { CheckCircle, AlertTriangle, XCircle, Sun, Activity, Zap, Sparkles } from "lucide-react";
import { ImageQualityResult } from "../types/inspection";

interface CaptureQualityIndicatorProps {
  quality: ImageQualityResult;
  compact?: boolean;
}

export const CaptureQualityIndicator: React.FC<CaptureQualityIndicatorProps> = ({
  quality,
  compact = false,
}) => {
  const { statusLevel, guidanceMessage, brightness, sharpness, motion, glareRatio } = quality;

  const statusConfig = {
    ready: {
      bg: "bg-emerald-500/90 text-white border-emerald-400",
      badgeText: "촬영 가능",
      icon: CheckCircle,
    },
    moderate: {
      bg: "bg-amber-500/90 text-white border-amber-400",
      badgeText: "촬영 주의",
      icon: AlertTriangle,
    },
    poor: {
      bg: "bg-rose-500/90 text-white border-rose-400",
      badgeText: "촬영 부적합",
      icon: XCircle,
    },
  };

  const currentStatus = statusConfig[statusLevel];
  const Icon = currentStatus.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold ${currentStatus.bg}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span>{guidanceMessage}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border text-xs sm:text-sm font-semibold shadow-lg transition-all ${currentStatus.bg}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span>{guidanceMessage}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
        <span className="flex items-center gap-1" title="밝기">
          <Sun className="w-3 h-3 text-amber-300" />
          <span>밝기 {brightness}</span>
        </span>
        <span className="text-white/30">•</span>
        <span className="flex items-center gap-1" title="선명도">
          <Sparkles className="w-3 h-3 text-teal-300" />
          <span>선명도 {sharpness}</span>
        </span>
        <span className="text-white/30">•</span>
        <span className="flex items-center gap-1" title="흔들림">
          <Activity className="w-3 h-3 text-sky-300" />
          <span>움직임 {motion}</span>
        </span>
        {glareRatio > 0.05 && (
          <>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-1 text-amber-300" title="빛반사">
              <Zap className="w-3 h-3" />
              <span>반사 {Math.round(glareRatio * 100)}%</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
