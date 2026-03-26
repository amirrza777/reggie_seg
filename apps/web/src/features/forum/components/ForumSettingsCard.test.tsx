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
});
