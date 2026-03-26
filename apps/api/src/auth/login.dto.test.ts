import { describe, expect, it } from "vitest";

describe("LoginDto", () => {
  it("stores email and password fields", async () => {
    const { LoginDto } = await import("./login.dto.js");
    const dto = new LoginDto();
    dto.email = "u@test.com";
    dto.password = "secret";

    expect(dto).toEqual({ email: "u@test.com", password: "secret" });
  });
});
