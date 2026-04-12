import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMeeting } from "../../api/client";
import { submitCreateMeeting } from "./CreateMeetingForm.submit";

vi.mock("../../api/client", () => ({
  createMeeting: vi.fn(),
}));

const createMeetingMock = vi.mocked(createMeeting);

const validArgs = {
  teamId: 1,
  userId: 1 as number | null,
  title: "Team Meeting",
  date: "2026-03-01T10:00",
  subject: "",
  location: "",
  videoCallLink: "",
  agenda: "",
  inviteAll: true,
  selectedIds: [1, 2],
};

beforeEach(() => {
  vi.clearAllMocks();
  createMeetingMock.mockResolvedValue(undefined);
});

describe("submitCreateMeeting", () => {
  it("returns field errors when title is empty", async () => {
    const result = await submitCreateMeeting({ ...validArgs, title: "  " });
    expect(result.success).toBe(false);
    expect(result.status).toBe("idle");
    expect(result.fieldErrors.title).toBe("Enter a title.");
    expect(createMeetingMock).not.toHaveBeenCalled();
  });

  it("returns field errors when date is empty", async () => {
    const result = await submitCreateMeeting({ ...validArgs, date: "" });
    expect(result.success).toBe(false);
    expect(result.fieldErrors.date).toBe("Select a date and time.");
  });

  it("returns error when userId is null", async () => {
    const result = await submitCreateMeeting({ ...validArgs, userId: null });
    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("You must be signed in to create a meeting.");
    expect(createMeetingMock).not.toHaveBeenCalled();
  });

  it("calls createMeeting and returns success", async () => {
    const result = await submitCreateMeeting(validArgs);
    expect(result.success).toBe(true);
    expect(result.status).toBe("success");
    expect(result.message).toBe("Meeting created!");
    expect(createMeetingMock).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 1, organiserId: 1, title: "Team Meeting" })
    );
  });

  it("sends optional fields when provided", async () => {
    await submitCreateMeeting({
      ...validArgs,
      subject: "Week 8 progress",
      location: "Room 301",
      videoCallLink: "https://meet.google.com/abc",
      agenda: "Review tasks",
    });
    expect(createMeetingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Week 8 progress",
        location: "Room 301",
        videoCallLink: "https://meet.google.com/abc",
        agenda: "Review tasks",
      })
    );
  });

  it("sends participantIds when inviteAll is false", async () => {
    await submitCreateMeeting({ ...validArgs, inviteAll: false, selectedIds: [2, 3] });
    expect(createMeetingMock).toHaveBeenCalledWith(
      expect.objectContaining({ participantIds: [2, 3] })
    );
  });

  it("omits participantIds when inviteAll is true", async () => {
    await submitCreateMeeting(validArgs);
    const call = createMeetingMock.mock.calls[0][0];
    expect(call).not.toHaveProperty("participantIds");
  });

  it("returns error on createMeeting failure", async () => {
    createMeetingMock.mockRejectedValue(new Error("Server error"));
    const result = await submitCreateMeeting(validArgs);
    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Server error");
  });

  it("returns fallback error for non-Error rejection", async () => {
    createMeetingMock.mockRejectedValue("unknown");
    const result = await submitCreateMeeting(validArgs);
    expect(result.message).toBe("Failed to create meeting");
  });
});
