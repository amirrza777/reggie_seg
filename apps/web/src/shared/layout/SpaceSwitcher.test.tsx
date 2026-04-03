import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { SpaceSwitcher, type SpaceLink } from "./SpaceSwitcher";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function MockLink(
      props: { href: string | { pathname?: string }; children: React.ReactNode } & Record<string, unknown>,
      ref: React.ForwardedRef<HTMLAnchorElement>
    ) {
      const { href, children, ...rest } = props;
      const resolvedHref = typeof href === "string" ? href : href.pathname ?? "";
      return (
        <a ref={ref} href={resolvedHref} {...rest}>
          {children}
        </a>
      );
    }),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);
const ACTIVE_SPACE_STORAGE_KEY = "team-feedback.space-switcher.active";

const BASE_LINKS: SpaceLink[] = [
  { href: "/staff/dashboard", label: "Staff", activePaths: ["/staff"] },
  { href: "/dashboard", label: "Workspace", activePaths: ["/dashboard", "/modules", "/projects"] },
  { href: "/enterprise", label: "Enterprise", activePaths: ["/enterprise"] },
  { href: "/admin", label: "Admin", activePaths: ["/admin"] },
];

function createRect(left: number, width: number): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    top: 0,
    width,
    height: 40,
    right: left + width,
    bottom: 40,
    toJSON: () => "",
  } as DOMRect;
}

describe("SpaceSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/staff/dashboard");
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sorts links by weight and marks active links from aliases", () => {
    usePathnameMock.mockReturnValue("/staff/projects");

    render(
      <SpaceSwitcher
        links={[
          { href: "/zeta", label: "Zeta" },
          BASE_LINKS[0],
          BASE_LINKS[3],
          BASE_LINKS[2],
          BASE_LINKS[1],
        ]}
      />
    );

    const linkLabels = screen
      .getAllByRole("link")
      .map((link) => link.textContent?.trim())
      .filter((label): label is string => Boolean(label));

    expect(linkLabels).toEqual(["Admin", "Workspace", "Staff", "Enterprise", "Zeta"]);
    expect(screen.getByRole("link", { name: "Staff" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Workspace" })).not.toHaveAttribute("aria-current");
  });

  it("hides the indicator when no pathname is available", () => {
    usePathnameMock.mockReturnValue(null);

    const { container } = render(<SpaceSwitcher links={BASE_LINKS} />);
    const indicator = container.querySelector(".space-switcher__indicator");

    expect(indicator).not.toHaveClass("is-visible");
    expect(window.sessionStorage.getItem(ACTIVE_SPACE_STORAGE_KEY)).toBeNull();
  });

  it("hides the indicator when pathname does not match any space link", () => {
    usePathnameMock.mockReturnValue("/unknown/area");

    const { container } = render(<SpaceSwitcher links={BASE_LINKS} />);
    const indicator = container.querySelector(".space-switcher__indicator");

    expect(indicator).not.toHaveClass("is-visible");
    expect(screen.getByRole("link", { name: "Workspace" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Staff" })).not.toHaveAttribute("aria-current");
  });

  it("animates from the previous active space when it is available", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    window.sessionStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, "/staff/dashboard");

    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 11;
    });
    const { container } = render(<SpaceSwitcher links={BASE_LINKS} />);
    const indicator = container.querySelector(".space-switcher__indicator");

    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(indicator).toHaveClass("is-visible");
    expect(indicator).toHaveClass("is-animating");
    expect(window.sessionStorage.getItem(ACTIVE_SPACE_STORAGE_KEY)).toBe("/dashboard");
  });

  it("does not animate when the previous space matches the active space", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    window.sessionStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, "/dashboard");

    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    render(<SpaceSwitcher links={BASE_LINKS} />);

    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("repositions the indicator on window resize", () => {
    usePathnameMock.mockReturnValue("/dashboard");

    const { container } = render(<SpaceSwitcher links={BASE_LINKS} />);
    const nav = container.querySelector(".space-switcher") as HTMLElement;
    const indicator = container.querySelector(".space-switcher__indicator") as HTMLElement;
    const workspaceLink = screen.getByRole("link", { name: "Workspace" });

    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue(createRect(100, 200));
    vi.spyOn(workspaceLink, "getBoundingClientRect").mockReturnValue(createRect(140, 80));
    Object.defineProperty(nav, "offsetWidth", { value: 100, configurable: true });

    fireEvent(window, new Event("resize"));

    expect(indicator.style.getPropertyValue("--space-switcher-indicator-left")).toBe("38px");
    expect(indicator.style.getPropertyValue("--space-switcher-indicator-width")).toBe("16px");
    expect(indicator).toHaveClass("is-visible");
  });

  it("swallows sessionStorage read/write failures", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    vi.spyOn(window, "sessionStorage", "get").mockReturnValue({
      getItem: () => {
        throw new Error("read denied");
      },
      setItem: () => {
        throw new Error("write denied");
      },
    } as Storage);

    expect(() => render(<SpaceSwitcher links={BASE_LINKS} />)).not.toThrow();
    expect(screen.getByRole("link", { name: "Workspace" })).toBeInTheDocument();
  });
});
