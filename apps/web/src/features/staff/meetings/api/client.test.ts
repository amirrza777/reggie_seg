import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/shared/api/http";
import { listTeamMeetings, getTeamMeetingSettings } from "./client";

describe("staff meetings api client", () => {
  it("fetches team meetings at the correct endpoint", async () => {
    await listTeamMeetings(8);
    expect(apiFetch).toHaveBeenCalledWith("/meetings/team/8");
  });

  it("fetches team meeting settings at the correct endpoint", async () => {
    await getTeamMeetingSettings(8);
    expect(apiFetch).toHaveBeenCalledWith("/meetings/team/8/settings");
  });
});
