import { describe, expect, it } from "vitest";

describe("SignUpDto", () => {
  it("stores signup fields", async () => {
    const { SignUpDto } = await import("./signup.dto.js");
    const dto = new SignUpDto();
    dto.email = "u@test.com";
    dto.password = "password123";
    dto.name = "User";

    expect(dto).toEqual({ email: "u@test.com", password: "password123", name: "User" });
  });
});
