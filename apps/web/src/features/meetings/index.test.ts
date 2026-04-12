import { describe, expect, it, vi } from "vitest";

vi.mock("./api/client", () => ({
  meetingsClientSentinel: "meetings-client",
}));
vi.mock("./components/AttendanceTable", () => ({
  AttendanceTable: () => null,
}));
vi.mock("./components/MeetingList", () => ({
  MeetingList: () => null,
}));
vi.mock("./components/MeetingMinutes", () => ({
  MeetingMinutes: () => null,
}));
vi.mock("./components/forms/CreateMeetingForm", () => ({
  CreateMeetingForm: () => null,
}));
vi.mock("./components/CommentSection", () => ({
  CommentSection: () => null,
}));
vi.mock("./components/detail/MeetingDetail", () => ({
  MeetingDetail: () => null,
}));
vi.mock("./components/MeetingsPageContent", () => ({
  MeetingsPageContent: () => null,
}));
vi.mock("./types", () => ({
  meetingsTypesSentinel: "meetings-types",
}));

describe("meetings index barrel", () => {
  it("re-exports module surface", async () => {
    const mod = await import("./index");
    expect(mod.meetingsClientSentinel).toBe("meetings-client");
    expect(mod.AttendanceTable).toBeTypeOf("function");
    expect(mod.MeetingList).toBeTypeOf("function");
    expect(mod.MeetingMinutes).toBeTypeOf("function");
    expect(mod.CreateMeetingForm).toBeTypeOf("function");
    expect(mod.CommentSection).toBeTypeOf("function");
    expect(mod.MeetingDetail).toBeTypeOf("function");
    expect(mod.MeetingsPageContent).toBeTypeOf("function");
    expect(mod.meetingsTypesSentinel).toBe("meetings-types");
  });
});
