export type BitWidth = 3 | 4 | 6;

export interface BinaryState {
  code: string;
  value: number;
  bits: BitWidth;
}

export interface CatalogEntry {
  code: string;
  number?: number;
  name: string;
}

export interface CatalogValidation {
  valid: boolean;
  duplicateCodes: string[];
  duplicateNumbers: number[];
  missingCodes: string[];
  invalidCodes: string[];
}

export function strongEquivalence(
  left: number,
  right: number,
  bits: BitWidth = 6
): number {
  const mask = (1 << bits) - 1;
  return (~(left ^ right)) & mask;
}

export function strongEquivalenceCode(left: string, right: string): string {
  validateMatchingCodes(left, right);
  const bits = left.length as BitWidth;
  return strongEquivalence(
    Number.parseInt(left, 2),
    Number.parseInt(right, 2),
    bits
  )
    .toString(2)
    .padStart(bits, "0");
}

export function binaryState(code: string): BinaryState {
  validateCode(code);
  return {
    code,
    value: Number.parseInt(code, 2),
    bits: code.length as BitWidth,
  };
}

export function operatorBetween(rootCode: string, resultantCode: string): BinaryState {
  return binaryState(strongEquivalenceCode(rootCode, resultantCode));
}

export function applyStrongEquivalence(
  stateCode: string,
  operatorCode: string
): BinaryState {
  return binaryState(strongEquivalenceCode(stateCode, operatorCode));
}

export function validateBinaryCatalog(
  entries: CatalogEntry[],
  bits: BitWidth
): CatalogValidation {
  const codeCounts = new Map<string, number>();
  const numberCounts = new Map<number, number>();
  const invalidCodes: string[] = [];

  for (const entry of entries) {
    if (entry.code.length !== bits || !/^[01]+$/.test(entry.code)) {
      invalidCodes.push(entry.code);
    }
    codeCounts.set(entry.code, (codeCounts.get(entry.code) ?? 0) + 1);
    if (entry.number !== undefined) {
      numberCounts.set(entry.number, (numberCounts.get(entry.number) ?? 0) + 1);
    }
  }

  const duplicateCodes = [...codeCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([code]) => code)
    .sort();
  const duplicateNumbers = [...numberCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
    .sort((a, b) => a - b);
  const expectedCodes = Array.from({ length: 1 << bits }, (_, value) =>
    value.toString(2).padStart(bits, "0")
  );
  const presentCodes = new Set(entries.map((entry) => entry.code));
  const missingCodes = expectedCodes.filter((code) => !presentCodes.has(code));

  return {
    valid:
      duplicateCodes.length === 0 &&
      duplicateNumbers.length === 0 &&
      missingCodes.length === 0 &&
      invalidCodes.length === 0,
    duplicateCodes,
    duplicateNumbers,
    missingCodes,
    invalidCodes,
  };
}

function validateMatchingCodes(left: string, right: string): void {
  validateCode(left);
  validateCode(right);
  if (left.length !== right.length) {
    throw new Error("Binary codes must have equal widths");
  }
}

function validateCode(code: string): void {
  if (![3, 4, 6].includes(code.length) || !/^[01]+$/.test(code)) {
    throw new Error("Binary code must contain exactly 3, 4, or 6 bits");
  }
}
