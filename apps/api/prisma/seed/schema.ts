import { Prisma } from "@prisma/client";

export type SeedCleanupEntry = {
  modelName: string;
  delegateName: string;
  tableName: string;
  dependsOn: string[];
};

type DmmfModel = {
  name: string;
  dbName?: string | null;
  fields: Array<{
    kind: string;
    type: string;
    relationFromFields?: string[];
  }>;
};

function toDelegateName(modelName: string) {
  return `${modelName.slice(0, 1).toLowerCase()}${modelName.slice(1)}`;
}

function getDmmfModels(): DmmfModel[] {
  return (Prisma.dmmf?.datamodel?.models ?? []) as DmmfModel[];
}

function buildCleanupEntries(): SeedCleanupEntry[] {
  const models = getDmmfModels();
  const modelByName = new Map(models.map((model) => [model.name, model]));

  const unsorted = models.map<SeedCleanupEntry>((model) => ({
    modelName: model.name,
    delegateName: toDelegateName(model.name),
    tableName: model.dbName ?? model.name,
    dependsOn: Array.from(
      new Set(
        model.fields
          .filter((field) => field.kind === "object" && (field.relationFromFields?.length ?? 0) > 0)
          .map((field) => field.type)
          .filter((dependency) => modelByName.has(dependency)),
      ),
    ),
  }));

  return sortCleanupEntries(unsorted);
}

function sortCleanupEntries(entries: SeedCleanupEntry[]) {
  const byName = new Map(entries.map((entry) => [entry.modelName, entry]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: SeedCleanupEntry[] = [];

  function visit(modelName: string) {
    if (visited.has(modelName)) return;
    if (visiting.has(modelName)) return;

    visiting.add(modelName);
    const entry = byName.get(modelName);
    if (entry) {
      for (const dependency of entry.dependsOn) {
        visit(dependency);
      }
      ordered.push(entry);
    }
    visiting.delete(modelName);
    visited.add(modelName);
  }

  for (const entry of entries) {
    visit(entry.modelName);
  }

  return ordered.reverse();
}

export function getSeedCleanupManifest() {
  return buildCleanupEntries();
}

export function assertSeedCleanupCoverage(prismaLike: Record<string, unknown>) {
  const manifest = getSeedCleanupManifest();
  const coveredDelegates = new Set(manifest.map((entry) => entry.delegateName));

  const missingDelegates = Object.entries(prismaLike)
    .filter(
      ([key, value]) =>
        !key.startsWith("$") &&
        !key.startsWith("_") &&
        value &&
        typeof value === "object",
    )
    .map(([key]) => key)
    .filter((key) => !coveredDelegates.has(key));

  if (missingDelegates.length > 0) {
    throw new Error(`Seed cleanup manifest is missing Prisma delegates: ${missingDelegates.sort().join(", ")}`);
  }
}
