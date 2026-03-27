import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import localFont from "next/font/local";
import RootLayout, { metadata, viewport } from "./layout";

vi.mock("next/font/local", () => ({
  default: vi.fn(() => ({ className: "font-sf" })),
}));

vi.mock("./providers", () => ({
  AppProviders: ({ children }: { children: ReactNode }) => children,
}));

const localFontMock = vi.mocked(localFont);

describe("RootLayout", () => {
  it("exports metadata and viewport defaults", () => {
    expect(metadata.title).toBe("Team Feedback");
    expect(metadata.manifest).toBe("/site.webmanifest");
    expect(viewport).toEqual({ width: "device-width", initialScale: 1 });
  });

  it("builds html/body shell with font class and children", () => {
    const tree = RootLayout({ children: <main data-testid="child">content</main> }) as ReactElement;

    expect(localFontMock).toHaveBeenCalledTimes(1);
    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("en");

    const body = tree.props.children as ReactElement;
    expect(body.type).toBe("body");
    expect(body.props.className).toBe("font-sf");

    const providers = body.props.children as ReactElement;
    expect(typeof providers.type).toBe("function");
    expect((providers.props.children as ReactElement).type).toBe("main");
    expect((providers.props.children as ReactElement).props["data-testid"]).toBe("child");
  });
});
