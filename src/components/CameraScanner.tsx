import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Camera,
  Zap,
  ZapOff,
  SwitchCamera,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  ActiveCameraState,
  setTorchState,
  startCameraStream,
  stopCameraStream,
} from "../services/cameraService";
import { analyzeImageQuality, resetQualityState } from "../services/imageQuality";
import { calculateVideoCropRect, cropSourceToCanvas } from "../services/imageProcessing";
import { CameraGuideOverlay } from "./CameraGuideOverlay";
import { CapturedImageInfo, ImageQualityResult } from "../types/inspection";
import { canvasToBase64, canvasToBlob } from "../utils/imageUtils";
import { getKoreanErrorMessage } from "../utils/errorUtils";

interface CameraScannerProps {
  onCapture: (capturedInfo: CapturedImageInfo) => void;
  onCancel: () => void;
  onErrorFallbackToFile: (errorMessage: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCapture,
  onCancel,
  onErrorFallbackToFile,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRectRef = useRef<HTMLDivElement>(null);

  const [cameraState, setCameraState] = useState<ActiveCameraState | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [torchEnabled, setTorchEnabled] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false);

  const [currentQuality, setCurrentQuality] = useState<ImageQualityResult>({
    brightness: 100,
    sharpness: 15,
    motion: 0,
    glareRatio: 0,
    isTooDark: false,
    isTooBright: false,
    isBlurry: false,
    isMoving: false,
    hasGlare: false,
    isReady: false,
    guidanceMessage: "카메라를 연결하는 중입니다...",
    statusLevel: "moderate",
  });

