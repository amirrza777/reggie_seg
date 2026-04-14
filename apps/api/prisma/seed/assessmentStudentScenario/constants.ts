export type AssessmentStudentProjectState =
  | "completed-marked"
  | "completed-unmarked"
  | "assessment-open"
  | "feedback-pending"
  | "upcoming";

export type AssessmentStudentProjectDefinition = {
  moduleIndex: number;
  name: string;
  teamName: string;
  state: AssessmentStudentProjectState;
};

export const ASSESSMENT_STUDENT_MODULE_NAMES = [
  "Assessment Student Demo Module 1",
  "Assessment Student Demo Module 2",
] as const;

export const ASSESSMENT_STUDENT_PROJECTS: AssessmentStudentProjectDefinition[] = [
  {
    moduleIndex: 0,
    name: "Demo Completed Project",
    teamName: "Assessment Student Demo Team 1",
    state: "completed-marked",
  },
  {
    moduleIndex: 0,
    name: "Demo Unmarked Project",
    teamName: "Assessment Student Demo Team 2",
    state: "completed-unmarked",
  },
  {
    moduleIndex: 0,
    name: "Demo Assessment Open Project",
    teamName: "Assessment Student Demo Team 3",
    state: "assessment-open",
  },
  {
    moduleIndex: 1,
    name: "Demo Completed Project",
    teamName: "Assessment Student Demo Team 4",
    state: "completed-marked",
  },
  {
    moduleIndex: 1,
    name: "Demo Feedback Pending Project",
    teamName: "Assessment Student Demo Team 5",
    state: "feedback-pending",
  },
  {
    moduleIndex: 1,
    name: "Demo Upcoming Project",
    teamName: "Assessment Student Demo Team 6",
    state: "upcoming",
  },
];

export const ASSESSMENT_STUDENT_SCENARIO_STEP = "seedAssessmentStudentScenario";
export const ASSESSMENT_STUDENT_DAY_MS = 24 * 60 * 60 * 1000;
