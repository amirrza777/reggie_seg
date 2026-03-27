import { beforeEach, describe, expect, it, vi } from "vitest";

const getStaffProjectTeamsUncachedMock = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T) => {
      let initialized = false;
      let cachedValue: ReturnType<T>;
      return ((...args: Parameters<T>) => {
        if (!initialized) {
          cachedValue = fn(...args);
          initialized = true;
        }
        return cachedValue;
      }) as T;
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectTeams: (...args: unknown[]) => getStaffProjectTeamsUncachedMock(...args),
}));

import { getStaffProjectTeams } from "./getStaffProjectTeamsCached";

describe("getStaffProjectTeamsCached", () => {
  beforeEach(() => {
    getStaffProjectTeamsUncachedMock.mockReset();
  });

  it("deduplicates repeated requests for the same key", async () => {
    getStaffProjectTeamsUncachedMock.mockResolvedValue({ items: [1, 2, 3] });

    const [first, second] = await Promise.all([getStaffProjectTeams(101, 501), getStaffProjectTeams(101, 501)]);

    expect(first).toEqual({ items: [1, 2, 3] });
    expect(second).toEqual({ items: [1, 2, 3] });
    expect(getStaffProjectTeamsUncachedMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failed requests", async () => {
    getStaffProjectTeamsUncachedMock
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ items: [42] });

    await expect(getStaffProjectTeams(202, 909)).rejects.toThrow("temporary failure");
    await expect(getStaffProjectTeams(202, 909)).resolves.toEqual({ items: [42] });
    expect(getStaffProjectTeamsUncachedMock).toHaveBeenCalledTimes(2);
  });
});
