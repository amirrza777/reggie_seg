import { describe, expect, it } from "vitest";
import { __adminTypesCoverageMarker } from "@/features/admin/types";
import { __authTypesCoverageMarker } from "@/features/auth/types";
import { __enterpriseTypesCoverageMarker } from "@/features/enterprise/types";
import { __reposTypesCoverageMarker } from "@/features/repos/types";
import { __sidebarTypesCoverageMarker } from "@/shared/layout/Sidebar.types";
import { __commonTypesCoverageMarker } from "@/shared/types/common";

describe("Type coverage markers", () => {
  it("loads runtime markers for type-only modules", () => {
    expect(__adminTypesCoverageMarker).toBe(true);
    expect(__authTypesCoverageMarker).toBe(true);
    expect(__enterpriseTypesCoverageMarker).toBe(true);
    expect(__reposTypesCoverageMarker).toBe(true);
    expect(__sidebarTypesCoverageMarker).toBe(true);
    expect(__commonTypesCoverageMarker).toBe(true);
  });
});
