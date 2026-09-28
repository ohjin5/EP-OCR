import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AppHeader } from "./components/AppHeader";
import { TabNavigation, TabType } from "./components/TabNavigation";
import { InspectionForm } from "./components/InspectionForm";
import { CameraScanner } from "./components/CameraScanner";
import { ImageReviewEditor } from "./components/ImageReviewEditor";
import { InspectionProgress } from "./components/InspectionProgress";
import { OcrRecognitionReview } from "./components/OcrRecognitionReview";
import { InspectionResult } from "./components/InspectionResult";
import { ReferenceDataView } from "./components/ReferenceDataView";
import { HistoryView } from "./components/HistoryView";

import {
  ApiHealthStatus,
  ExactModelMatch,
  InspectionResult as IInspectionResult,
  InspectionVerdict,
  ModelMatchingResult,
  ProductGroup,
  ReferenceModel,
  SimilarModelMatch,
  InspectionTableRow,
} from "./types/api";
import { CapturedImageInfo, ImageQualityResult } from "./types/inspection";
import {
  checkHealth,
  getAllReferenceRows,
  getProductGroups,
  runOcr,
  saveInspection,
} from "./services/appsScriptApi";
import {
  createModelIndex,
  matchOcrTextWithReferences,
} from "./utils/modelMatcher";
import { getTodayDateString } from "./utils/dateUtils";
import { getKoreanErrorMessage } from "./utils/errorUtils";
import { AlertTriangle } from "lucide-react";

