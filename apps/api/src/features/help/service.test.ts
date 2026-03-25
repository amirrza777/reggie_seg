import { describe, expect, it } from "vitest";
import { parseHelpSearchPayload, searchHelpRecords } from "./service.js";

describe("help search service", () => {
  it("parses valid payload", () => {
    const parsed = parseHelpSearchPayload({
      q: "meeting",
      scope: "faqs",
      records: [{ id: "faq-1", question: "How do I view my team's meeting schedule?", answer: "Open Projects." }],
      limit: 10,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.limit).toBe(10);
    expect(parsed.value.scope).toBe("faqs");
  });

  it("rejects missing query", () => {
    const parsed = parseHelpSearchPayload({ scope: "overview", records: [{ id: "1" }] });
    expect(parsed).toEqual({ ok: false, error: "q is required" });
  });

  it("matches faq answers and question text", () => {
    const parsed = parseHelpSearchPayload({
      q: "meeting schedule",
      scope: "faqs",
      records: [
        {
          id: "faq-1",
          question: "How do I view my team's meeting schedule?",
          answer: "Open Projects and view meetings.",
        },
        {
          id: "faq-2",
          question: "How do I reset my password?",
          answer: "Use forgot password.",
        },
      ],
    });

    if (!parsed.ok) throw new Error(parsed.error);
    const results = searchHelpRecords(parsed.value);
    expect(results.map((item) => item.id)).toEqual(["faq-1"]);
  });

  it("matches overview records", () => {
    const parsed = parseHelpSearchPayload({
      q: "roles permissions",
      scope: "overview",
      records: [
        { id: "topic-1", title: "Roles & Permissions", description: "What students, staff, and admins can do." },
        { id: "topic-2", title: "Support", description: "Contact support and report issues." },
      ],
      limit: 5,
    });

    if (!parsed.ok) throw new Error(parsed.error);
    const results = searchHelpRecords(parsed.value);
    expect(results.map((item) => item.id)).toEqual(["topic-1"]);
  });

  it("matches overview records with minor typos", () => {
    const parsed = parseHelpSearchPayload({
      q: "roes",
      scope: "overview",
      records: [
        { id: "topic-1", title: "Roles & Permissions", description: "What students, staff, and admins can do." },
        { id: "topic-2", title: "Support", description: "Contact support and report issues." },
      ],
      limit: 5,
    });

    if (!parsed.ok) throw new Error(parsed.error);
    const results = searchHelpRecords(parsed.value);
    expect(results.map((item) => item.id)).toEqual(["topic-1"]);
  });
});
