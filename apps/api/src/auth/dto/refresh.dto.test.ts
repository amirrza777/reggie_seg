import { describe, expect, it } from "vitest";
import { RefreshDto } from "./refresh.dto.js";

describe("RefreshDto", () => {
  it("stores refreshToken field", () => {
    const dto = new RefreshDto();
    dto.refreshToken = "token";
    expect(dto.refreshToken).toBe("token");
  });
});
