import { randomBytes } from "node:crypto";

const DEFAULT_MODULE_JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const DEFAULT_MODULE_JOIN_CODE_LENGTH = 8;
const DEFAULT_MODULE_JOIN_CODE_MAX_ATTEMPTS = 20;

function parsePositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseAlphabetEnv(name: string, fallback: string) {
  const raw = (process.env[name] ?? "").trim().toUpperCase();
  if (raw.length === 0) return fallback;
  const sanitized = raw.replace(/\s+/g, "");
  if (sanitized.length < 8) return fallback;
  if (!/^[A-Z0-9]+$/.test(sanitized)) return fallback;
  return Array.from(new Set(sanitized.split(""))).join("");
}

export const MODULE_JOIN_CODE_ALPHABET = parseAlphabetEnv(
  "MODULE_JOIN_CODE_ALPHABET",
  DEFAULT_MODULE_JOIN_CODE_ALPHABET,
);
export const MODULE_JOIN_CODE_LENGTH = parsePositiveIntEnv(
  "MODULE_JOIN_CODE_LENGTH",
  DEFAULT_MODULE_JOIN_CODE_LENGTH,
);
export const MODULE_JOIN_CODE_MAX_ATTEMPTS = parsePositiveIntEnv(
  "MODULE_JOIN_CODE_MAX_ATTEMPTS",
  DEFAULT_MODULE_JOIN_CODE_MAX_ATTEMPTS,
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
