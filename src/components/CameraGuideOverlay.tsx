import React from "react";
import { ImageQualityResult } from "../types/inspection";
import { CaptureQualityIndicator } from "./CaptureQualityIndicator";

interface CameraGuideOverlayProps {
  quality: ImageQualityResult;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  frameRectRef: React.RefObject<HTMLDivElement | null>;
}

export const CameraGuideOverlay: React.FC<CameraGuideOverlayProps> = ({
  quality,
  overlayRef,
  frameRectRef,
}) => {
  // Border colors based on status level
  const borderColors = {
    ready: "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]",
    moderate: "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]",
    poor: "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
  };

  const cornerColors = {
    ready: "border-emerald-400",
    moderate: "border-amber-400",
    poor: "border-rose-500",
  };

  const statusLevel = quality.statusLevel;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 flex flex-col items-center justify-between pointer-events-none p-4 select-none overflow-hidden"
    >
      {/* Top Status Badge */}
      <div className="mt-2 pointer-events-auto z-20">
        <CaptureQualityIndicator quality={quality} />
      </div>

      {/* Center Document Guide Frame */}
      <div className="relative w-full max-w-[420px] flex items-center justify-center my-auto">
        {/* Frame ratio 1.45:1 approx (e.g. A4 / label ratio) */}
        <div
          ref={frameRectRef}
          className={`relative w-[88%] aspect-[1/1.42] rounded-2xl border-2 transition-all duration-300 ${borderColors[statusLevel]}`}
        >
          {/* L-shaped Corner Guides */}
          <div
            className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl ${cornerColors[statusLevel]}`}
          />
          <div
            className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl ${cornerColors[statusLevel]}`}
          />
          <div
            className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl ${cornerColors[statusLevel]}`}
          />
          <div
            className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl ${cornerColors[statusLevel]}`}
          />

          {/* Grid lines inside frame */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
            <div className="border-r border-b border-white/40" />
            <div className="border-r border-b border-white/40" />
            <div className="border-b border-white/40" />
            <div className="border-r border-b border-white/40" />
            <div className="border-r border-b border-white/40" />
            <div className="border-b border-white/40" />
            <div className="border-r border-white/40" />
            <div className="border-r border-white/40" />
            <div />
          </div>
        </div>
      </div>

      {/* Bottom Alignment Instructions */}
      <div className="mb-20 sm:mb-24 text-center px-4 bg-black/60 backdrop-blur-md rounded-2xl py-2.5 max-w-sm pointer-events-auto">
        <p className="text-xs sm:text-sm font-semibold text-white">
          문서의 네 모서리를 틀 안에 맞추어 주세요
        </p>
        <p className="text-[11px] text-white/70 mt-0.5">
          그림자가 생기지 않도록 정면에서 가깝게 촬영하세요.
        </p>
      </div>
    </div>
  );
};
