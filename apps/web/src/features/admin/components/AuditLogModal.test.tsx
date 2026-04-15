import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogModalView } from "./AuditLogModal";
import { getAuditStreamUrl, listAuditLogs } from "../api/client";
import type { AuditLogEntry } from "../types";

vi.mock("../api/client", () => ({
  listAuditLogs: vi.fn(),
  getAuditStreamUrl: vi.fn(),
}));

vi.mock("@/shared/ui/modal/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const listAuditLogsMock = vi.mocked(listAuditLogs);
const getAuditStreamUrlMock = vi.mocked(getAuditStreamUrl);

const sampleEntry: AuditLogEntry = {
  id: 1,
  action: "LOGIN",
  createdAt: "2026-04-12T10:00:00.000Z",
  ip: "127.0.0.1",
  userAgent: "Unit Test Agent",
  user: {
    id: 99,
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    role: "ADMIN",
  },
};

class EventSourceMock {
  public static instances: EventSourceMock[] = [];

  public onmessage: ((event: MessageEvent) => void) | null = null;
  public close = vi.fn();

  constructor(_url: string, _init?: EventSourceInit) {
    EventSourceMock.instances.push(this);
  }
}

describe("AuditLogModalView", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    EventSourceMock.instances = [];
    vi.stubGlobal("EventSource", EventSourceMock as unknown as typeof EventSource);
    getAuditStreamUrlMock.mockReturnValue("http://localhost:3000/admin/audit-logs/stream");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns null when closed and does not load", () => {
    render(<AuditLogModalView open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(listAuditLogsMock).not.toHaveBeenCalled();
  });

  it("loads events, supports load-more, and prepends stream events", async () => {
    const firstPage = Array.from({ length: 300 }, (_, index) => ({
      ...sampleEntry,
      id: index + 1,
      createdAt: `2026-04-12T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
    }));
    const secondPage = [{ ...sampleEntry, id: 301 }];
    listAuditLogsMock.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

    render(<AuditLogModalView open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 300 }));
    });
    expect(await screen.findByText("Load more")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 300, limit: 300 }));
    });

    const streamEntry = { ...sampleEntry, id: 999, user: { ...sampleEntry.user, firstName: "Live" } };
    await act(async () => {
      EventSourceMock.instances[0].onmessage?.({ data: JSON.stringify(streamEntry) } as MessageEvent);
    });
    expect(await screen.findByText("Live User")).toBeInTheDocument();
  });

  it("shows load errors", async () => {
    listAuditLogsMock.mockRejectedValueOnce(new Error("Could not load audit logs"));
    render(<AuditLogModalView open onClose={vi.fn()} />);
    expect(await screen.findByText("Could not load audit logs")).toBeInTheDocument();
  });

  it("downloads CSV, supports malformed stream events, and renders fallback action labels", async () => {
    const now = Date.parse("2026-04-14T12:00:00.000Z");
    vi.spyOn(Date, "now").mockReturnValue(now);

    const csvEntries: AuditLogEntry[] = [
      {
        ...sampleEntry,
        id: 10,
        action: "USER_ROLE_CHANGED",
        createdAt: "2026-04-14T11:59:40.000Z",
        userAgent: null,
      },
      {
        ...sampleEntry,
        id: 11,
        action: "LOGIN",
        createdAt: "2026-04-14T11:40:00.000Z",
      },
      {
        ...sampleEntry,
        id: 12,
        action: "LOGOUT",
        createdAt: "2026-04-14T10:00:00.000Z",
        ip: null,
      },
      {
        ...(sampleEntry as any),
        id: 13,
        action: "CUSTOM_ACTION",
        createdAt: "2026-04-12T12:00:00.000Z",
      },
    ];
    listAuditLogsMock.mockResolvedValue(csvEntries);

    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const originalCreateObjectURL = (URL as unknown as { createObjectURL?: (blob: Blob) => string }).createObjectURL;
    const originalRevokeObjectURL = (URL as unknown as { revokeObjectURL?: (url: string) => void }).revokeObjectURL;
    const createObjectURLMock = vi.fn(() => "blob:test");
    const revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURLMock, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURLMock, configurable: true });
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === "a") {
        return { click: clickMock, href: "", download: "" } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

    render(<AuditLogModalView open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenCalled();
    });

    await act(async () => {
      EventSourceMock.instances[0].onmessage?.({ data: "{not json" } as MessageEvent);
    });

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test");

    expect(screen.getByText("Just now")).toBeInTheDocument();
    expect(screen.getByText("20m ago")).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
    expect(screen.getByText("2d ago")).toBeInTheDocument();
    expect(screen.getAllByText("CUSTOM_ACTION").length).toBeGreaterThan(0);
    expect(document.querySelector(".audit-badge--compact")).toBeTruthy();

    (Date.now as unknown as { mockRestore?: () => void }).mockRestore?.();
    (document.createElement as unknown as { mockRestore?: () => void }).mockRestore?.();
    Object.defineProperty(URL, "createObjectURL", { value: originalCreateObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: originalRevokeObjectURL, configurable: true });
  });

  it("supports all-time range filtering without from/to dates", async () => {
    listAuditLogsMock.mockResolvedValue([sampleEntry]);
    render(<AuditLogModalView open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 300 }));
    });

    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenLastCalledWith({
        from: undefined,
        to: undefined,
        limit: 300,
      });
    });
  });
});
