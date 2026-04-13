import { describe, expect, it } from "vitest";

import { buildPrismaMock } from "../../seed.script.shared.impl";

describe("seed.script.shared.impl", () => {
  it("covers all $transaction argument branches", async () => {
    const prismaMock = buildPrismaMock();

    const fromArray = await prismaMock.$transaction([Promise.resolve(1), Promise.resolve(2)]);
    expect(fromArray).toEqual([1, 2]);

    const fromCallback = await prismaMock.$transaction(async () => "callback-value");
    expect(fromCallback).toBe("callback-value");

    const passthrough = await prismaMock.$transaction("raw-value");
    expect(passthrough).toBe("raw-value");
  });

  it("covers github lookup first-seen and repeated-seen branches", async () => {
    const prismaMock = buildPrismaMock();

    const firstStaff = await prismaMock.user.findUnique({
      where: { enterpriseId_email: { enterpriseId: "ent-1", email: "github.staff@example.com" } },
    });
    const secondStaff = await prismaMock.user.findUnique({
      where: { enterpriseId_email: { enterpriseId: "ent-1", email: "github.staff@example.com" } },
    });

    expect(firstStaff).toBeNull();
    expect(secondStaff).toEqual({ id: 101 });
  });
});
