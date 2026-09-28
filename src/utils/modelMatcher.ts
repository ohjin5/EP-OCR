import {
  ReferenceModel,
  IndexedReferenceModel,
  ExactModelMatch,
  SimilarModelMatch,
  ModelMatchingResult,
  InspectionVerdict,
  OcrCodeCandidate,
  InspectionTableRow,
} from "../types/api";

/**
 * Clean & normalize model string for strict comparison
 * Example: "DWX-2SS" -> "DWX2SS"
 * "3501254 BC" -> "3501254BC"
 */
export function normalizeModelCode(value: string): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[-_.]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

// Alias for backwards compatibility
export const normalizeModel = normalizeModelCode;

/**
 * Build Map<string, IndexedReferenceModel[]>
 * Uses an array because the same model code might exist in multiple product groups/sheets.
 */
export function createModelIndex(
  rows: ReferenceModel[]
): Map<string, IndexedReferenceModel[]> {
  const index = new Map<string, IndexedReferenceModel[]>();

  for (const row of rows) {
    if (!row.model) continue;
    const normalizedModel = normalizeModelCode(row.model);
    if (!normalizedModel) continue;

    const indexed: IndexedReferenceModel = {
      ...row,
      normalizedModel,
    };

    const current = index.get(normalizedModel) ?? [];
    current.push(indexed);
    index.set(normalizedModel, current);
  }

  return index;
}

// Keywords to skip when parsing candidate tokens
const EXCLUDED_KEYWORDS = [
  "품목코드",
  "물품코드",
  "자재코드",
  "모델명",
  "ITEM",
  "CODE",
  "MODEL",
  "LOT",
  "LOTNO",
  "SERIAL",
  "S/N",
  "EXP",
  "DATE",
  "보험코드",
  "EDI",
  "유효기간",
  "제조일자",
  "수량",
  "QTY",
  "EA",
  "TEL",
  "PHONE",
  "FAX",
];

const DATE_PATTERN = /^\d{2,4}[\.\-\/]\d{1,2}[\.\-\/]\d{1,2}$/;
const PHONE_PATTERN = /^0\d{1,2}[\.\-]?\d{3,4}[\.\-]?\d{4}$/;
const PURE_NUMBER_PATTERN = /^\d+$/;

/**
 * Step 1: Extract candidate code objects from raw OCR text line by line
 */
export function extractCandidateCodesFromOcrText(ocrText: string): OcrCodeCandidate[] {
  if (!ocrText || !ocrText.trim()) return [];

  const rawLines = ocrText
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);

  const candidates: OcrCodeCandidate[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const upper = line.toUpperCase();

    // Skip dates, pure phones, or pure numbers
    if (
      DATE_PATTERN.test(line) ||
      PHONE_PATTERN.test(line) ||
      PURE_NUMBER_PATTERN.test(line)
    ) {
      continue;
    }

    // Skip header line
    if (EXCLUDED_KEYWORDS.some((kw) => upper === kw || upper === `${kw}:`)) {
      continue;
    }

    // Extract potential candidate tokens from line
    const tokens = line
      .split(/[\s,;:\/|\t]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const norm = normalizeModelCode(token);
      if (norm.length < 4) continue;

      const upperToken = token.toUpperCase();
      if (EXCLUDED_KEYWORDS.some((kw) => upperToken.includes(kw))) {
        continue;
      }

      // Check if candidate contains at least one letter and at least one digit or valid code structure
      const hasLetter = /[A-Z]/.test(norm);
      const hasDigit = /\d/.test(norm);

      if ((hasLetter && hasDigit) || norm.length >= 6) {
        candidates.push({
          raw: token,
          normalized: norm,
          lineNumber: idx + 1,
        });
      }
    }
  }

  return candidates;
}

/**
 * Step 2: Deduplicate candidate codes by normalized value
 */
export function deduplicateCandidates(candidates: OcrCodeCandidate[]): {
  deduplicated: OcrCodeCandidate[];
  rawCount: number;
  deduplicatedCount: number;
  removedDuplicateCount: number;
} {
  const map = new Map<string, OcrCodeCandidate>();

  for (const candidate of candidates) {
    if (!candidate.normalized) continue;
    if (!map.has(candidate.normalized)) {
      map.set(candidate.normalized, candidate);
    }
  }

  const deduplicated = Array.from(map.values());
  const rawCount = candidates.length;
  const deduplicatedCount = deduplicated.length;
  const removedDuplicateCount = rawCount - deduplicatedCount;

  return {
    deduplicated,
    rawCount,
    deduplicatedCount,
    removedDuplicateCount,
  };
}

/**
 * Levenshtein Distance calculation for similar matches
 */
export function getLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function isAllowedDistance(len: number, dist: number): boolean {
  if (len < 5) return false;
  if (len <= 12) return dist <= 1;
  return dist <= 2;
}

/**
 * Step 3: Match OCR candidates against reference models
 * Pipeline: Extract Candidates -> Deduplicate -> Reference Comparison -> Output Table Rows & Counts
 */
