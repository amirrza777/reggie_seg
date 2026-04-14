import { createPortal } from "react-dom";
import type { TeamInvite, TeamInviteEligibleStudent } from "../api/teamAllocation";

type InviteDropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type InviteFormInputsProps = {
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  shouldDisableInvites: boolean;
  invitePickerRef: React.RefObject<HTMLDivElement>;
  onLoadEligibleStudents: (e: React.MouseEvent) => void;
  isLoadingInviteEligibleStudents: boolean;
  onSendInvite: (email: string) => void;
  isInviting: boolean;
  isInviteDropdownOpen: boolean;
  inviteDropdownStyle: InviteDropdownPosition | null;
  inviteDropdownRef: React.RefObject<HTMLDivElement>;
  inviteEligibleStudents: TeamInviteEligibleStudent[];
};

type InviteTeammatesSectionProps = {
  pinnedInvite: TeamInvite | null;
  shouldDisableInvites: boolean;
  acceptedInvites: TeamInvite[];
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  invitePickerRef: React.RefObject<HTMLDivElement>;
  onLoadEligibleStudents: (e: React.MouseEvent) => void;
  isLoadingInviteEligibleStudents: boolean;
  onSendInvite: (email: string) => void;
  isInviting: boolean;
  inviteError: string;
  inviteSuccess: string;
  isInviteDropdownOpen: boolean;
  inviteDropdownStyle: InviteDropdownPosition | null;
  inviteDropdownRef: React.RefObject<HTMLDivElement>;
  inviteEligibleStudents: TeamInviteEligibleStudent[];
};

export function NoTeamStaffAllocationView() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900">Team allocation is managed by staff</p>
      <p className="text-sm text-gray-600">Please wait for staff to add you to a team for this project.</p>
    </div>
  );
}

export function NoTeamInviteDeadlinePassedView({
  teamAllocationInviteDueDate,
}: {
  teamAllocationInviteDueDate?: string | null;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900">Team invite deadline has passed</p>
      <p className="text-sm text-gray-600">Please wait for staff to add you to a team for this project.</p>
      {teamAllocationInviteDueDate && (
  <p className="text-xs text-gray-500">
    Deadline was {new Date(teamAllocationInviteDueDate).toLocaleString()}
  </p>
)}
    </div>
  );
}

export function NoTeamCreateFormView({
  teamName,
  setTeamName,
  createError,
  isCreating,
  onCreateTeam,
}: {
  teamName: string;
  setTeamName: (name: string) => void;
  createError: string;
  isCreating: boolean;
  onCreateTeam: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form onSubmit={onCreateTeam} className="space-y-2">
      <label className="text-sm font-medium text-gray-900">Create a Team</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Team name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={60}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isCreating || !teamName.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>
      {createError && <p className="text-sm text-red-600">{createError}</p>}
    </form>
  );
}

