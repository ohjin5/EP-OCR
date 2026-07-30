import React, { useEffect, useState, useCallback } from "react";
import { AppHeader } from "./components/AppHeader";
import { TabNavigation, TabType } from "./components/TabNavigation";
import { InspectionForm } from "./components/InspectionForm";
import { CameraScanner } from "./components/CameraScanner";
import { ImageReviewEditor } from "./components/ImageReviewEditor";
import { InspectionProgress } from "./components/InspectionProgress";
import { InspectionResult } from "./components/InspectionResult";
import { ReferenceDataView } from "./components/ReferenceDataView";
import { HistoryView } from "./components/HistoryView";

import {
  ApiHealthStatus,
  InspectionRequest,
  InspectionResult as IInspectionResult,
  ProductGroup,
} from "./types/api";
import { CapturedImageInfo, ImageQualityResult } from "./types/inspection";
import {
  checkHealth,
  getProductGroups,
  inspectImage,
} from "./services/appsScriptApi";
import { getTodayDateString } from "./utils/dateUtils";
import { getKoreanErrorMessage } from "./utils/errorUtils";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function App() {
  // Global API Status State
  const [apiStatus, setApiStatus] = useState<ApiHealthStatus>("checking");
  const [apiMessage, setApiMessage] = useState<string>("");
  const [spreadsheetName, setSpreadsheetName] = useState<string>("");

  // Product Groups State
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("scan");

  // Form Field State
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [vendor, setVendor] = useState<string>("");
  const [surgeryDate, setSurgeryDate] = useState<string>(getTodayDateString());
  const [memo, setMemo] = useState<string>("");

  // Scan & Inspect Process State
  const [scanState, setScanState] = useState<
    "form" | "camera" | "review" | "inspecting" | "result"
  >("form");

  // Image & Result State
  const [rawCapturedDataUrl, setRawCapturedDataUrl] = useState<string>("");
  const [capturedQuality, setCapturedQuality] = useState<ImageQualityResult | undefined>(undefined);
  const [processedBase64, setProcessedBase64] = useState<string>("");
  const [processedDataUrl, setProcessedDataUrl] = useState<string>("");
  const [inspectionResult, setInspectionResult] = useState<IInspectionResult | null>(null);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  // Abort controller for cancellation
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 1. Health check & Initial Product Groups fetch
  const initializeApp = useCallback(async () => {
    setApiStatus("checking");
    setApiMessage("Apps Script API 연결 확인 중...");

    const health = await checkHealth();
    if (health.success) {
      setApiStatus("connected");
      setApiMessage(health.message || "API 정상 작동 중");
      setSpreadsheetName(health.spreadsheetName || "");
    } else {
      setApiStatus("error");
      setApiMessage(health.message || "Apps Script API 연결에 실패했습니다.");
    }

    // Load Product Groups
    await loadProductGroups();
  }, []);

  const loadProductGroups = async () => {
    setIsLoadingGroups(true);
    setGroupError(null);
    try {
      const groups = await getProductGroups();
      setProductGroups(groups);
      if (groups.length > 0) {
        setSelectedGroup((prev) => prev || groups[0].sheetName);
      }
    } catch (err) {
      setGroupError(getKoreanErrorMessage(err));
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Handlers for Camera Capture & File Upload
  const handleCameraCapture = (capturedInfo: CapturedImageInfo) => {
    setRawCapturedDataUrl(capturedInfo.dataUrl);
    setCapturedQuality(capturedInfo.quality);
    setScanState("review");
  };

  const handleFileSelected = (dataUrl: string) => {
    setRawCapturedDataUrl(dataUrl);
    setCapturedQuality(undefined);
    setScanState("review");
  };

  const handleCameraErrorFallback = (errorMessage: string) => {
    setScanState("form");
    alert(`카메라를 실행할 수 없습니다.\n(${errorMessage})\n\n사진 파일 선택 방식으로 전환합니다.`);
  };

  // Submit Image to OCR Inspection
  const handleStartInspection = async (finalBase64: string, finalDataUrl: string) => {
    if (!selectedGroup) return;

    setProcessedBase64(finalBase64);
    setProcessedDataUrl(finalDataUrl);
    setScanState("inspecting");
    setInspectionError(null);

    const controller = new AbortController();
    setAbortController(controller);

    const req: InspectionRequest = {
      base64Image: finalBase64,
      mimeType: "image/jpeg",
      sheetName: selectedGroup,
      vendor,
      surgeryDate: surgeryDate || getTodayDateString(),
      memo,
    };

    try {
      const res = await inspectImage(req, controller.signal);
      if (res.success && res.result) {
        setInspectionResult(res.result);
        setScanState("result");
      } else {
        setInspectionError(res.message || "OCR 검수 처리 중 오류가 발생했습니다.");
        setScanState("form");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setInspectionError("검수 요청이 취소되었습니다.");
      } else {
        setInspectionError(getKoreanErrorMessage(err));
      }
      setScanState("form");
    } finally {
      setAbortController(null);
    }
  };

  // Action handlers
  const handleCancelInspection = () => {
    if (abortController) {
      abortController.abort();
    }
    setScanState("form");
  };

  const handleNewInspection = () => {
    setRawCapturedDataUrl("");
    setProcessedBase64("");
    setProcessedDataUrl("");
    setInspectionResult(null);
    setInspectionError(null);
    setMemo(""); // clear memo, keep group, vendor, surgery date
    setScanState("form");
  };

  const handleReinspectSamePhoto = () => {
    if (processedBase64) {
      handleStartInspection(processedBase64, processedDataUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* App Top Header */}
      <AppHeader
        apiStatus={apiStatus}
        apiMessage={apiMessage}
        spreadsheetName={spreadsheetName}
        onRefreshApi={initializeApp}
      />

      {/* Main Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {/* Inspection Error Alert Banner if any */}
        {inspectionError && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{inspectionError}</span>
            </div>
            <button
              onClick={() => setInspectionError(null)}
              className="text-xs font-semibold px-2 py-1 bg-white hover:bg-rose-100 rounded-lg border border-rose-300 transition-colors"
            >
              닫기
            </button>
          </div>
        )}

        {/* TAB 1: 촬영 및 검수 (Scan & Inspect) */}
        {activeTab === "scan" && (
          <div>
            {scanState === "form" && (
              <InspectionForm
                productGroups={productGroups}
                isLoadingGroups={isLoadingGroups}
                groupError={groupError}
                selectedGroup={selectedGroup}
                vendor={vendor}
                surgeryDate={surgeryDate}
                memo={memo}
                onSelectGroup={setSelectedGroup}
                onChangeVendor={setVendor}
                onChangeSurgeryDate={setSurgeryDate}
                onChangeMemo={setMemo}
                onRetryLoadGroups={loadProductGroups}
                onStartCamera={() => setScanState("camera")}
                onFileSelected={handleFileSelected}
              />
            )}

            {scanState === "camera" && (
              <CameraScanner
                onCapture={handleCameraCapture}
                onCancel={() => setScanState("form")}
                onErrorFallbackToFile={handleCameraErrorFallback}
              />
            )}

            {scanState === "review" && (
              <ImageReviewEditor
                initialDataUrl={rawCapturedDataUrl}
                initialQuality={capturedQuality}
                onConfirm={handleStartInspection}
                onRetake={() => setScanState("camera")}
              />
            )}

            {scanState === "inspecting" && (
              <InspectionProgress onCancel={handleCancelInspection} />
            )}

            {scanState === "result" && inspectionResult && (
              <InspectionResult
                result={inspectionResult}
                croppedDataUrl={processedDataUrl}
                onNewInspection={handleNewInspection}
                onReinspectSamePhoto={handleReinspectSamePhoto}
                onViewReferenceData={() => setActiveTab("reference")}
              />
            )}
          </div>
        )}

        {/* TAB 2: 기준 데이터 (Reference Data) */}
        {activeTab === "reference" && (
          <ReferenceDataView
            productGroups={productGroups}
            selectedGroup={selectedGroup || (productGroups[0]?.sheetName || "")}
            onSelectGroup={setSelectedGroup}
          />
        )}

        {/* TAB 3: 검수 이력 (Inspection History) */}
        {activeTab === "history" && (
          <HistoryView productGroups={productGroups} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>AI OCR 물품 코드 자동 검수 시스템 • Google Apps Script 연동</p>
      </footer>
    </div>
  );
}
