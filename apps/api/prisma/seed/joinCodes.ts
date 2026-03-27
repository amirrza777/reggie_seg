import { randomBytes } from "node:crypto";
import { SEED_FIXTURE_JOIN_CODES } from "./config";

const SEED_JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const SEED_JOIN_CODE_LENGTH = 8;

export function planSeedModuleJoinCode(index: number) {
  if (SEED_FIXTURE_JOIN_CODES) {
    return `SM${String(index + 1).padStart(6, "0")}`;
  }

  const random = randomBytes(SEED_JOIN_CODE_LENGTH);
  let code = "";
  for (const value of random) {
    code += SEED_JOIN_CODE_ALPHABET[value % SEED_JOIN_CODE_ALPHABET.length];
  }
  return code;
}
