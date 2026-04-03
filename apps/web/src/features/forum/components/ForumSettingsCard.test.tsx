import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "@/features/auth/useUser";
import { getForumSettings, updateForumSettings } from "@/features/forum/api/client";
import { ForumSettingsCard } from "./ForumSettingsCard";

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/features/forum/api/client", () => ({
  getForumSettings: vi.fn(),
  updateForumSettings: vi.fn(),
}));

const useUserMock = vi.mocked(useUser);
const getForumSettingsMock = vi.mocked(getForumSettings);
const updateForumSettingsMock = vi.mocked(updateForumSettings);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ForumSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserMock.mockReturnValue({
      user: {
        id: 1,
        firstName: "Ayan",
        lastName: "Mamun",
        role: "STAFF",
        isStaff: true,
        isAdmin: false,
        isEnterpriseAdmin: false,
      },
      loading: false,
    } as ReturnType<typeof useUser>);
  });

  it("renders anonymity checkbox and updates setting when toggled on", async () => {
    getForumSettingsMock.mockResolvedValue({ forumIsAnonymous: false });
    updateForumSettingsMock.mockResolvedValue({ forumIsAnonymous: true });

    render(<ForumSettingsCard projectId={9} />);

    await waitFor(() => {
      expect(getForumSettingsMock).toHaveBeenCalledWith(1, 9);
    });

    const hideNamesCheckbox = screen.getByRole("checkbox", { name: "Hide student names" });

    expect(hideNamesCheckbox).not.toBeChecked();

    fireEvent.click(hideNamesCheckbox);

    await waitFor(() => {
      expect(updateForumSettingsMock).toHaveBeenCalledWith(1, 9, true);
    });

    expect(hideNamesCheckbox).toBeChecked();
  });

  it("shows staff sign-in hint and skips loading settings when user is missing", async () => {
    useUserMock.mockReturnValue({
      user: null,
      loading: false,
    } as ReturnType<typeof useUser>);

    render(<ForumSettingsCard projectId={4} />);

    await waitFor(() => {
      expect(screen.getByText("Sign in as staff to update these settings.")).toBeInTheDocument();
    });

    expect(getForumSettingsMock).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "Hide student names" })).toBeDisabled();
  });

  it("shows an error when loading settings fails", async () => {
    getForumSettingsMock.mockRejectedValue(new Error("load failed"));

    render(<ForumSettingsCard projectId={2} />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load forum settings.")).toBeInTheDocument();
    });
  });

  it("ignores stale settings responses when project changes mid-load", async () => {
    const first = createDeferred<{ forumIsAnonymous: boolean }>();
    const second = createDeferred<{ forumIsAnonymous: boolean }>();
    getForumSettingsMock.mockImplementation((_userId, projectId) => {
      if (projectId === 9) return first.promise;
      return second.promise;
    });

    const { rerender } = render(<ForumSettingsCard projectId={9} />);
    rerender(<ForumSettingsCard projectId={10} />);

    second.resolve({ forumIsAnonymous: false });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Hide student names" })).not.toBeChecked());

    first.resolve({ forumIsAnonymous: true });
    await waitFor(() => expect(getForumSettingsMock).toHaveBeenCalledWith(1, 9));
    expect(screen.getByRole("checkbox", { name: "Hide student names" })).not.toBeChecked();
  });

  it("ignores stale load errors after a newer successful refresh", async () => {
    const first = createDeferred<{ forumIsAnonymous: boolean }>();
    getForumSettingsMock.mockImplementation((_userId, projectId) => {
      if (projectId === 3) return first.promise;
      return Promise.resolve({ forumIsAnonymous: false });
    });

    const { rerender } = render(<ForumSettingsCard projectId={3} />);
    rerender(<ForumSettingsCard projectId={4} />);

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Hide student names" })).not.toBeChecked(),
    );

    first.reject(new Error("stale-load"));
    await first.promise.catch(() => undefined);

    expect(screen.queryByText("Unable to load forum settings.")).not.toBeInTheDocument();
  });

  it("shows an error when updating settings fails", async () => {
    getForumSettingsMock.mockResolvedValue({ forumIsAnonymous: false });
    updateForumSettingsMock.mockRejectedValue(new Error("update failed"));

    render(<ForumSettingsCard projectId={11} />);

    const checkbox = await screen.findByRole("checkbox", { name: "Hide student names" });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText("Unable to update forum settings.")).toBeInTheDocument();
    });
  });
});