export default function App() {
  // Global API Status State
  const [apiStatus, setApiStatus] = useState<ApiHealthStatus>("checking");
  const [apiMessage, setApiMessage] = useState<string>("");
  const [spreadsheetName, setSpreadsheetName] = useState<string>("");

  // Product Groups State
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Global Reference Rows & Model Index State
  const [allReferenceRows, setAllReferenceRows] = useState<ReferenceModel[]>([]);
  const [totalReferenceCount, setTotalReferenceCount] = useState<number>(0);
  const [isLoadingReference, setIsLoadingReference] = useState<boolean>(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("scan");

  // Form Field State
  const [vendor, setVendor] = useState<string>("");
  const [surgeryDate, setSurgeryDate] = useState<string>(getTodayDateString());
  const [memo, setMemo] = useState<string>("");

  // Scan & Inspect Process State: form -> camera -> review -> inspecting -> ocr_review -> result
  const [scanState, setScanState] = useState<
    "form" | "camera" | "review" | "inspecting" | "ocr_review" | "result"
  >("form");

  // Image & OCR State (Held in memory during the inspection session)
  const [rawCapturedDataUrl, setRawCapturedDataUrl] = useState<string>("");
  const [capturedQuality, setCapturedQuality] = useState<ImageQualityResult | undefined>(undefined);
  const [processedBase64, setProcessedBase64] = useState<string>("");
  const [processedDataUrl, setProcessedDataUrl] = useState<string>("");

  // Intermediate OCR Match Result State
  const [rawOcrText, setRawOcrText] = useState<string>("");
  const [ocrMatchResult, setOcrMatchResult] = useState<ModelMatchingResult | null>(null);

  // Final Inspection Result State & Table Rows
  const [inspectionResult, setInspectionResult] = useState<IInspectionResult | null>(null);
  const [finalTableRows, setFinalTableRows] = useState<InspectionTableRow[]>([]);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  // Abort controller for cancellation
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Build Map Index from Reference Models
  const modelIndex = useMemo(() => {
    return createModelIndex(allReferenceRows);
  }, [allReferenceRows]);

  // Load All Reference Data at Startup
  const loadReferenceData = useCallback(async () => {
    setIsLoadingReference(true);
    setReferenceError(null);
    try {
      const res = await getAllReferenceRows();
      setAllReferenceRows(res.rows);
      setTotalReferenceCount(res.total);
    } catch (err) {
      setReferenceError(getKoreanErrorMessage(err));
    } finally {
      setIsLoadingReference(false);
    }
  }, []);

  // 1. Health check & Initial Data Load
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

    // Load Product Groups for reference views
    try {
      const groups = await getProductGroups();
      setProductGroups(groups);
      if (groups.length > 0) {
        setSelectedGroup(groups[0].sheetName);
      }
    } catch (e) {
      console.warn("Product groups load fallback:", e);
    }

    // Load All Reference Models across sheets
    await loadReferenceData();
  }, [loadReferenceData]);

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

  // STEP 1: Submit ROI Cropped Image to OCR
  const handleCropOcrConfirm = async (finalBase64: string, finalDataUrl: string) => {
    setProcessedBase64(finalBase64);
    setProcessedDataUrl(finalDataUrl);
    setScanState("inspecting");
    setInspectionError(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await runOcr(finalBase64, "image/jpeg", controller.signal);
      if (res.success && res.ocrText !== undefined) {
        const text = res.ocrText || "";
        setRawOcrText(text);

        // Perform Client-side Model Comparison against ALL Reference Data
        const matchResult = matchOcrTextWithReferences(text, modelIndex, allReferenceRows);
        setOcrMatchResult(matchResult);

        // Advance to OCR Recognition Review screen
        setScanState("ocr_review");
      } else {
        setInspectionError(res.message || "OCR 분석 중 오류가 발생했습니다.");
        setScanState("form");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setInspectionError("OCR 요청이 취소되었습니다.");
      } else {
        setInspectionError(getKoreanErrorMessage(err));
      }
      setScanState("form");
    } finally {
      setAbortController(null);
    }
  };

  // STEP 2: Confirm OCR Review & Save Final Inspection Result
  const handleOcrReviewConfirm = async (
    confirmedExactMatches: ExactModelMatch[],
    confirmedSimilarMatches: SimilarModelMatch[],
    unmatched: string[],
    verdict: InspectionVerdict,
    tableRows: InspectionTableRow[]
  ) => {
    setScanState("inspecting");
    setFinalTableRows(tableRows);

    // Primary detected sheet name from matched models or fallback
    const primarySheet =
      tableRows[0]?.sheetName ||
      confirmedExactMatches[0]?.reference.sheetName ||
      confirmedSimilarMatches[0]?.reference.sheetName ||
      "전체검수";

    const matchedRows = tableRows.filter((r) => r.status === "matched");
    const unmatchedRows = tableRows.filter((r) => r.status === "unmatched");

    const exactPayload = confirmedExactMatches.map((m) => ({
      sheetName: m.reference.sheetName,
      model: m.reference.model,
      itemCode: m.reference.itemCode,
      itemName: m.reference.itemName,
      specification: m.reference.specification,
    }));

    const similarPayload = confirmedSimilarMatches.map((m) => ({
      sheetName: m.reference.sheetName,
      model: m.reference.model,
      ocrCandidate: m.ocrCandidate,
    }));

    try {
      const saveRes = await saveInspection({
        vendor,
        surgeryDate: surgeryDate || getTodayDateString(),
        memo,
        verdict,
        ocrText: rawOcrText,
        sheetName: primarySheet,
        inspectionRows: tableRows, // SINGLE SOURCE OF TRUTH
        matched: matchedRows.map((r) => r.model),
        missing: unmatchedRows.map((r) => r.model),
        extra: unmatched,
        matchedCount: matchedRows.length,
        missingCount: unmatchedRows.length,
        extraCount: unmatched.length,
        referenceCount: tableRows.length,
        totalCount: tableRows.length,
        exactMatches: exactPayload,
        similarMatches: similarPayload,
        unmatchedCandidates: unmatched,
      });

      const historyId = saveRes.historyId || `hist-${Date.now()}`;

      // Construct final InspectionResult object for display
      const finalResult: IInspectionResult = {
        sheetName: primarySheet,
        vendor,
        surgeryDate: surgeryDate || getTodayDateString(),
        verdict,
        referenceCount: tableRows.length,
        matchedCount: matchedRows.length,
        missingCount: unmatchedRows.length,
        extraCount: unmatched.length,
        rawCandidateCount: ocrMatchResult?.rawCandidateCount,
        deduplicatedCandidateCount: ocrMatchResult?.deduplicatedCandidateCount,
        removedDuplicateCount: ocrMatchResult?.removedDuplicateCount,
        matched: matchedRows.map((r) => r.model),
        missing: unmatchedRows.map((r) => r.model),
        extra: unmatched,
        ocrText: rawOcrText,
        textLength: rawOcrText.length,
        historyId,
        inspectedAt: new Date().toISOString(),
        inspectionRows: tableRows,
        exactMatches: confirmedExactMatches,
        similarMatches: confirmedSimilarMatches,
        unmatchedCandidates: unmatched,
        candidateCount: tableRows.length,
      };

      setInspectionResult(finalResult);
      setScanState("result");
    } catch (err) {
      console.error("Save inspection error:", err);
      // Even if save fails, display current inspection result to user
      const finalResult: IInspectionResult = {
        sheetName: primarySheet,
        vendor,
        surgeryDate: surgeryDate || getTodayDateString(),
        verdict,
        referenceCount: tableRows.length,
        matchedCount: matchedRows.length,
        missingCount: unmatchedRows.length,
        extraCount: unmatched.length,
        matched: matchedRows.map((r) => r.model),
        missing: unmatchedRows.map((r) => r.model),
        extra: unmatched,
        ocrText: rawOcrText,
        textLength: rawOcrText.length,
        historyId: `hist-${Date.now()}`,
        inspectedAt: new Date().toISOString(),
        inspectionRows: tableRows,
      };
      setInspectionResult(finalResult);
      setScanState("result");
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
    setRawOcrText("");
    setOcrMatchResult(null);
    setInspectionResult(null);
    setFinalTableRows([]);
    setInspectionError(null);
    setMemo(""); // Keep vendor and surgery date, reset memo
    setScanState("form");
  };

  const handleReinspectSamePhoto = () => {
    if (processedBase64) {
      handleCropOcrConfirm(processedBase64, processedDataUrl);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased notranslate"
      translate="no"
    >
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
        {/* Inspection Error Alert Banner */}
        {inspectionError && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{inspectionError}</span>
            </div>
            <button
              onClick={() => setInspectionError(null)}
              className="text-xs font-semibold px-2 py-1 bg-white hover:bg-rose-100 rounded-lg border border-rose-300 transition-colors cursor-pointer"
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
                totalReferenceCount={totalReferenceCount}
                isLoadingReference={isLoadingReference}
                referenceError={referenceError}
                vendor={vendor}
                surgeryDate={surgeryDate}
                memo={memo}
                onChangeVendor={setVendor}
                onChangeSurgeryDate={setSurgeryDate}
                onChangeMemo={setMemo}
                onRetryLoadReference={loadReferenceData}
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
                onConfirm={handleCropOcrConfirm}
                onRetake={() => setScanState("camera")}
              />
            )}

            {scanState === "inspecting" && (
              <InspectionProgress onCancel={handleCancelInspection} />
            )}

            {scanState === "ocr_review" && ocrMatchResult && (
              <OcrRecognitionReview
                ocrText={rawOcrText}
                matchResult={ocrMatchResult}
                vendor={vendor}
                surgeryDate={surgeryDate}
                memo={memo}
                croppedDataUrl={processedDataUrl}
                onConfirm={handleOcrReviewConfirm}
                onRetakeOrRecrop={() => setScanState("review")}
              />
            )}

            {scanState === "result" && inspectionResult && (
              <InspectionResult
                result={inspectionResult}
                tableRows={finalTableRows}
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
          <HistoryView
            productGroups={productGroups}
            allReferenceRows={allReferenceRows}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>AI OCR 물품 코드 자동 검수 시스템 • 기준데이터 자동 매칭</p>
      </footer>
    </div>
  );
}
