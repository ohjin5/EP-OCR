import {
  HealthCheckResponse,
  HistoryApiResponse,
  HistoryItem,
  InspectionApiResponse,
  InspectionRequest,
  ModelsResponse,
  ProductGroup,
  ProductGroupsResponse,
  ReferenceRow,
  ReferenceRowsResponse,
  UpdateHistoryRequest,
  UpdateHistoryResponse,
} from "../types/api";
import { stripBase64Prefix } from "../utils/imageUtils";

export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyM6k6zuDw7NbfEdprj7E4adplw-y-WJ4x9bS8kmFYrXTvKainBixjWt57nrCGOt79-hQ/exec";

const DEFAULT_TIMEOUT_MS = 90000; // 90 seconds timeout for OCR processing

/**
 * Generic fetch wrapper with redirect follow & timeout support
 */
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      redirect: "follow",
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP 오류가 발생했습니다: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다 (90초). 인터넷 연결을 확인하고 다시 시도해 주세요.");
    }
    throw error;
  }
}

/**
 * 1. Health check
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  const url = `${APPS_SCRIPT_URL}?action=health`;
  try {
    return await fetchWithTimeout<HealthCheckResponse>(url, { method: "GET" }, 15000);
  } catch (err) {
    console.error("Health check error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Apps Script API 연결 실패",
    };
  }
}

/**
 * 2. Get Product Groups
 */
export async function getProductGroups(): Promise<ProductGroup[]> {
  const url = `${APPS_SCRIPT_URL}?action=productGroups`;
  const res = await fetchWithTimeout<ProductGroupsResponse>(url, { method: "GET" }, 20000);
  if (!res.success) {
    throw new Error(res.message || "제품군 목록을 불러오지 못했습니다.");
  }
  return res.groups || [];
}

/**
 * 3. Get Reference Models List
 */
export async function getModels(sheetName: string): Promise<string[]> {
  const encodedName = encodeURIComponent(sheetName);
  const url = `${APPS_SCRIPT_URL}?action=models&sheetName=${encodedName}`;
  const res = await fetchWithTimeout<ModelsResponse>(url, { method: "GET" }, 30000);
  if (!res.success) {
    throw new Error(res.message || "기준 모델 목록을 불러오지 못했습니다.");
  }
  return res.models || [];
}

/**
 * 4. Get Reference Rows Detailed Data
 */
export async function getReferenceRows(sheetName: string): Promise<ReferenceRow[]> {
  const encodedName = encodeURIComponent(sheetName);
  const url = `${APPS_SCRIPT_URL}?action=referenceRows&sheetName=${encodedName}`;
  const res = await fetchWithTimeout<ReferenceRowsResponse>(url, { method: "GET" }, 30000);
  if (!res.success) {
    throw new Error(res.message || "기준 데이터 상세 정보를 불러오지 못했습니다.");
  }
  return res.rows || [];
}

/**
 * 5. Submit Image for OCR Inspection
 */
export async function inspectImage(
  req: InspectionRequest,
  signal?: AbortSignal
): Promise<InspectionApiResponse> {
  const cleanBase64 = stripBase64Prefix(req.base64Image);

  const payload = {
    action: "inspect",
    base64Image: cleanBase64,
    mimeType: "image/jpeg",
    sheetName: req.sheetName,
    vendor: req.vendor || "",
    surgeryDate: req.surgeryDate || "",
    memo: req.memo || "",
  };

  // Note: Never log full base64 to console
  console.log(`[API] Submitting OCR inspection request for sheet: ${req.sheetName}, vendor: ${req.vendor}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OCR 서버 응답 오류 (${response.status})`);
    }

    const data = (await response.json()) as InspectionApiResponse;
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("OCR 검수 시간이 초과되었습니다 (90초). 인터넷 연결을 확인하고 다시 시도해 주세요.");
    }
    throw err;
  }
}

/**
 * 6. Get Inspection History
 */
export async function getInspectionHistory(limit = 100): Promise<HistoryItem[]> {
  const url = `${APPS_SCRIPT_URL}?action=history&limit=${limit}`;
  const res = await fetchWithTimeout<HistoryApiResponse>(url, { method: "GET" }, 30000);
  if (!res.success) {
    throw new Error(res.message || "검수 이력을 불러오지 못했습니다.");
  }
  return res.history || [];
}

/**
 * 7. Update History Record
 */
export async function updateHistoryRecord(req: UpdateHistoryRequest): Promise<UpdateHistoryResponse> {
  const payload = {
    action: "updateHistory",
    historyId: req.historyId,
    vendor: req.vendor,
    sheetName: req.sheetName,
    surgeryDate: req.surgeryDate,
    memo: req.memo,
  };

  const res = await fetchWithTimeout<UpdateHistoryResponse>(
    APPS_SCRIPT_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    },
    30000
  );

  return res;
}
