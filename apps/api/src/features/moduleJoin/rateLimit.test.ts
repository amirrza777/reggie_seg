import { describe, expect, it } from "vitest";
import type { Request } from "express";

import { moduleJoinClientKey } from "./rateLimit.js";

describe("moduleJoin rate-limit keying", () => {
  it("uses user-and-ip composite key for authenticated users", () => {
    const req = { ip: "1.2.3.4", user: { sub: 42 } } as unknown as Request;
    expect(moduleJoinClientKey(req, "module-join:join")).toBe("module-join:join:user:42:ip:1.2.3.4");
  });

  it("falls back to ip-only key for unauthenticated requests", () => {
    const req = { ip: "5.6.7.8", user: undefined } as unknown as Request;
    expect(moduleJoinClientKey(req, "module-join:join")).toBe("module-join:join:ip:5.6.7.8");
  });

  it("uses unknown when request ip is absent", () => {
    const req = { user: { sub: undefined } } as unknown as Request;
    expect(moduleJoinClientKey(req, "module-join:join")).toBe("module-join:join:ip:unknown");
  });
});
