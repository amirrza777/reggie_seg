import { afterEach, describe, expect, it, vi } from "vitest";

describe("seed schema dynamic branches", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns empty manifest when prisma dmmf models are unavailable", async () => {
    vi.doMock("@prisma/client", () => ({
      Prisma: { dmmf: undefined },
    }));

    const schema = await import("../../../../prisma/seed/schema");
    expect(schema.getSeedCleanupManifest()).toEqual([]);
  });

  it("ignores object fields without relationFromFields in dependency sort", async () => {
    vi.doMock("@prisma/client", () => ({
      Prisma: {
        dmmf: {
          datamodel: {
            models: [
              {
                name: "Parent",
                fields: [],
              },
              {
                name: "Child",
                fields: [
                  { kind: "object", type: "Parent" },
                  { kind: "object", type: "Parent", relationFromFields: [] },
                  { kind: "object", type: "Parent", relationFromFields: ["parentId"] },
                ],
              },
            ],
          },
        },
      },
    }));

    const schema = await import("../../../../prisma/seed/schema");
    const manifest = schema.getSeedCleanupManifest();
    const tableOrder = manifest.map((entry) => entry.tableName);
    expect(tableOrder.indexOf("Child")).toBeLessThan(tableOrder.indexOf("Parent"));
  });
});
