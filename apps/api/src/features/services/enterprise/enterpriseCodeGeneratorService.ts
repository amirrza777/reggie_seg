import { prisma } from "../../../shared/db.js";

const MAX_ENTERPRISE_CODE_LENGTH = 16;
const MIN_BASE_CODE_LENGTH = 3;
const FALLBACK_ENTERPRISE_CODE = "ENT";

type EnterpriseCodeRow = { code: string };

type EnterpriseLookup = {
  findMany(args: { select: { code: true } }): Promise<EnterpriseCodeRow[]>;
};

export class EnterpriseCodeGeneratorService {
  constructor(private readonly enterpriseLookup: EnterpriseLookup = prisma.enterprise) {}

  async generateFromName(name: string): Promise<string> {
    const baseCode = buildEnterpriseCodeBase(name);
    const existingCodes = await this.enterpriseLookup.findMany({ select: { code: true } });
    return ensureUniqueEnterpriseCode(baseCode, existingCodes.map((row) => row.code));
  }
}

export function buildEnterpriseCodeBase(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toUpperCase();
  const words = normalized.split(/[^A-Z0-9]+/).filter(Boolean);

  if (words.length === 0) return FALLBACK_ENTERPRISE_CODE;

  const chars: string[] = words.map((word) => word[0]).filter(Boolean) as string[];

  if (chars.length < MIN_BASE_CODE_LENGTH) {
    for (const word of [...words].reverse()) {
      for (const ch of word.slice(1)) {
        chars.push(ch);
        if (chars.length >= MIN_BASE_CODE_LENGTH) break;
      }
      if (chars.length >= MIN_BASE_CODE_LENGTH) break;
    }
  }

  if (chars.length < MIN_BASE_CODE_LENGTH) {
    for (const ch of FALLBACK_ENTERPRISE_CODE) {
      chars.push(ch);
      if (chars.length >= MIN_BASE_CODE_LENGTH) break;
    }
  }

  return chars.join("").slice(0, MAX_ENTERPRISE_CODE_LENGTH);
}

export function ensureUniqueEnterpriseCode(baseCode: string, existingCodes: string[]): string {
  const normalizedExisting = new Set(existingCodes.map((code) => code.toUpperCase()));
  if (!normalizedExisting.has(baseCode.toUpperCase())) return baseCode;

  let suffix = 2;
  while (true) {
    const suffixText = String(suffix);
    const prefixLength = Math.max(0, MAX_ENTERPRISE_CODE_LENGTH - suffixText.length);
    const candidate = `${baseCode.slice(0, prefixLength)}${suffixText}`;
    if (!normalizedExisting.has(candidate.toUpperCase())) return candidate;
    suffix += 1;
  }
}
