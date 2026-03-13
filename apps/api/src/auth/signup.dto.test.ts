import { describe, expect, it, vi } from "vitest";

vi.mock(
  "class-validator",
  () => ({
    IsEmail: () => () => undefined,
    IsOptional: () => () => undefined,
    IsString: () => () => undefined,
    MinLength: () => () => undefined,
  }),
  { virtual: true }
);

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
