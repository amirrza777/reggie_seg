import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { getCalendarEvents } from "./client";

describe("calendar api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue([]);
  });

  it("requests calendar events for a user", async () => {
    await getCalendarEvents(21);
    expect(apiFetchMock).toHaveBeenCalledWith("/calendar/events?userId=21");
  });
});
