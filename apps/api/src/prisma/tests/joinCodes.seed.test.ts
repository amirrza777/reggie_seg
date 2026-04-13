import { describe, expect, it, vi } from "vitest";

const { seedConfigMock, randomBytesMock } = vi.hoisted(() => ({
  seedConfigMock: { fixtureJoinCodes: false },
  randomBytesMock: vi.fn(),
}));

vi.mock("../../../prisma/seed/config", () => ({
  SEED_CONFIG: seedConfigMock,
}));

vi.mock("node:crypto", () => ({
  randomBytes: randomBytesMock,
}));

import { planSeedModuleJoinCode } from "../../../prisma/seed/joinCodes";

describe("planSeedModuleJoinCode", () => {
  it("returns deterministic fixture code when fixture mode is enabled", () => {
    seedConfigMock.fixtureJoinCodes = true;
    randomBytesMock.mockReset();

    expect(planSeedModuleJoinCode(0)).toBe("SM000001");
    expect(planSeedModuleJoinCode(41)).toBe("SM000042");
    expect(randomBytesMock).not.toHaveBeenCalled();
  });

  it("builds random code from the allowed alphabet when fixture mode is disabled", () => {
    seedConfigMock.fixtureJoinCodes = false;
    randomBytesMock.mockReset();
    randomBytesMock.mockReturnValue(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]));

    const code = planSeedModuleJoinCode(5);

    expect(randomBytesMock).toHaveBeenCalledWith(8);
    expect(code).toBe("23456789");
  });
});
