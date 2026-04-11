import { describe, expect, it } from "vitest";
import { archivePillNavLinkClass } from "./archivePillNav";

describe("archivePillNavLinkClass", () => {
  it("marks the active pill", () => {
    expect(archivePillNavLinkClass(true)).toBe("pill-nav__link pill-nav__link--active");
  });

  it("marks an inactive pill", () => {
    expect(archivePillNavLinkClass(false)).toBe("pill-nav__link");
  });
});
