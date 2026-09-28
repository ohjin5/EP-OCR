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

export interface OcrCodeCandidate {
  raw: string;
  normalized: string;
  lineNumber?: number;
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
  rawCandidateCount: number;
  deduplicatedCandidateCount: number;
  removedDuplicateCount: number;
  exactMatches: ExactModelMatch[];
  similarMatches: SimilarModelMatch[];
  unmatchedCandidates: string[];
  tableRows: InspectionTableRow[];
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
  surgeryDate?: string;
  memo: string;
  verdict: InspectionVerdict;
  ocrText: string;
  inspectionRows: InspectionTableRow[];
  sheetName?: string;
  matched?: string[];
  missing?: string[];
  extra?: string[];
  matchedCount?: number;
  missingCount?: number;
  extraCount?: number;
  referenceCount?: number;
  totalCount?: number;
  exactMatches?: Array<{
    sheetName: string;
    model: string;
    itemCode?: string;
    itemName?: string;
    specification?: string;
  }>;
  similarMatches?: Array<{
    sheetName: string;
    model: string;
    ocrCandidate: string;
  }>;
  unmatchedCandidates?: string[];
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
  inspectionRows?: InspectionTableRow[];
  exactMatches?: ExactModelMatch[];
  similarMatches?: SimilarModelMatch[];
  unmatchedCandidates?: string[];
  candidateCount?: number;
  rawCandidateCount?: number;
  deduplicatedCandidateCount?: number;
  removedDuplicateCount?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  vendor: string;
  sheetName: string;
  surgeryDate?: string;
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
  inspectionRows?: InspectionTableRow[];
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

export type MatchStatus = "matched" | "unmatched";

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  matched: "일치",
  unmatched: "불일치",
};

export const RESULT_LABELS = {
  total: "총 검수 항목",
  matched: "일치 항목",
  unmatched: "불일치 항목",
  exactMatch: "일치",
  mismatch: "불일치",
  review: "검수 결과 확인",
} as const;

export interface InspectionTableRow {
  sheetName: string;
  model: string;
  itemName: string;
  specification: string;
  itemCode: string;
  manufacturer: string;
  ediCode: string;
  vendor?: string;
  status: MatchStatus;
}
