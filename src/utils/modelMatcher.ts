import {
  ReferenceModel,
  IndexedReferenceModel,
  ExactModelMatch,
  SimilarModelMatch,
  ModelMatchingResult,
  InspectionVerdict,
} from "../types/api";

/**
 * Normalize model string for strict comparison
 * Example: "RSZ-7300-MCS" -> "RSZ7300MCS"
 * "3501254 BC" -> "3501254BC"
 */
export function normalizeModel(value: string): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

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
    const normalizedModel = normalizeModel(row.model);
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

/**
 * Extract candidate strings from raw OCR text
 * Splits by line and tokens, combines adjacent tokens up to length 4.
 */
export function createOcrCandidates(ocrText: string): string[] {
  if (!ocrText || !ocrText.trim()) return [];

  const candidates = new Set<string>();

  const lines = ocrText
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalizedLine = normalizeModel(line);

    if (normalizedLine.length >= 4) {
      candidates.add(normalizedLine);
    }

    const tokens = line
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .map((v) => v.trim())
      .filter(Boolean);

    for (let start = 0; start < tokens.length; start++) {
      let combined = "";

      for (
        let length = 1;
        length <= 4 && start + length <= tokens.length;
        length++
      ) {
        combined += tokens[start + length - 1];
        const normalized = normalizeModel(combined);

        if (normalized.length >= 4) {
          candidates.add(normalized);
        }
      }
    }
  }

  return Array.from(candidates);
}

/**
 * Standard Levenshtein Distance calculation
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if distance is within allowed threshold based on length
 * len 5~7: <= 1
 * len 8~12: <= 1
 * len 13+: <= 2
 */
function isAllowedDistance(len: number, dist: number): boolean {
  if (len < 5) return false;
  if (len <= 12) return dist <= 1;
  return dist <= 2;
}

/**
 * Match OCR candidates against reference model index and entire dataset
 */
export function matchOcrTextWithReferences(
  ocrText: string,
  modelIndex: Map<string, IndexedReferenceModel[]>,
  allRows: ReferenceModel[]
): ModelMatchingResult {
  const candidates = createOcrCandidates(ocrText);
  if (candidates.length === 0) {
    return {
      exactMatches: [],
      similarMatches: [],
      unmatchedCandidates: [],
    };
  }

  const exactMatches: ExactModelMatch[] = [];
  const matchedCandidateSet = new Set<string>();
  const seenExactKeys = new Set<string>();

  // 1. Exact Map Search
  for (const candidate of candidates) {
    const rows = modelIndex.get(candidate);
    if (rows && rows.length > 0) {
      matchedCandidateSet.add(candidate);
      for (const row of rows) {
        const key = `${row.sheetName}-${row.rowNumber}-${row.model}`;
        if (!seenExactKeys.has(key)) {
          seenExactKeys.add(key);
          exactMatches.push({
            type: "exact",
            ocrCandidate: candidate,
            reference: row,
          });
        }
      }
    }
  }

  // 2. Substring search inside OCR lines for models with length >= 5
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => normalizeModel(l))
    .filter((l) => l.length >= 5);

  for (const row of allRows) {
    const normModel = normalizeModel(row.model);
    if (normModel.length < 5) continue;

    const key = `${row.sheetName}-${row.rowNumber}-${row.model}`;
    if (seenExactKeys.has(key)) continue;

    for (const line of lines) {
      if (line.includes(normModel)) {
        seenExactKeys.add(key);
        matchedCandidateSet.add(normModel);
        exactMatches.push({
          type: "exact",
          ocrCandidate: normModel,
          reference: row,
        });
        break;
      }
    }
  }

  // 3. Similar Match Search (only for candidates without exact match)
  const similarMatches: SimilarModelMatch[] = [];
  const seenSimilarKeys = new Set<string>();

  const remainingCandidates = candidates.filter(
    (cand) => !matchedCandidateSet.has(cand)
  );

  for (const candidate of remainingCandidates) {
    for (const row of allRows) {
      const normModel = normalizeModel(row.model);
      if (!normModel || normModel.length < 5) continue;

      // Skip if length diff is too large
      const lenDiff = Math.abs(candidate.length - normModel.length);
      if (lenDiff > 2) continue;

      const dist = getLevenshteinDistance(candidate, normModel);
      if (isAllowedDistance(normModel.length, dist)) {
        const key = `${row.sheetName}-${row.rowNumber}-${row.model}-${candidate}`;
        if (!seenSimilarKeys.has(key)) {
          seenSimilarKeys.add(key);
          similarMatches.push({
            type: "similar",
            ocrCandidate: candidate,
            reference: row,
            distance: dist,
          });
        }
      }
    }
  }

  // 4. Unmatched candidates
  const matchedSimilarCandidates = new Set(
    similarMatches.map((m) => m.ocrCandidate)
  );
  const unmatchedCandidates = candidates.filter(
    (cand) => !matchedCandidateSet.has(cand) && !matchedSimilarCandidates.has(cand)
  );

  return {
    exactMatches,
    similarMatches,
    unmatchedCandidates,
  };
}

/**
 * Determine final verdict based on confirmed matches and result state
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
