import { describe, expect, it } from "vitest";
import { filterBySearchQuery, matchesSearchQuery, normalizeSearchQuery } from "./search";

describe("search helpers", () => {
  it("normalizes accents and whitespace", () => {
    expect(normalizeSearchQuery("  Raphaël   Pospíšilová ")).toBe("raphael pospisilova");
  });

  it("matches nested values by default", () => {
    const user = {
      id: 12,
      profile: {
        fullName: "Aleksander Bjarnadottir",
      },
      tags: ["staff", "active"],
    };

    expect(matchesSearchQuery(user, "bjarnadottir")).toBe(true);
    expect(matchesSearchQuery(user, "active")).toBe(true);
    expect(matchesSearchQuery(user, "suspended")).toBe(false);
  });

  it("supports field-limited and selector-based matching", () => {
    const users = [
      { id: 1, email: "admin@kcl.ac.uk", firstName: "Admin", active: true },
      { id: 2, email: "student1@example.com", firstName: "Raphael", active: false },
    ];

    const byEmail = filterBySearchQuery(users, "student1", { fields: ["email"] });
    expect(byEmail.map((item) => item.id)).toEqual([2]);

    const byStatusLabel = filterBySearchQuery(users, "suspended", {
      selectors: [(item) => (item.active ? "active" : "suspended")],
    });
    expect(byStatusLabel.map((item) => item.id)).toEqual([2]);
  });

  it("supports fuzzy token matching for minor typos", () => {
    const modules = [
      { id: 1, moduleName: "Data Structures", teamName: "Team Gamma" },
      { id: 2, moduleName: "Database Systems", teamName: "Team Alpha" },
    ];

    const looseMatch = filterBySearchQuery(modules, "daa structures", { fields: ["moduleName"] });
    expect(looseMatch.map((item) => item.id)).toEqual([1]);

    expect(matchesSearchQuery(modules[0], "daa structures", { fields: ["moduleName"] })).toBe(true);
    expect(matchesSearchQuery(modules[0], "dt structures", { fields: ["moduleName"] })).toBe(false);
    expect(matchesSearchQuery(modules[0], "quantum mechanics", { fields: ["moduleName"] })).toBe(false);
  });
});
