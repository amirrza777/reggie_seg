import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EnterpriseRecord } from "../types";
import { EnterpriseAccountsModal } from "./EnterpriseAccountsModal";

vi.mock("@/shared/ui/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const enterprise: EnterpriseRecord = {
  id: "ent_1",
  name: "King's College London",
  code: "KCL",
  createdAt: "2026-03-01T00:00:00.000Z",
  users: 10,
  admins: 1,
  enterpriseAdmins: 1,
  staff: 3,
  students: 5,
  modules: 2,
  teams: 3,
};

function createProps(overrides: Partial<ComponentProps<typeof EnterpriseAccountsModal>> = {}) {
  return {
    enterprise,
    usersStatus: "success" as const,
    usersMessage: null,
    inviteEmail: "",
    onInviteEmailChange: vi.fn(),
    inviteStatus: "idle" as const,
    inviteMessage: null,
    onInviteSubmit: vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault()),
    userSearchQuery: "",
    onUserSearchQueryChange: vi.fn(),
    userSortValue: "default" as const,
    onUserSortValueChange: vi.fn(),
    userRows: [[<span key="email">student@example.com</span>, <span key="name">Student One</span>, <span key="role">Student</span>, <span key="status">Active</span>]],
    userTotal: 10,
    userStart: 1,
    userEnd: 10,
    userPage: 2,
    userPageInput: "2",
    userTotalPages: 3,
    effectiveUserTotalPages: 3,
    onClose: vi.fn(),
    onUserPageChange: vi.fn(),
    onUserPageInputChange: vi.fn(),
    onUserPageInputBlur: vi.fn(),
    onUserPageJump: vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault()),
    ...overrides,
  };
}

describe("EnterpriseAccountsModal", () => {
  it("returns null when enterprise is missing", () => {
    const props = createProps({ enterprise: null });
    render(<EnterpriseAccountsModal {...props} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles search, pagination, and close interactions", async () => {
    const user = userEvent.setup();
    const props = createProps();

    render(<EnterpriseAccountsModal {...props} />);

    const inviteEmailInput = screen.getByLabelText(/enterprise admin invite email/i);
    await user.type(inviteEmailInput, "invite@example.com");
    expect(props.onInviteEmailChange).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /send invite/i }));
    expect(props.onInviteSubmit).toHaveBeenCalledTimes(1);

    await user.type(screen.getByRole("searchbox", { name: /search enterprise users/i }), "alice");
    expect(props.onUserSearchQueryChange).toHaveBeenCalled();

    await user.selectOptions(screen.getByRole("combobox", { name: /sort enterprise users/i }), "joinDateDesc");
    expect(props.onUserSortValueChange).toHaveBeenCalledWith("joinDateDesc");

    await user.click(screen.getByRole("button", { name: "Previous" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    const [previousUpdater] = props.onUserPageChange.mock.calls[0];
    const [nextUpdater] = props.onUserPageChange.mock.calls[1];
    expect(previousUpdater(2)).toBe(1);
    expect(nextUpdater(2)).toBe(3);

    const pageInput = screen.getByRole("spinbutton", { name: /go to enterprise user page number/i });
    await user.clear(pageInput);
    await user.type(pageInput, "3");
    expect(props.onUserPageInputChange).toHaveBeenCalled();
    fireEvent.blur(pageInput);
    expect(props.onUserPageInputBlur).toHaveBeenCalledTimes(1);
    fireEvent.submit(pageInput.closest("form") as HTMLFormElement);
    expect(props.onUserPageJump).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("dialog"));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("renders status messages, loading label, and both empty states", () => {
    const loadingProps = createProps({
      usersStatus: "loading",
      userRows: [],
      userTotal: 0,
      userStart: 0,
      userEnd: 0,
      usersMessage: "Failed to load users",
    });
    const { rerender } = render(<EnterpriseAccountsModal {...loadingProps} />);

    expect(screen.getAllByText("Loading accounts...").length).toBeGreaterThan(0);
    expect(screen.getByText("Failed to load users").closest(".ui-note--muted")).toBeInTheDocument();

    rerender(
      <EnterpriseAccountsModal
        {...createProps({
          inviteMessage: "Invite failed",
          inviteStatus: "error",
          usersStatus: "error",
          usersMessage: "Failed to load users",
        })}
      />,
    );
    expect(screen.getByText("Failed to load users").closest(".status-alert--error")).toBeInTheDocument();
    expect(screen.getByText("Invite failed").closest(".status-alert--error")).toBeInTheDocument();

    rerender(
      <EnterpriseAccountsModal
        {...createProps({
          userRows: [],
          userTotal: 0,
          userStart: 0,
          userEnd: 0,
          userSearchQuery: "Alice  ",
        })}
      />,
    );
    expect(screen.getByText('No accounts match "Alice".')).toBeInTheDocument();

    rerender(
      <EnterpriseAccountsModal
        {...createProps({
          userRows: [],
          userTotal: 0,
          userStart: 0,
          userEnd: 0,
          userSearchQuery: "",
        })}
      />,
    );
    expect(screen.getByText("No accounts found in this enterprise.")).toBeInTheDocument();
  });
});