  const [showPoorQualityConfirm, setShowPoorQualityConfirm] = useState(false);
  const readyDurationRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);
  const prevReadyRef = useRef<boolean>(false);

  // Initialize camera
  const initCamera = useCallback(
    async (mode: "environment" | "user") => {
      setIsLoading(true);
      setCameraError(null);
      resetQualityState();

      try {
        if (cameraState?.stream) {
          stopCameraStream(cameraState.stream);
        }

        const state = await startCameraStream(mode);
        setCameraState(state);

        if (videoRef.current) {
          videoRef.current.srcObject = state.stream;
          await videoRef.current.play();
        }
        setIsLoading(false);
      } catch (err: unknown) {
        setIsLoading(false);
        const errMsg = getKoreanErrorMessage(err);
        setCameraError(errMsg);
        // Fallback option
        onErrorFallbackToFile(errMsg);
      }
    },
    [cameraState, onErrorFallbackToFile]
  );

  useEffect(() => {
    initCamera(facingMode);
    return () => {
      if (cameraState?.stream) {
        stopCameraStream(cameraState.stream);
      }
      resetQualityState();
    };
  }, [facingMode]);

  // Quality analysis loop
  useEffect(() => {
    if (!videoRef.current || isLoading || cameraError) return;

    const analysisCanvas = document.createElement("canvas");
    analysisCanvas.width = 320;
    analysisCanvas.height = 240;
    const analysisCtx = analysisCanvas.getContext("2d", { willReadFrequently: true });

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || isCapturingRef.current) return;

      if (analysisCtx && video.videoWidth > 0 && video.videoHeight > 0) {
        analysisCtx.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
        const quality = analyzeImageQuality(analysisCanvas);

        setCurrentQuality(quality);

        // Vibration feedback on ready transition
        if (quality.isReady && !prevReadyRef.current) {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(80);
            } catch {
              // Ignore
            }
          }
        }
        prevReadyRef.current = quality.isReady;

        // Auto-capture handling
        if (autoCaptureEnabled && quality.isReady) {
          readyDurationRef.current += 350;
          if (readyDurationRef.current >= 800) {
            readyDurationRef.current = 0;
            executeCapture();
          }
        } else {
          readyDurationRef.current = 0;
        }
      }
    }, 350);

    return () => {
      clearInterval(intervalId);
    };
  }, [isLoading, cameraError, autoCaptureEnabled]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!cameraState?.videoTrack) return;
    const nextState = !torchEnabled;
    const success = await setTorchState(cameraState.videoTrack, nextState);
    if (success) {
      setTorchEnabled(nextState);
    }
  };

  // Switch camera facing mode
  const handleSwitchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Capture implementation
  const executeCapture = async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    const frameRect = frameRectRef.current;

    if (!video || !container || !frameRect || isCapturingRef.current) return;

    isCapturingRef.current = true;

    try {
      const vRect = video.getBoundingClientRect();
      const fRect = frameRect.getBoundingClientRect();

      // Calculate video crop
      const cropRect = calculateVideoCropRect(video, fRect, vRect);

      // Crop source to canvas
      const croppedCanvas = cropSourceToCanvas(video, cropRect);
      const { dataUrl } = canvasToBase64(croppedCanvas, 0.9);
      const blob = await canvasToBlob(croppedCanvas, 0.9);

      // Cleanup stream before navigating to editor
      stopCameraStream(cameraState?.stream);

      onCapture({
        dataUrl,
        blob,
        width: croppedCanvas.width,
        height: croppedCanvas.height,
        quality: currentQuality,
        cropRectOnVideo: cropRect,
      });
    } catch (err) {
      console.error("Capture failed:", err);
      isCapturingRef.current = false;
    }
  };

  // Handle Capture button click
  const handleCaptureClick = () => {
    if (currentQuality.statusLevel === "poor") {
      setShowPoorQualityConfirm(true);
    } else {
      executeCapture();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden">
      {/* Top Header Controls */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => {
            stopCameraStream(cameraState?.stream);
            onCancel();
          }}
          className="p-2 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors"
          aria-label="카메라 닫기"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {/* Auto capture toggle */}
          <button
            onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full backdrop-blur-md transition-all ${
              autoCaptureEnabled
                ? "bg-teal-500 text-white shadow-md"
                : "bg-black/40 text-white/80 hover:bg-black/60"
            }`}
          >
            자동 촬영 {autoCaptureEnabled ? "켜짐" : "꺼짐"}
          </button>

          {/* Torch button if supported */}
          {cameraState?.capabilities.hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                torchEnabled
                  ? "bg-amber-400 text-slate-900"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              aria-label="플래시 토글"
            >
              {torchEnabled ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          {/* Switch Camera if multiple cameras available */}
          {cameraState?.capabilities.hasMultipleCameras && (
            <button
              onClick={handleSwitchCamera}
              className="p-2.5 text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors"
              aria-label="카메라 전환"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Camera Video Area */}
      <div ref={containerRef} className="relative flex-1 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white bg-slate-900 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
            <p className="text-sm font-medium">카메라 준비 중...</p>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* Camera Document Guide Overlay */}
        {!isLoading && !cameraError && (
          <CameraGuideOverlay
            quality={currentQuality}
            overlayRef={overlayRef}
            frameRectRef={frameRectRef}
          />
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-around">
        <button
          onClick={() => {
            stopCameraStream(cameraState?.stream);
            onCancel();
          }}
          className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md transition-colors"
        >
          취소
        </button>

        {/* Capture Button */}
        <button
          onClick={handleCaptureClick}
          disabled={isLoading || !!cameraError}
          className={`relative p-1 rounded-full border-4 transition-all transform active:scale-95 disabled:opacity-50 ${
            currentQuality.statusLevel === "ready"
              ? "border-teal-400 bg-teal-500/20 shadow-[0_0_25px_rgba(45,212,191,0.6)]"
              : "border-white/60 bg-white/10"
          }`}
          style={{ minWidth: "72px", minHeight: "72px" }}
          aria-label="사진 촬영"
        >
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Camera className="w-7 h-7 text-slate-800" />
          </div>
        </button>

        {/* Switch Camera / Placeholder for alignment */}
        <div className="w-16 flex justify-end">
          {cameraState?.capabilities.hasMultipleCameras && (
            <button
              onClick={handleSwitchCamera}
              className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
              aria-label="카메라 전환"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Low Quality Confirmation Modal */}
      {showPoorQualityConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-900 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">화질 주의 안내</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              현재 이미지 품질(밝기, 선명도, 흔들림)이 좋지 않아 OCR 인식율이 낮아질 수 있습니다.
            </p>
            <div className="text-xs font-medium text-amber-700 bg-amber-50 p-3 rounded-xl mt-3">
              현재 상태: {currentQuality.guidanceMessage}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowPoorQualityConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                다시 맞추기
              </button>
              <button
                onClick={() => {
                  setShowPoorQualityConfirm(false);
                  executeCapture();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs transition-colors"
              >
                그래도 촬영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
