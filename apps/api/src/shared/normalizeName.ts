export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
