import { describe, expect, it } from "vitest";
import type { Project } from "../types";
import { sortProjectsByTaskOpenDate } from "./sortProjectsByTaskOpenDate";

function p(id: string, name: string, taskOpenDate: string | null | undefined): Project {
  return {
    id,
    name,
    questionnaireTemplateId: 1,
    ...(taskOpenDate !== undefined ? { taskOpenDate } : {}),
  } as Project;
}

describe("sortProjectsByTaskOpenDate", () => {
  it("orders by task open ascending and puts missing dates last", () => {
    const ordered = sortProjectsByTaskOpenDate([
      p("3", "Later", "2026-06-01T00:00:00.000Z"),
      p("1", "No date", null),
      p("2", "Early", "2026-01-01T00:00:00.000Z"),
    ]);
    expect(ordered.map((x) => x.id)).toEqual(["2", "3", "1"]);
  });

  it("ties on same date by name", () => {
    const ordered = sortProjectsByTaskOpenDate([
      p("a", "Zebra", "2026-01-01T00:00:00.000Z"),
      p("b", "Alpha", "2026-01-01T00:00:00.000Z"),
    ]);
    expect(ordered.map((x) => x.name)).toEqual(["Alpha", "Zebra"]);
  });
});
