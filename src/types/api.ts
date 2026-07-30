export type ApiHealthStatus = "checking" | "connected" | "error";

export type InspectionVerdict = "일치" | "부분일치" | "불일치";

export interface ProductGroup {
  sheetName: string;
  displayName: string;
  modelColumn: number;
  modelCount: number;
}

export interface ReferenceRow {
  rowNumber: number;
  model: string;
  itemCode: string;
  itemName: string;
  specification: string;
  manufacturer: string;
  ediCode: string;
  vendor: string;
}

export interface InspectionRequest {
  base64Image: string;
  mimeType: "image/jpeg";
  sheetName: string;
  vendor: string;
  surgeryDate: string;
  memo: string;
}

export interface InspectionResult {
  sheetName: string;
  vendor: string;
  surgeryDate: string;
  verdict: InspectionVerdict;
  referenceCount: number;
  matchedCount: number;
  missingCount: number;
  extraCount: number;
  matched: string[];
  missing: string[];
  extra: string[];
  ocrText: string;
  textLength: number;
  historyId: string;
  inspectedAt: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  vendor: string;
  sheetName: string;
  surgeryDate: string;
  verdict: InspectionVerdict;
  referenceCount: number;
  matchedCount: number;
  missingCount: number;
  extraCount: number;
  matched: string[];
  missing: string[];
  extra: string[];
  ocrText: string;
  textLength: number;
  memo: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
  spreadsheetName?: string;
}

export interface ProductGroupsResponse {
  success: boolean;
  groups: ProductGroup[];
  message?: string;
}

export interface ModelsResponse {
  success: boolean;
  sheetName: string;
  models: string[];
  message?: string;
}

export interface ReferenceRowsResponse {
  success: boolean;
  sheetName: string;
  rows: ReferenceRow[];
  message?: string;
}

export interface InspectionApiResponse {
  success: boolean;
  result?: InspectionResult;
  message?: string;
}

export interface HistoryApiResponse {
  success: boolean;
  history: HistoryItem[];
  message?: string;
}

export interface UpdateHistoryRequest {
  historyId: string;
  vendor: string;
  sheetName: string;
  surgeryDate: string;
  memo: string;
}

export interface UpdateHistoryResponse {
  success: boolean;
  message?: string;
}
