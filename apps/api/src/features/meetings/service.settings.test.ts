import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMeetingSettings } from "./service.js";

import * as repo from "./repo.js";

vi.mock("./repo.js", () => ({
  getMeetingById: vi.fn(),
  getModuleMeetingSettingsForTeam: vi.fn(),
}));

describe("meetings settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null from fetchMeetingSettings when meeting not found", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);

    const result = await fetchMeetingSettings(99);

    expect(result).toBeNull();
  });

  it("returns module settings for the meeting's team", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 1, teamId: 5 });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ absenceThreshold: 3, minutesEditWindowDays: 7 });

    const result = await fetchMeetingSettings(1);

    expect(repo.getModuleMeetingSettingsForTeam).toHaveBeenCalledWith(5);
    expect(result).toEqual({ absenceThreshold: 3, minutesEditWindowDays: 7 });
  });
});
