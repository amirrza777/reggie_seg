import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { TrelloController } from "./controller.js";
import { TrelloService } from "./service.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock("./service.js", () => ({
  TrelloService: {
    completeOauthCallback: vi.fn(),
  },
}));

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("trello link token controller flows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns link token for authenticated user", () => {
    (jwt.sign as any).mockReturnValue("signed-token");
    const res = createMockRes();

    TrelloController.getLinkToken({ user: { sub: 44 } } as any, res);

    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 44, purpose: "trello-link" },
      expect.any(String),
      { expiresIn: "5m" },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ linkToken: "signed-token" });
  });

  it("returns 401 for unauthenticated link token requests", () => {
    const res = createMockRes();
    TrelloController.getLinkToken({ user: null } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 500 when link token signing fails", () => {
    (jwt.sign as any).mockImplementation(() => {
      throw new Error("sign failed");
    });
    const res = createMockRes();

    TrelloController.getLinkToken({ user: { sub: 1 } } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "sign failed" });
  });

  it("completes callback-with-link-token for valid payload", async () => {
    (jwt.verify as any).mockReturnValue({ sub: 9, purpose: "trello-link" });
    (TrelloService.completeOauthCallback as any).mockResolvedValue(undefined);
    const res = createMockRes();

    await TrelloController.callbackWithLinkToken(
      { body: { linkToken: "jwt", token: "trello-token" } } as any,
      res,
    );

    expect(TrelloService.completeOauthCallback).toHaveBeenCalledWith(9, "trello-token");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects callback-with-link-token when body is invalid", async () => {
    const res = createMockRes();

    await TrelloController.callbackWithLinkToken({ body: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing linkToken or token" });
  });

  it("rejects callback-with-link-token when payload shape is invalid", async () => {
    (jwt.verify as any).mockReturnValue("not-an-object");
    const res = createMockRes();

    await TrelloController.callbackWithLinkToken(
      { body: { linkToken: "jwt", token: "abc" } } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid link token" });
  });

  it("rejects callback-with-link-token when purpose is wrong", async () => {
    (jwt.verify as any).mockReturnValue({ sub: 9, purpose: "other" });
    const res = createMockRes();

    await TrelloController.callbackWithLinkToken(
      { body: { linkToken: "jwt", token: "abc" } } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid link token" });
  });

  it("returns 401 when link token is expired", async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw { name: "TokenExpiredError" };
    });
    const res = createMockRes();

    await TrelloController.callbackWithLinkToken(
      { body: { linkToken: "jwt", token: "abc" } } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns generic invalid link token message when verify throws without message", async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw {};
    });
    const res = createMockRes();

    await TrelloController.callbackWithLinkToken(
      { body: { linkToken: "jwt", token: "abc" } } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid link token" });
  });
});
