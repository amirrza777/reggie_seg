import { randomBytes } from "node:crypto";

const MODULE_JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const MODULE_JOIN_CODE_LENGTH = 8;
export const MODULE_JOIN_CODE_MAX_ATTEMPTS = 20;

export function createModuleJoinCodeCandidate() {
  const random = randomBytes(MODULE_JOIN_CODE_LENGTH);
  let code = "";
  for (const value of random) {
    code += MODULE_JOIN_CODE_ALPHABET[value % MODULE_JOIN_CODE_ALPHABET.length];
  }
  return code;
}
