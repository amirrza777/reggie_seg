import { describe, it, expect, vi, beforeEach } from "vitest";
import { addNotification } from "./service.js";

import * as repo from "./repo.js";
import * as email from "../../shared/email.js";

vi.mock("./repo.js", () => ({
  getNotificationsByUserId: vi.fn(),
  getUnreadCount: vi.fn(),
  createNotification: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getUserEmail: vi.fn(),
}));

vi.mock("../../shared/email.js", () => ({
  sendEmail: vi.fn().mockResolvedValue({ suppressed: true }),
}));

describe("addNotification email alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email when user has an email address", async () => {
    (repo.createNotification as any).mockResolvedValue({ id: 1 });
    (repo.getUserEmail as any).mockResolvedValue("reggie@test.com");

    await addNotification({
      userId: 5,
      type: "MENTION",
      message: "Reggie mentioned you in a comment",
      link: "/projects/1/meetings/2",
    });

    expect(repo.getUserEmail).toHaveBeenCalledWith(5);
    expect(email.sendEmail).toHaveBeenCalledWith({
      to: "reggie@test.com",
      subject: "You were mentioned in a comment",
      text: expect.stringContaining("Reggie mentioned you in a comment"),
    });
  });

  it("includes link in email text", async () => {
    (repo.createNotification as any).mockResolvedValue({ id: 1 });
    (repo.getUserEmail as any).mockResolvedValue("reggie@test.com");

    await addNotification({
      userId: 5,
      type: "MENTION",
      message: "test",
      link: "/projects/1/meetings/2",
    });

    const callArgs = (email.sendEmail as any).mock.calls[0][0];
    expect(callArgs.text).toContain("http://localhost:3000/projects/1/meetings/2");
  });

  it("skips email when user has no email", async () => {
    (repo.createNotification as any).mockResolvedValue({ id: 1 });
    (repo.getUserEmail as any).mockResolvedValue(null);

    await addNotification({
      userId: 5,
      type: "MENTION",
      message: "test",
    });

    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it("does not throw when email fails", async () => {
    (repo.createNotification as any).mockResolvedValue({ id: 1 });
    (repo.getUserEmail as any).mockResolvedValue("reggie@test.com");
    (email.sendEmail as any).mockRejectedValue(new Error("SMTP error"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await addNotification({
      userId: 5,
      type: "MENTION",
      message: "test",
    });

    expect(result).toEqual({ id: 1 });
    expect(errorSpy).toHaveBeenCalled();
  });
});
