import { describe, expect, it } from "vitest";
import { MOBILE_DRAWER_PERSIST_KEY, MOBILE_DRAWER_SPACE_KEY, SPACE_LABELS, SPACE_ORDER } from "./Sidebar.constants";

describe("Sidebar constants", () => {
  it("defines expected space labels and order", () => {
    expect(SPACE_LABELS.workspace).toBe("Workspace");
    expect(SPACE_LABELS.staff).toBe("Staff");
    expect(SPACE_LABELS.enterprise).toBe("Enterprise");
    expect(SPACE_LABELS.admin).toBe("Admin");
    expect(SPACE_ORDER).toEqual(["workspace", "staff", "enterprise", "admin"]);
  });

  it("defines local-storage keys", () => {
    expect(MOBILE_DRAWER_PERSIST_KEY).toBe("app-shell-mobile-drawer-open");
    expect(MOBILE_DRAWER_SPACE_KEY).toBe("app-shell-mobile-drawer-space");
  });
});
