import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamFormationPanel } from "./TeamFormationPanel.view";

const refreshMock = vi.fn();
const getTeamInvitesMock = vi.fn();
const getReceivedInvitesMock = vi.fn();
const getTeamInviteEligibleStudentsMock = vi.fn();
const sendTeamInviteMock = vi.fn();
const cancelTeamInviteMock = vi.fn();
const createTeamForProjectMock = vi.fn();
const acceptInviteMock = vi.fn();
const declineInviteMock = vi.fn();
let canEditValue = true;
let archivedValue = false;

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return { ...actual, createPortal: (node: React.ReactNode) => node };
});
vi.mock("../api/teamAllocation", () => ({
  getTeamInvites: (...args: unknown[]) => getTeamInvitesMock(...args),
  getReceivedInvites: (...args: unknown[]) => getReceivedInvitesMock(...args),
  getTeamInviteEligibleStudents: (...args: unknown[]) => getTeamInviteEligibleStudentsMock(...args),
  sendTeamInvite: (...args: unknown[]) => sendTeamInviteMock(...args),
  cancelTeamInvite: (...args: unknown[]) => cancelTeamInviteMock(...args),
  createTeamForProject: (...args: unknown[]) => createTeamForProjectMock(...args),
  acceptInvite: (...args: unknown[]) => acceptInviteMock(...args),
  declineInvite: (...args: unknown[]) => declineInviteMock(...args),
}));
vi.mock("./ProjectTeamList", () => ({ ProjectTeamList: () => <div data-testid="team-list" /> }));
vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  useProjectWorkspaceCanEdit: () => ({ canEdit: canEditValue, workspaceArchived: archivedValue }),
}));

const baseTeam = { id: 10, teamName: "Blue", moduleId: 1, projectId: 2, members: [] };
const received = {
  id: "inv-1",
  status: "PENDING" as const,
  inviteeEmail: "bob@example.com",
  createdAt: "2026-03-01T00:00:00.000Z",
  team: { id: 10, teamName: "Blue", projectId: 2 },
  inviter: { firstName: "Ali", lastName: "Smith" },
};

