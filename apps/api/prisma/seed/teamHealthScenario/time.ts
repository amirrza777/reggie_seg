import { DAY_MS } from "./constants";

export function toDateFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS);
}
