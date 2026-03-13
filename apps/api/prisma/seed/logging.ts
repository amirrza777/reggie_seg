type SeedLogResult<T> = {
  value: T;
  rows: number;
  details?: string;
};

function formatRows(rows: number) {
  return `${rows} row${rows === 1 ? "" : "s"} seeded`;
}

export async function withSeedLogging<T>(
  step: string,
  work: () => Promise<SeedLogResult<T>>
): Promise<T> {
  try {
    const result = await work();
    const detailSuffix = result.details ? `; ${result.details}` : "";
    console.log(`[seed] ${step}: success (${formatRows(result.rows)}${detailSuffix})`);
    return result.value;
  } catch (error) {
    console.error(`[seed] ${step}: failed`, error);
    throw error;
  }
}
