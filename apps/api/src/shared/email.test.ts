import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocked.createTransport,
  },
}));

describe("shared email", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_FROM;
    mocked.createTransport.mockReturnValue({ sendMail: mocked.sendMail });
  });

  it("suppresses email when SMTP is not configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { sendEmail } = await import("./email.js");

    const result = await sendEmail({ to: "u@test.com", subject: "S", text: "hello" });

    expect(result).toEqual({ suppressed: true });
    expect(mocked.createTransport).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("creates transporter and sends email when SMTP is configured", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "2525";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "u";
    process.env.SMTP_PASS = "p";
    process.env.SMTP_FROM = "noreply@example.com";

    const { sendEmail } = await import("./email.js");

    const result = await sendEmail({
      to: "u@test.com",
      subject: "Reset",
      text: "text",
      html: "<b>text</b>",
    });

    expect(result).toEqual({ suppressed: false });
    expect(mocked.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 2525,
      secure: true,
      auth: { user: "u", pass: "p" },
    });
    expect(mocked.sendMail).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "u@test.com",
      subject: "Reset",
      text: "text",
      html: "<b>text</b>",
    });
  });

  it("reuses cached transporter across multiple sends", async () => {
    process.env.SMTP_HOST = "smtp.example.com";

    const { sendEmail } = await import("./email.js");

    await sendEmail({ to: "a@test.com", subject: "A", text: "a" });
    await sendEmail({ to: "b@test.com", subject: "B", text: "b" });

    expect(mocked.createTransport).toHaveBeenCalledTimes(1);
    expect(mocked.sendMail).toHaveBeenCalledTimes(2);
  });
});