export function matchOcrTextWithReferences(
  ocrText: string,
  modelIndex: Map<string, IndexedReferenceModel[]>,
  allRows: ReferenceModel[]
): ModelMatchingResult {
  const rawCandidates = extractCandidateCodesFromOcrText(ocrText);
  const { deduplicated, rawCount, deduplicatedCount, removedDuplicateCount } =
    deduplicateCandidates(rawCandidates);

  if (deduplicated.length === 0) {
    return {
      rawCandidateCount: 0,
      deduplicatedCandidateCount: 0,
      removedDuplicateCount: 0,
      exactMatches: [],
      similarMatches: [],
      unmatchedCandidates: [],
      tableRows: [],
    };
  }

  const exactMatches: ExactModelMatch[] = [];
  const similarMatches: SimilarModelMatch[] = [];
  const unmatchedCandidates: string[] = [];
  const tableRows: InspectionTableRow[] = [];

  const seenTableModels = new Set<string>();

  for (const candidate of deduplicated) {
    const matchedRows = modelIndex.get(candidate.normalized);

    if (matchedRows && matchedRows.length > 0) {
      // 1. Exact Match found in Reference Data
      for (const ref of matchedRows) {
        exactMatches.push({
          type: "exact",
          ocrCandidate: candidate.raw,
          reference: ref,
        });

        const rowKey = `${ref.sheetName}-${ref.model}`;
        if (!seenTableModels.has(rowKey)) {
          seenTableModels.add(rowKey);
          tableRows.push({
            sheetName: ref.sheetName,
            model: ref.model,
            itemName: ref.itemName || "-",
            specification: ref.specification || "-",
            itemCode: ref.itemCode || "-",
            manufacturer: ref.manufacturer || "-",
            ediCode: ref.ediCode || "-",
            vendor: ref.vendor || "-",
            status: "matched",
          });
        }
      }
    } else {
      // 2. Try Similar Match in reference rows
      let foundSimilar: ReferenceModel | null = null;
      let minDistance = 99;

      for (const ref of allRows) {
        const normModel = normalizeModelCode(ref.model);
        if (!normModel || normModel.length < 5) continue;

        const lenDiff = Math.abs(candidate.normalized.length - normModel.length);
        if (lenDiff > 2) continue;

        const dist = getLevenshteinDistance(candidate.normalized, normModel);
        if (isAllowedDistance(normModel.length, dist) && dist < minDistance) {
          minDistance = dist;
          foundSimilar = ref;
        }
      }

      if (foundSimilar) {
        similarMatches.push({
          type: "similar",
          ocrCandidate: candidate.raw,
          reference: foundSimilar,
          distance: minDistance,
        });

        const rowKey = `${foundSimilar.sheetName}-${foundSimilar.model}`;
        if (!seenTableModels.has(rowKey)) {
          seenTableModels.add(rowKey);
          tableRows.push({
            sheetName: foundFoundSheet(foundSimilar),
            model: foundSimilar.model,
            itemName: foundSimilar.itemName || "-",
            specification: foundSimilar.specification || "-",
            itemCode: foundSimilar.itemCode || "-",
            manufacturer: foundSimilar.manufacturer || "-",
            ediCode: foundSimilar.ediCode || "-",
            vendor: foundSimilar.vendor || "-",
            status: "matched",
          });
        }
      } else {
        // 3. Unmatched Candidate (CRITICAL: Do NOT discard! Include in table as unmatched/미등록)
        unmatchedCandidates.push(candidate.raw);

        const rowKey = `미등록-${candidate.raw}`;
        if (!seenTableModels.has(rowKey)) {
          seenTableModels.add(rowKey);
          tableRows.push({
            sheetName: "미등록",
            model: candidate.raw,
            itemName: "미등록 품목 (코드 미존재)",
            specification: "-",
            itemCode: "-",
            manufacturer: "-",
            ediCode: "-",
            vendor: "-",
            status: "unmatched",
          });
        }
      }
    }
  }

  return {
    rawCandidateCount: rawCount,
    deduplicatedCandidateCount: deduplicatedCount,
    removedDuplicateCount,
    exactMatches,
    similarMatches,
    unmatchedCandidates,
    tableRows,
  };
}

function foundFoundSheet(ref: ReferenceModel): string {
  return ref.sheetName || "전체검수";
}

/**
 * Determine final verdict based on confirmed matches
 */
export function calculateVerdict(
  exactCount: number,
  similarCount: number,
  ocrTextLength: number,
  hasAmbiguity = false
): InspectionVerdict {
  if (ocrTextLength === 0) {
    return "OCR 인식 실패";
  }
  if (exactCount >= 1 && !hasAmbiguity) {
    return "일치";
  }
  if (exactCount >= 1 && hasAmbiguity) {
    return "확인 필요";
  }
  if (similarCount >= 1) {
    return "확인 필요";
  }
  return "불일치";
}
