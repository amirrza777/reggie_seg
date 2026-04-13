import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.clearAllMocks();
    EventSourceMock.instances = [];
    vi.stubGlobal("EventSource", EventSourceMock as unknown as typeof EventSource);
    getAuditStreamUrlMock.mockReturnValue("http://localhost:3000/admin/audit-logs/stream");
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
});
