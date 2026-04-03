import { describe, expect, it } from "vitest";
import { filterBySearchQuery, matchesSearchQuery, normalizeSearchQuery } from "./search";

describe("search helpers", () => {
  it("normalizes accents and whitespace", () => {
    expect(normalizeSearchQuery("  Raphaël   Pospíšilová ")).toBe("raphael pospisilova");
  });

  it("normalizes nullish values and treats punctuation-only queries as empty tokens", () => {
    expect(normalizeSearchQuery(null)).toBe("");
    expect(matchesSearchQuery({ value: "alpha" }, "!!!")).toBe(true);
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

  it("handles empty and invalid configured field paths", () => {
    const item = {
      id: 7,
      profile: "not-an-object",
    };

    expect(matchesSearchQuery(item, "7", { fields: [""] })).toBe(true);
    expect(matchesSearchQuery(item, "name", { fields: ["profile.name"] })).toBe(false);
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
    expect(matchesSearchQuery(modules[0], "dt structures", { fields: ["moduleName"] })).toBe(true);
    expect(matchesSearchQuery(modules[0], "quantum mechanics", { fields: ["moduleName"] })).toBe(false);
  });

  it("supports dropped-letter and short-prefix fuzzy patterns", () => {
    const modules = [
      { id: 1, moduleName: "Example" },
      { id: 2, moduleName: "Data Structures" },
      { id: 3, moduleName: "Database Systems" },
    ];

    expect(matchesSearchQuery(modules[0], "eampl", { fields: ["moduleName"] })).toBe(true);
    expect(filterBySearchQuery(modules, "daa", { fields: ["moduleName"] }).map((item) => item.id)).toEqual([2, 3]);
  });

  it("supports date tokens, maxDepth truncation, and cyclic object traversal", () => {
    const node: Record<string, unknown> = {
      createdAt: new Date("2025-01-01T12:00:00.000Z"),
      nested: { label: "Deep value" },
    };
    node.self = node;

    expect(matchesSearchQuery(node, "2025-01-01", { maxDepth: 4 })).toBe(true);
    expect(matchesSearchQuery(node, "deep value", { maxDepth: 4 })).toBe(true);
    expect(matchesSearchQuery(node, "deep value", { maxDepth: 1 })).toBe(false);
  });

  it("falls back to edit-distance and supports query-token supersets", () => {
    expect(matchesSearchQuery({ code: "xy" }, "zz", { fields: ["code"] })).toBe(false);
    expect(matchesSearchQuery({ topic: "data" }, "database", { fields: ["topic"] })).toBe(true);
    expect(matchesSearchQuery({ empty: "   " }, "alpha", { fields: ["empty"] })).toBe(false);
  });
});
