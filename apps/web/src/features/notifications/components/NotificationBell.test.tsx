import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("../hooks/useNotifications", () => ({
  useNotifications: vi.fn(),
}));

import { useUser } from "@/features/auth/useUser";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationBell } from "./NotificationBell";

const useUserMock = useUser as MockedFunction<typeof useUser>;
const useNotificationsMock = useNotifications as MockedFunction<typeof useNotifications>;

const fetchAllMock = vi.fn();
const markReadMock = vi.fn();
const markAllReadMock = vi.fn();
const dismissMock = vi.fn();

function setupNotifications(notifications: any[] = [], unreadCount = 0) {
  useNotificationsMock.mockReturnValue({
    notifications,
    unreadCount,
    fetchAll: fetchAllMock,
    markRead: markReadMock,
    markAllRead: markAllReadMock,
    dismiss: dismissMock,
  });
}

const UNREAD_NOTIFICATION = {
  id: 1, userId: 5, type: "MENTION", message: "You were mentioned",
  link: "/projects/1/meetings/2", read: false, createdAt: "2026-02-22T10:00:00Z",
};

const READ_NOTIFICATION = {
  id: 2, userId: 5, type: "MEETING_CREATED", message: "New meeting scheduled",
  link: "/projects/1/meetings/3", read: true, createdAt: "2026-02-23T10:00:00Z",
};

const NOTIFICATION_NO_LINK = {
  id: 3, userId: 5, type: "LOW_ATTENDANCE", message: "Your attendance is low",
  link: null, read: false, createdAt: "2026-02-24T10:00:00Z",
};

beforeEach(() => {
  pushMock.mockReset();
  fetchAllMock.mockReset();
  markReadMock.mockReset();
  markAllReadMock.mockReset();
  dismissMock.mockReset();
  useUserMock.mockReturnValue({ user: { id: 5 } } as any);
  setupNotifications();
});

describe("NotificationBell", () => {
  it("renders nothing when there is no user", () => {
    useUserMock.mockReturnValue({ user: null } as any);
    setupNotifications();

    const { container } = render(<NotificationBell />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the bell button", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("shows unread badge when there are unread notifications", () => {
    setupNotifications([], 3);

    render(<NotificationBell />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show badge when unread count is zero", () => {
    setupNotifications([], 0);

    render(<NotificationBell />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("opens dropdown and calls fetchAll on click", () => {
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(fetchAllMock).toHaveBeenCalled();
  });

  it("shows empty message when there are no notifications", () => {
    setupNotifications([], 0);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
  });

  it("renders notification items when dropdown is open", () => {
    setupNotifications([UNREAD_NOTIFICATION, READ_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("You were mentioned")).toBeInTheDocument();
    expect(screen.getByText("New meeting scheduled")).toBeInTheDocument();
  });

  it("applies unread class to unread notifications", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    const item = screen.getByText("You were mentioned").closest(".notification-bell__item");
    expect(item?.classList.contains("notification-bell__item--unread")).toBe(true);
  });

  it("does not apply unread class to read notifications", () => {
    setupNotifications([READ_NOTIFICATION], 0);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    const item = screen.getByText("New meeting scheduled").closest(".notification-bell__item");
    expect(item?.classList.contains("notification-bell__item--unread")).toBe(false);
  });

  it("shows mark all as read button when there are unread notifications", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("does not show mark all as read button when unread count is zero", () => {
    setupNotifications([READ_NOTIFICATION], 0);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.queryByText("Mark all as read")).not.toBeInTheDocument();
  });

  it("calls markAllRead when mark all as read is clicked", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(screen.getByText("Mark all as read"));

    expect(markAllReadMock).toHaveBeenCalled();
  });

  it("calls dismiss when dismiss button is clicked", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(dismissMock).toHaveBeenCalledWith(1);
  });

  it("marks unread notification as read and navigates on click", async () => {
    markReadMock.mockResolvedValue(undefined);
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(screen.getByText("You were mentioned"));

    await waitFor(() => {
      expect(markReadMock).toHaveBeenCalledWith(1);
    });
    expect(pushMock).toHaveBeenCalledWith("/projects/1/meetings/2");
  });

  it("does not call markRead for already read notifications", async () => {
    setupNotifications([READ_NOTIFICATION], 0);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(screen.getByText("New meeting scheduled"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/projects/1/meetings/3");
    });
    expect(markReadMock).not.toHaveBeenCalled();
  });

  it("does not navigate when notification has no link", async () => {
    markReadMock.mockResolvedValue(undefined);
    setupNotifications([NOTIFICATION_NO_LINK], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(screen.getByText("Your attendance is low"));

    await waitFor(() => {
      expect(markReadMock).toHaveBeenCalledWith(3);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("closes dropdown when clicking outside", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("You were mentioned")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("You were mentioned")).not.toBeInTheDocument();
  });

  it("toggles dropdown closed when bell is clicked again", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    const bell = screen.getByRole("button", { name: "Notifications" });

    fireEvent.click(bell);
    expect(screen.getByText("You were mentioned")).toBeInTheDocument();

    fireEvent.click(bell);
    expect(screen.queryByText("You were mentioned")).not.toBeInTheDocument();
  });

  it("does not close dropdown when clicking inside it", () => {
    setupNotifications([UNREAD_NOTIFICATION], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    fireEvent.mouseDown(screen.getByText("You were mentioned"));

    expect(screen.getByText("You were mentioned")).toBeInTheDocument();
  });

  it("sorts a notification with an invalid timestamp after valid ones", () => {
    const invalidDate = { ...UNREAD_NOTIFICATION, id: 10, createdAt: "not-a-date" };
    const validDate = { ...READ_NOTIFICATION, id: 5 };
    setupNotifications([invalidDate, validDate], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("You were mentioned")).toBeInTheDocument();
    expect(screen.getByText("New meeting scheduled")).toBeInTheDocument();
  });

  it("sorts a valid notification before an invalid one in a mixed list", () => {
    const invalidDate = { ...UNREAD_NOTIFICATION, id: 10, createdAt: "not-a-date" };
    const validDate = { ...READ_NOTIFICATION, id: 5 };
    const anotherValidDate = { ...READ_NOTIFICATION, id: 3, message: "Meeting updated", createdAt: "2026-01-01T10:00:00Z" };
    setupNotifications([validDate, invalidDate, anotherValidDate], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("You were mentioned")).toBeInTheDocument();
    expect(screen.getByText("Meeting updated")).toBeInTheDocument();
  });

  it("sorts notifications when both have invalid timestamps", () => {
    const first = { ...UNREAD_NOTIFICATION, id: 10, createdAt: "not-a-date" };
    const second = { ...READ_NOTIFICATION, id: 5, createdAt: "not-a-date" };
    setupNotifications([first, second], 1);

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("You were mentioned")).toBeInTheDocument();
    expect(screen.getByText("New meeting scheduled")).toBeInTheDocument();
  });
});
