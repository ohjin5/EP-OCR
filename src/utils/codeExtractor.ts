/**
 * OCR text parser and candidate code extractor for item/model codes.
 */

// Common headers and keywords to exclude
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

// Pure Date regex pattern (e.g. 2024.05.20, 2024-12-31, 24/05/20)
const DATE_PATTERN = /^\d{2,4}[\.\-\/]\d{1,2}[\.\-\/]\d{1,2}$/;

// Pure Phone regex pattern (e.g. 02-1234-5678, 010-1234-5678)
const PHONE_PATTERN = /^0\d{1,2}[\.\-]?\d{3,4}[\.\-]?\d{4}$/;

// Pure Number pattern
const PURE_NUMBER_PATTERN = /^\d+$/;

// General Model Code Regex Pattern:
// Must contain at least 1 letter and at least 1 number, with letters, numbers, and optional hyphens.
const MODEL_CODE_REGEX = /[A-Z]+[A-Z0-9\-]*\d+[A-Z0-9\-]*/gi;

/**
 * Clean & normalize a string for strict model matching (uppercase, letters & digits only)
 */
export function normalizeCode(code: string): string {
  if (!code) return "";
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Extract model code candidates from raw OCR text
 */
export function extractCandidateCodes(ocrText: string): string[] {
  if (!ocrText || typeof ocrText !== "string") return [];

  const lines = ocrText.split(/\r?\n/);
  const candidatesSet = new Set<string>();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check if line is excluded header or keywords
    const upperTrimmed = trimmed.toUpperCase();

    // Skip if pure date or phone or pure number
    if (
      DATE_PATTERN.test(trimmed) ||
      PHONE_PATTERN.test(trimmed) ||
      PURE_NUMBER_PATTERN.test(trimmed)
    ) {
      continue;
    }

    // Skip if line is just a keyword header
    if (EXCLUDED_KEYWORDS.some((kw) => upperTrimmed === kw || upperTrimmed === `${kw}:`)) {
      continue;
    }

    // Try regex match for Model Code pattern
    const matches = trimmed.match(MODEL_CODE_REGEX);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const clean = m.toUpperCase().trim();
        const norm = normalizeCode(clean);

        // Filter constraints:
        // Must have at least 1 letter, at least 1 number, normalized length >= 5
        const hasLetter = /[A-Z]/.test(clean);
        const hasDigit = /\d/.test(clean);

        if (hasLetter && hasDigit && norm.length >= 5) {
          // Avoid pure LOT / EXP prefixes if mistakenly caught
          if (!clean.startsWith("LOT") && !clean.startsWith("EXP") && !clean.startsWith("SN")) {
            candidatesSet.add(clean);
          }
        }
      }
    } else {
      // Fallback: If no direct match but line looks like single token code
      const cleanLine = trimmed.toUpperCase().replace(/\s+/g, "");
      const norm = normalizeCode(cleanLine);
      const hasLetter = /[A-Z]/.test(cleanLine);
      const hasDigit = /\d/.test(cleanLine);

      if (hasLetter && hasDigit && norm.length >= 5) {
        if (!EXCLUDED_KEYWORDS.some((kw) => cleanLine.includes(kw))) {
          candidatesSet.add(cleanLine);
        }
      }
    }
  }

  return Array.from(candidatesSet);
}

/**
 * Compare candidate codes with reference models list and return verdict & details
 */
export function compareCandidateCodes(
  candidates: string[],
  referenceModels: string[]
): {
  verdict: "일치" | "부분일치" | "불일치";
  matched: string[];
  extra: string[];
  missing: string[];
  matchedCount: number;
  extraCount: number;
  missingCount: number;
  referenceCount: number;
} {
  const normRefMap = new Map<string, string>(); // normalized -> original reference
  referenceModels.forEach((ref) => {
    normRefMap.set(normalizeCode(ref), ref);
  });

  const matchedSet = new Set<string>();
  const extraSet = new Set<string>();

  const refMatchedNorms = new Set<string>();

  candidates.forEach((cand) => {
    const norm = normalizeCode(cand);
    if (normRefMap.has(norm)) {
      const origRef = normRefMap.get(norm)!;
      matchedSet.add(origRef);
      refMatchedNorms.add(norm);
    } else {
      extraSet.add(cand);
    }
  });

  const missingList: string[] = [];
  referenceModels.forEach((ref) => {
    const norm = normalizeCode(ref);
    if (!refMatchedNorms.has(norm)) {
      missingList.push(ref);
    }
  });

  const matchedList = Array.from(matchedSet);
  const extraList = Array.from(extraSet);

  const matchedCount = matchedList.length;
  const missingCount = missingList.length;
  const extraCount = extraList.length;
  const referenceCount = referenceModels.length;

  let verdict: "일치" | "부분일치" | "불일치";
  if (matchedCount > 0 && missingCount === 0 && extraCount === 0) {
    verdict = "일치";
  } else if (matchedCount > 0) {
    verdict = "부분일치";
  } else {
    verdict = "불일치";
  }

  return {
    verdict,
    matched: matchedList,
    extra: extraList,
    missing: missingList,
    matchedCount,
    extraCount,
    missingCount,
    referenceCount,
  };
}

import { EditableOcrCode } from "../types/api";

/**
 * Recalculate status for each EditableOcrCode based on reference models and prior duplicates
 */
export function recalculateCodeList(
  items: EditableOcrCode[],
  referenceModels: string[]
): EditableOcrCode[] {
  const normRefMap = new Map<string, string>();
  referenceModels.forEach((ref) => {
    normRefMap.set(normalizeCode(ref), ref);
  });

  const seenSelectedNorms = new Set<string>();

  return items.map((item) => {
    if (!item.selected) {
      return { ...item, status: "excluded" };
    }

    const trimmed = item.editedValue.trim();
    if (!trimmed) {
      return { ...item, status: "empty" };
    }

    const norm = normalizeCode(trimmed);

    // Duplicate check among selected non-empty items
    if (seenSelectedNorms.has(norm)) {
      return { ...item, normalizedValue: norm, status: "duplicate" };
    }

    seenSelectedNorms.add(norm);

    if (normRefMap.has(norm)) {
      return { ...item, normalizedValue: norm, status: "matched" };
    } else {
      return { ...item, normalizedValue: norm, status: "unmatched" };
    }
  });
}
