import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useUser } from "./useUser";
import { UserContext } from "./userContext";

describe("useUser", () => {
  it("returns context value when provider is present", () => {
    const value = {
      user: { id: 1, email: "a@b.com", firstName: "A", lastName: "B", role: "STUDENT" as const },
      setUser: () => undefined,
      refresh: async () => null,
      loading: false,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });
    expect(result.current).toBe(value);
  });

  it("throws when context is missing", () => {
    expect(() => renderHook(() => useUser())).toThrow("useUser must be used within UserProvider");
  });
});
