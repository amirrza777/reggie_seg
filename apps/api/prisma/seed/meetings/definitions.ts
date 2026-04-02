export type MeetingInput = {
  title: string;
  subject: string;
  date: Date;
  location?: string;
  videoCallLink?: string;
  agenda: string;
};

type MeetingDateFactory = {
  daysAgo: (n: number) => Date;
  daysFromNow: (n: number) => Date;
};

type SeedMeetingDefinitionKeys =
  | "teamIntro"
  | "weeklyCheckIn"
  | "uiReview"
  | "testingSession"
  | "submissionPrep"
  | "demoRehearsal";

export function buildMeetingDefinitions(factory: MeetingDateFactory) {
  return {
    teamIntro: buildTeamIntroMeetingInput(factory),
    weeklyCheckIn: buildWeeklyCheckInMeetingInput(factory),
    uiReview: buildUiReviewMeetingInput(factory),
    testingSession: buildTestingSessionMeetingInput(factory),
    submissionPrep: buildSubmissionPrepMeetingInput(factory),
    demoRehearsal: buildDemoRehearsalMeetingInput(factory),
  } satisfies Record<SeedMeetingDefinitionKeys, MeetingInput>;
}

function buildTeamIntroMeetingInput(factory: MeetingDateFactory): MeetingInput {
  return {
    title: "Team Introduction",
    subject: "Getting started",
    date: factory.daysAgo(21),
    location: "Bush House 3.01",
    agenda: "Just a quick first meetup - introduce ourselves, figure out who's doing what and set up a group chat. Also need to agree on what tools we're using and how we'll split the work.",
  };
}

function buildWeeklyCheckInMeetingInput(factory: MeetingDateFactory): MeetingInput {
  return {
    title: "Weekly Check-in",
    subject: "Progress update",
    date: factory.daysAgo(14),
    location: "King's Building Seminar Room B",
    agenda: "Go through what everyone's been working on this week, flag any blockers and figure out priorities for next week. Shouldn't be too long.",
  };
}

function buildUiReviewMeetingInput(factory: MeetingDateFactory): MeetingInput {
  return {
    title: "UI Review",
    subject: "Frontend designs",
    date: factory.daysAgo(7),
    location: "Waterloo Campus Room 2.03",
    agenda: "Look at the latest frontend stuff together - meeting detail page, the notification bell, attendance table. Want to get everyone's thoughts before we submit.",
  };
}

function buildTestingSessionMeetingInput(factory: MeetingDateFactory): MeetingInput {
  return {
    title: "Testing Session",
    subject: "Test coverage review",
    date: factory.daysAgo(3),
    location: "Bush House 3.01",
    agenda: "Go through test coverage as a team and make sure we're not missing anything critical before submission. Each person should come with a list of what they've tested.",
  };
}

function buildSubmissionPrepMeetingInput(factory: MeetingDateFactory): MeetingInput {
  return {
    title: "Submission Prep",
    subject: "Final checks before KCL deadline",
    date: factory.daysFromNow(7),
    videoCallLink: "https://meet.google.com/reg-gie-kcl",
    agenda: "Final run through before we submit - check test coverage, make sure the README is done and go over any last issues. Should be pretty quick if everyone's done their bit.",
  };
}

function buildDemoRehearsalMeetingInput(factory: MeetingDateFactory): MeetingInput {
  return {
    title: "Demo Rehearsal",
    subject: "End-to-end walkthrough",
    date: factory.daysFromNow(14),
    location: "Bush House 4.02",
    agenda: "Run through the full demo as a team before the presentation. Everyone should know which part they're presenting. Bring questions.",
  };
}
