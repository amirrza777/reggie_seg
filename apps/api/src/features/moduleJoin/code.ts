import { randomBytes } from "node:crypto";

const DEFAULT_MODULE_JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const DEFAULT_MODULE_JOIN_CODE_LENGTH = 8;
const DEFAULT_MODULE_JOIN_CODE_MAX_ATTEMPTS = 20;
const MIN_MODULE_JOIN_CODE_LENGTH = 8;
const MIN_MODULE_JOIN_CODE_ALPHABET_SIZE = 16;
const MIN_MODULE_JOIN_CODE_MAX_ATTEMPTS = 5;

function parsePositiveIntEnv(name: string, fallback: number, minValue = 1) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < minValue) return fallback;
  return parsed;
}

function parseAlphabetEnv(name: string, fallback: string) {
  const raw = (process.env[name] ?? "").trim().toUpperCase();
  if (raw.length === 0) return fallback;
  const sanitized = raw.replace(/\s+/g, "");
  if (sanitized.length < MIN_MODULE_JOIN_CODE_ALPHABET_SIZE) return fallback;
  if (!/^[A-Z0-9]+$/.test(sanitized)) return fallback;
  const deduplicated = Array.from(new Set(sanitized.split(""))).join("");
  if (deduplicated.length < MIN_MODULE_JOIN_CODE_ALPHABET_SIZE) return fallback;
  return deduplicated;
}

export const MODULE_JOIN_CODE_ALPHABET = parseAlphabetEnv(
  "MODULE_JOIN_CODE_ALPHABET",
  DEFAULT_MODULE_JOIN_CODE_ALPHABET,
);
export const MODULE_JOIN_CODE_LENGTH = parsePositiveIntEnv(
  "MODULE_JOIN_CODE_LENGTH",
  DEFAULT_MODULE_JOIN_CODE_LENGTH,
  MIN_MODULE_JOIN_CODE_LENGTH,
);
export const MODULE_JOIN_CODE_MAX_ATTEMPTS = parsePositiveIntEnv(
  "MODULE_JOIN_CODE_MAX_ATTEMPTS",
  DEFAULT_MODULE_JOIN_CODE_MAX_ATTEMPTS,
  MIN_MODULE_JOIN_CODE_MAX_ATTEMPTS,
);

export function normalizeModuleJoinCode(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== MODULE_JOIN_CODE_LENGTH) {
    return null;
  }

  for (const character of normalized) {
    if (!MODULE_JOIN_CODE_ALPHABET.includes(character)) {
      return null;
    }
  }

  return normalized;
}

export function createModuleJoinCodeCandidate() {
  const random = randomBytes(MODULE_JOIN_CODE_LENGTH);
  let code = "";
  for (const value of random) {
    code += MODULE_JOIN_CODE_ALPHABET[value % MODULE_JOIN_CODE_ALPHABET.length];
  }
  return code;
}
