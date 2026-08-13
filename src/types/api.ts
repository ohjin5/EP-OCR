export type ApiHealthStatus = "checking" | "connected" | "error";

export type InspectionVerdict = "일치" | "확인 필요" | "불일치" | "OCR 인식 실패" | "부분일치";

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

export interface ReferenceModel {
  sheetName: string;
  rowNumber: number;
  model: string;
  itemCode: string;
  itemName: string;
  specification: string;
  manufacturer: string;
  ediCode: string;
  vendor: string;
}

export interface IndexedReferenceModel extends ReferenceModel {
  normalizedModel: string;
}

export interface ExactModelMatch {
  type: "exact";
  ocrCandidate: string;
  reference: ReferenceModel;
}

export interface SimilarModelMatch {
  type: "similar";
  ocrCandidate: string;
  reference: ReferenceModel;
  distance: number;
}

export interface ModelMatchingResult {
  exactMatches: ExactModelMatch[];
  similarMatches: SimilarModelMatch[];
  unmatchedCandidates: string[];
}

export interface AllReferenceRowsResponse {
  success: boolean;
  total?: number;
  rows?: ReferenceModel[];
  message?: string;
}

export interface OcrApiResponse {
  success: boolean;
  ocrText?: string;
  textLength?: number;
  message?: string;
}

export interface SaveInspectionPayload {
  action?: "saveInspection";
  vendor: string;
  surgeryDate: string;
  memo: string;
  verdict: InspectionVerdict;
  ocrText: string;
  exactMatches: Array<{
    sheetName: string;
    model: string;
    itemCode?: string;
    itemName?: string;
    specification?: string;
  }>;
  similarMatches: Array<{
    sheetName: string;
    model: string;
    ocrCandidate: string;
  }>;
  unmatchedCandidates: string[];
}

export interface SaveInspectionResponse {
  success: boolean;
  message?: string;
  historyId?: string;
}

export interface InspectionRequest {
  base64Image: string;
  mimeType: "image/jpeg";
  sheetName?: string;
  vendor?: string;
  surgeryDate?: string;
  memo?: string;
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
  exactMatches?: ExactModelMatch[];
  similarMatches?: SimilarModelMatch[];
  unmatchedCandidates?: string[];
  candidateCount?: number;
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

export interface FinalizeInspectionRequest {
  historyId: string;
  sheetName: string;
  editedCodes: string[];
  matched: string[];
  missing: string[];
  verdict: InspectionVerdict;
}

export interface FinalizeInspectionResponse {
  success: boolean;
  message?: string;
}

export type CodeStatus = "matched" | "unmatched" | "duplicate" | "empty" | "excluded";

export interface EditableOcrCode {
  id: string;
  originalValue: string;
  editedValue: string;
  normalizedValue: string;
  selected: boolean;
  status: CodeStatus;
}