describe("TeamFormationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canEditValue = true;
    archivedValue = false;
    getReceivedInvitesMock.mockResolvedValue([]);
    getTeamInviteEligibleStudentsMock.mockResolvedValue([]);
    getTeamInvitesMock.mockResolvedValue([]);
  });

  describe("no team – staff-managed modes", () => {
    it("shows staff-managed message for staff mode", () => {
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} teamFormationMode="staff" />);
      expect(screen.getByText("Team allocation is managed by staff")).toBeInTheDocument();
      expect(screen.getByText(/Please wait for staff/i)).toBeInTheDocument();
    });

    it("shows questionnaire message for custom mode", () => {
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} teamFormationMode="custom" />);
      expect(screen.getByText("Team allocation is managed by staff")).toBeInTheDocument();
      expect(screen.getByText(/Complete the allocation questionnaire/i)).toBeInTheDocument();
    });
  });

  describe("no team – self mode", () => {
    it("shows create form", () => {
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      expect(screen.getByText("You're not in a team yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create team" })).toBeInTheDocument();
    });

    it("disables create when workspace is archived", () => {
      archivedValue = true;
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      expect(screen.getByRole("button", { name: "Create team" })).toBeDisabled();
      expect(screen.getByText(/This project is archived/i)).toBeInTheDocument();
    });

    it("calls createTeamForProject and refreshes on success", async () => {
      createTeamForProjectMock.mockResolvedValue({});
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      fireEvent.change(screen.getByPlaceholderText("Team name…"), { target: { value: "Blue" } });
      fireEvent.click(screen.getByRole("button", { name: "Create team" }));
      await waitFor(() => expect(createTeamForProjectMock).toHaveBeenCalledWith(2, "Blue"));
      expect(refreshMock).toHaveBeenCalled();
    });

    it("supports Enter key to trigger team creation", async () => {
      createTeamForProjectMock.mockResolvedValue({});
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      const input = screen.getByPlaceholderText("Team name…");
      fireEvent.change(input, { target: { value: "Alpha" } });
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(createTeamForProjectMock).toHaveBeenCalledWith(2, "Alpha"));
    });

    it("shows create error when API rejects with an Error", async () => {
      createTeamForProjectMock.mockRejectedValue(new Error("Name taken"));
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      fireEvent.change(screen.getByPlaceholderText("Team name…"), { target: { value: "Blue" } });
      fireEvent.click(screen.getByRole("button", { name: "Create team" }));
      expect(await screen.findByText("Name taken")).toBeInTheDocument();
    });

    it("shows fallback create error for non-Error rejections", async () => {
      createTeamForProjectMock.mockRejectedValue("oops");
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      fireEvent.change(screen.getByPlaceholderText("Team name…"), { target: { value: "Blue" } });
      fireEvent.click(screen.getByRole("button", { name: "Create team" }));
      expect(await screen.findByText("Failed to create team.")).toBeInTheDocument();
    });

    it("shows received invites from the same project and allows accepting", async () => {
      getReceivedInvitesMock.mockResolvedValue([received]);
      acceptInviteMock.mockResolvedValue({});
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      expect(await screen.findByText(/Ali Smith invited you to join/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
      await waitFor(() => expect(acceptInviteMock).toHaveBeenCalledWith("inv-1"));
    });

    it("removes a declined invite from the list", async () => {
      getReceivedInvitesMock.mockResolvedValue([received]);
      declineInviteMock.mockResolvedValue({});
      render(<TeamFormationPanel team={null} projectId={2} initialInvites={[]} />);
      expect(await screen.findByText(/Ali Smith/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Decline" }));
      await waitFor(() => expect(declineInviteMock).toHaveBeenCalledWith("inv-1"));
      await waitFor(() => expect(screen.queryByText(/Ali Smith/i)).not.toBeInTheDocument());
    });
  });

  describe("in a team", () => {
    it("renders ProjectTeamList and invite section when canEdit", async () => {
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} />);
      await waitFor(() => expect(getTeamInviteEligibleStudentsMock).toHaveBeenCalledWith(10));
      expect(screen.getByTestId("team-list")).toBeInTheDocument();
      expect(screen.getByText("Invite a teammate")).toBeInTheDocument();
    });

    it("sends invite to selected student with userId overload", async () => {
      getTeamInviteEligibleStudentsMock.mockResolvedValue([
        { id: 5, firstName: "Aya", lastName: "Tanaka", email: "aya@example.com" },
      ]);
      sendTeamInviteMock.mockResolvedValue({});
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} userId={1} initialInvites={[]} />);
      const input = screen.getByPlaceholderText(/search module student email/i);
      fireEvent.focus(input);
      await screen.findByText("aya@example.com");
      fireEvent.change(input, { target: { value: "aya@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
      await waitFor(() => expect(sendTeamInviteMock).toHaveBeenCalledWith(10, 1, "aya@example.com"));
      expect(await screen.findByText(/Invitation sent to/i)).toBeInTheDocument();
    });

    it("sends invite without userId using email-only overload", async () => {
      getTeamInviteEligibleStudentsMock.mockResolvedValue([
        { id: 5, firstName: "Aya", lastName: "Tanaka", email: "aya@example.com" },
      ]);
      sendTeamInviteMock.mockResolvedValue({});
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} />);
      const input = screen.getByPlaceholderText(/search module student email/i);
      fireEvent.focus(input);
      await screen.findByText("aya@example.com");
      fireEvent.change(input, { target: { value: "aya@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
      await waitFor(() => expect(sendTeamInviteMock).toHaveBeenCalledWith(10, "aya@example.com"));
    });

    it("shows error when no eligible student matches the input", async () => {
      getTeamInviteEligibleStudentsMock.mockResolvedValue([]);
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} />);
      await waitFor(() => expect(getTeamInviteEligibleStudentsMock).toHaveBeenCalled());
      fireEvent.keyDown(screen.getByPlaceholderText(/search module student email/i), { key: "Enter" });
      expect(screen.getByText(/Select a student from this module/i)).toBeInTheDocument();
    });

    it("shows pending-invite error when API returns a pending conflict", async () => {
      getTeamInviteEligibleStudentsMock.mockResolvedValue([
        { id: 5, firstName: "Aya", lastName: "Tanaka", email: "aya@example.com" },
      ]);
      sendTeamInviteMock.mockRejectedValue(new Error("invite already pending for this email"));
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} />);
      const input = screen.getByPlaceholderText(/search module student email/i);
      fireEvent.focus(input);
      await screen.findByText("aya@example.com");
      fireEvent.change(input, { target: { value: "aya@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
      expect(await screen.findByText(/An invite has already been sent/i)).toBeInTheDocument();
    });

    it("cancels a pending outgoing invite", async () => {
      const outgoing = {
        id: "inv-2",
        status: "PENDING" as const,
        inviteeEmail: "carol@example.com",
        createdAt: "2026-03-01T00:00:00.000Z",
      };
      cancelTeamInviteMock.mockResolvedValue({});
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[outgoing as any]} />);
      await waitFor(() => expect(getTeamInviteEligibleStudentsMock).toHaveBeenCalled());
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(cancelTeamInviteMock).toHaveBeenCalledWith("inv-2"));
    });

    it("shows view-only pending invites when canEdit is false", () => {
      canEditValue = false;
      const outgoing = {
        id: "inv-2",
        status: "PENDING" as const,
        inviteeEmail: "carol@example.com",
        createdAt: "2026-03-01T00:00:00.000Z",
      };
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[outgoing as any]} />);
      expect(screen.getByText("carol@example.com")).toBeInTheDocument();
      expect(screen.queryByText("Invite a teammate")).not.toBeInTheDocument();
    });

    it("hides invite section when project is completed", () => {
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} projectCompleted />);
      expect(screen.queryByText("Invite a teammate")).not.toBeInTheDocument();
    });

    it("closes dropdown on Escape key press", async () => {
      getTeamInviteEligibleStudentsMock.mockResolvedValue([
        { id: 5, firstName: "Aya", lastName: "Tanaka", email: "aya@example.com" },
      ]);
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} />);
      const input = screen.getByPlaceholderText(/search module student email/i);
      fireEvent.focus(input);
      await screen.findByText("aya@example.com");
      fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(screen.queryByText("aya@example.com")).not.toBeInTheDocument());
    });

    it("shows no-match note when input filters out all students", async () => {
      getTeamInviteEligibleStudentsMock.mockResolvedValue([
        { id: 5, firstName: "Aya", lastName: "Tanaka", email: "aya@example.com" },
      ]);
      render(<TeamFormationPanel team={baseTeam as any} projectId={2} initialInvites={[]} />);
      const input = screen.getByPlaceholderText(/search module student email/i);
      fireEvent.focus(input);
      await screen.findByText("aya@example.com");
      fireEvent.change(input, { target: { value: "zzz@example.com" } });
      expect(await screen.findByText(/No matching module students found/i)).toBeInTheDocument();
    });
  });
});