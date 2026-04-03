import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { highlightSearchText } from "./highlightSearchText";

describe("highlightSearchText", () => {
  it("returns the original text when query is empty or undefined", () => {
    expect(highlightSearchText("Team Feedback", "")).toBe("Team Feedback");
    expect(highlightSearchText("Team Feedback", undefined)).toBe("Team Feedback");
  });

  it("returns plain text when no search term matches", () => {
    expect(highlightSearchText("Team Feedback", "calendar")).toBe("Team Feedback");
  });

  it("highlights matching terms case-insensitively", () => {
    render(<div>{highlightSearchText("Team feedback portal", "FEEDBACK")}</div>);

    const hit = screen.getByText("feedback");
    expect(hit.tagName).toBe("MARK");
    expect(hit).toHaveClass("staff-projects__search-hit");
  });

  it("escapes regular expression characters in query terms", () => {
    render(<div>{highlightSearchText("C++ and (beta) users", "c++ (beta)")}</div>);

    const marks = screen.getAllByText((_, element) => element?.tagName === "MARK");
    expect(marks).toHaveLength(2);
    expect(screen.getByText("C++")).toBeInTheDocument();
    expect(screen.getByText("(beta)")).toBeInTheDocument();
  });
});