export function InviteDropdownContent({
  students,
  onSelectStudent,
  isLoading,
}: {
  students: TeamInviteEligibleStudent[];
  onSelectStudent: (email: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="px-3 py-2 text-sm text-gray-500">Loading...</p>;
  }

  if (students.length === 0) {
    return <p className="px-3 py-2 text-sm text-gray-500">No students found</p>;
  }

  return (
    <div className="space-y-1">
      {students.map((student) => (
        <button
          key={student.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelectStudent(student.email)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
        >
          <div className="font-medium">{student.email}</div>
          <div className="text-xs text-gray-600">
            {student.firstName} {student.lastName}
          </div>
        </button>
      ))}
    </div>
  );
}

export function InviteTeammatesSection(props: InviteTeammatesSectionProps) {
  const {
    pinnedInvite,
    shouldDisableInvites,
    acceptedInvites,
    inviteEmail,
    setInviteEmail,
    invitePickerRef,
    onLoadEligibleStudents,
    isLoadingInviteEligibleStudents,
    onSendInvite,
    isInviting,
    inviteError,
    inviteSuccess,
    isInviteDropdownOpen,
    inviteDropdownStyle,
    inviteDropdownRef,
    inviteEligibleStudents,
  } = props;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">Invite Teammates</label>
        {shouldDisableInvites && !acceptedInvites.length && (
          <span className="text-xs text-red-600">Invitations disabled (deadline passed)</span>
        )}
      </div>
      {pinnedInvite && <PinnedInvitePreview invite={pinnedInvite} />}
      <InviteFormInputs
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        shouldDisableInvites={shouldDisableInvites}
        invitePickerRef={invitePickerRef}
        onLoadEligibleStudents={onLoadEligibleStudents}
        isLoadingInviteEligibleStudents={isLoadingInviteEligibleStudents}
        onSendInvite={onSendInvite}
        isInviting={isInviting}
        isInviteDropdownOpen={isInviteDropdownOpen}
        inviteDropdownStyle={inviteDropdownStyle}
        inviteDropdownRef={inviteDropdownRef}
        inviteEligibleStudents={inviteEligibleStudents}
      />
      {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
      {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}
    </div>
  );
}

function PinnedInvitePreview({ invite }: { invite: TeamInvite }) {
  return (
    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
      <p className="font-medium">Awaiting Confirmation</p>
      <p>{invite.recipientEmail}</p>
    </div>
  );
}

function InviteFormInputs(props: InviteFormInputsProps) {
  const {
    inviteEmail,
    setInviteEmail,
    shouldDisableInvites,
    invitePickerRef,
    onLoadEligibleStudents,
    isLoadingInviteEligibleStudents,
    onSendInvite,
    isInviting,
    isInviteDropdownOpen,
    inviteDropdownStyle,
    inviteDropdownRef,
    inviteEligibleStudents,
  } = props;

  return (
    <div className="relative flex gap-2" ref={invitePickerRef}>
      <input
        type="email"
        placeholder="Enter email address"
        value={inviteEmail}
        onChange={(e) => setInviteEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSendInvite(inviteEmail);
          }
        }}
        disabled={shouldDisableInvites}
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
      />
      <button
        onClick={onLoadEligibleStudents}
        disabled={shouldDisableInvites || isLoadingInviteEligibleStudents}
        className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isLoadingInviteEligibleStudents ? "..." : "Pick"}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          onSendInvite(inviteEmail);
        }}
        disabled={shouldDisableInvites || isInviting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isInviting ? "..." : "Send"}
      </button>
      {isInviteDropdownOpen && inviteDropdownStyle && inviteEligibleStudents.length > 0 && (
        createPortal(
          <div ref={inviteDropdownRef} style={inviteDropdownStyle} className="z-50 rounded-md border border-gray-300 bg-white shadow-lg">
            <InviteDropdownContent students={inviteEligibleStudents} onSelectStudent={onSendInvite} isLoading={isInviting} />
          </div>,
          document.body
        )
      )}
    </div>
  );
}

export function PendingInvitesSection({
  invites,
  onCancelInvite,
  cancellingId,
}: {
  invites: TeamInvite[];
  onCancelInvite: (id: string) => void;
  cancellingId: string | null;
}) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-600">Pending Invitations</p>
      <div className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm">
            <span>{invite.recipientEmail}</span>
            <button
              onClick={() => onCancelInvite(invite.id)}
              disabled={cancellingId === invite.id}
              className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {cancellingId === invite.id ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReceivedInvitesSection({
  receivedInvites,
  respondingId,
  onAccept,
  onDecline,
}: {
  receivedInvites: TeamInvite[];
  respondingId: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  if (receivedInvites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Invitations Received</p>
        <div className="space-y-2">
          {receivedInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-md bg-yellow-50 p-3 text-sm">
              <span>{invite.senderEmail}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(invite.id)}
                  disabled={respondingId === invite.id}
                  className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                >
                  {respondingId === invite.id ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => onDecline(invite.id)}
                  disabled={respondingId === invite.id}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {respondingId === invite.id ? "..." : "Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
