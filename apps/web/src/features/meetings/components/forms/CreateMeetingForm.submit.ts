import { createMeeting } from "../../api/client";

type CreateMeetingFieldErrors = {
  title?: string;
  date?: string;
};

export type SubmitCreateMeetingArgs = {
  teamId: number;
  userId: number | null;
  title: string;
  date: string;
  subject: string;
  location: string;
  videoCallLink: string;
  agenda: string;
  inviteAll: boolean;
  selectedIds: number[];
};

export type SubmitCreateMeetingResult = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: CreateMeetingFieldErrors;
  success: boolean;
};

function validateCreateMeetingFields(title: string, date: string): CreateMeetingFieldErrors {
  const errors: CreateMeetingFieldErrors = {};
  if (!title.trim()) errors.title = "Enter a title.";
  if (!date.trim()) errors.date = "Select a date and time.";
  return errors;
}

function buildMeetingRequest(args: SubmitCreateMeetingArgs) {
  const trimmedTitle = args.title.trim();
  const trimmedSubject = args.subject.trim();
  const trimmedLocation = args.location.trim();
  const trimmedVideoCallLink = args.videoCallLink.trim();
  const trimmedAgenda = args.agenda.trim();

  return {
    teamId: args.teamId,
    organiserId: args.userId!,
    title: trimmedTitle,
    date: args.date,
    subject: trimmedSubject || undefined,
    location: trimmedLocation || undefined,
    agenda: trimmedAgenda || undefined,
    ...(trimmedVideoCallLink ? { videoCallLink: trimmedVideoCallLink } : {}),
    ...(!args.inviteAll ? { participantIds: args.selectedIds } : {}),
  };
}

export async function submitCreateMeeting(args: SubmitCreateMeetingArgs): Promise<SubmitCreateMeetingResult> {
  const fieldErrors = validateCreateMeetingFields(args.title, args.date);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "idle", message: null, fieldErrors, success: false };
  }

  if (!args.userId) {
    return { status: "error", message: "You must be signed in to create a meeting.", fieldErrors, success: false };
  }

  try {
    await createMeeting(buildMeetingRequest(args));
    return { status: "success", message: "Meeting created!", fieldErrors: {}, success: true };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Failed to create meeting", fieldErrors, success: false };
  }
}
