import { describe, expect, it, vi } from "vitest";
import {
  buildEnterpriseCodeBase,
  ensureUniqueEnterpriseCode,
  EnterpriseCodeGeneratorService,
} from "./enterpriseCodeGeneratorService.js";

describe("buildEnterpriseCodeBase", () => {
  it("generates initials for multi-word names", () => {
    expect(buildEnterpriseCodeBase("King's College London")).toBe("KCL");
  });

  it("normalizes accents and punctuation", () => {
    expect(buildEnterpriseCodeBase("École supérieure")).toBe("ESU");
  });

  it("falls back to ENT when name has no alphanumeric characters", () => {
    expect(buildEnterpriseCodeBase("...")).toBe("ENT");
  });
});

describe("ensureUniqueEnterpriseCode", () => {
  it("returns base code when not taken", () => {
    expect(ensureUniqueEnterpriseCode("KCL", ["ABC", "DEF"])).toBe("KCL");
  });

  it("returns the smallest numeric suffix when base is taken", () => {
    expect(ensureUniqueEnterpriseCode("KCL", ["KCL", "KCL2", "KCL4"])).toBe("KCL3");
  });

  it("truncates before suffix when base length is at max", () => {
    const base = "ABCDEFGHIJKLMNOP";
    expect(ensureUniqueEnterpriseCode(base, [base])).toBe("ABCDEFGHIJKLMNO2");
  });
});

describe("EnterpriseCodeGeneratorService", () => {
  it("combines base generation with uniqueness lookup", async () => {
    const enterpriseLookup = {
      findMany: vi.fn().mockResolvedValue([{ code: "KCL" }, { code: "KCL2" }]),
    };

    const service = new EnterpriseCodeGeneratorService(enterpriseLookup);
    const generated = await service.generateFromName("King's College London");

    expect(enterpriseLookup.findMany).toHaveBeenCalledWith({ select: { code: true } });
    expect(generated).toBe("KCL3");
  });
});

