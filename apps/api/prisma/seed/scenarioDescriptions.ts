export const ASSESSMENT_OPEN_PROJECT_INFORMATION_TEXT = [
  "This demo project is configured to represent an active peer assessment window.",
  "The project has already moved beyond initial task setup and team formation.",
  "Students should now focus on submitting clear and evidence-based peer assessments.",
  "Assessment deadlines are intentionally open so submission and editing paths can be tested.",
  "Use this scenario to validate form behaviour, draft handling, and final submission flow.",
  "Reviewers are expected to provide constructive comments against each teammate.",
  "Staff can use this state to confirm that assessments appear in monitoring views.",
  "The team timeline is arranged so assessment actions are currently the primary workflow.",
  "This project should not yet expose completed feedback outcomes or final marking states.",
  "Treat this as the canonical 'assessment in progress' reference scenario for QA.",
].join("\n\n");

export const FEEDBACK_PENDING_PROJECT_INFORMATION_TEXT = [
  "This demo project is configured to represent the feedback stage after assessments close.",
  "Peer assessments are already seeded as completed for all required reviewer pairs.",
  "Peer feedback is currently open, and users should see pending feedback actions.",
  "The timeline allows testing of feedback drafting, submission, and read-only transitions.",
  "Use this scenario to validate badges, progress states, and deadline messaging.",
  "Students should be able to view assessment context while preparing feedback responses.",
  "Staff should observe this team as active but not yet in final marking status.",
  "The seeded data is intended to support both happy-path and edge-case UI checks.",
  "No final marks should be considered complete in this scenario state.",
  "Treat this as the canonical 'feedback open and pending' reference scenario for QA.",
].join("\n\n");

export const COMPLETED_UNMARKED_PROJECT_INFORMATION_TEXT = [
  "This demo project is configured as fully completed by students but not yet staff marked.",
  "Task delivery, peer assessment, and peer feedback windows are all in the past.",
  "Assessments and feedback entries are seeded so completed student activity is visible.",
  "Final team and individual marks are intentionally absent to reflect pending marking.",
  "Use this scenario to validate the 'completed awaiting mark' visual state in UI.",
  "Editing workflows should be restricted while completed records remain readable.",
  "Students should still be able to inspect their submission history and outcomes context.",
  "Staff can use this state to test final marking workflows and decision points.",
  "Deadline override data is cleared so baseline deadline behaviour remains predictable.",
  "Treat this as the canonical 'completed, unmarked' reference scenario for QA.",
].join("\n\n");

export const COMPLETED_DEMO_PROJECT_INFORMATION_TEXT = [
  "This demo project is configured as a fully completed and fully marked team outcome.",
  "All major delivery milestones and review phases are represented as historical records.",
  "Peer assessments and peer feedback entries are seeded for complete evidence coverage.",
  "Team-level and student-level marks are seeded to support final results validation.",
  "Meeting history is included to show a realistic delivery timeline and team cadence.",
  "Use this scenario to verify report pages, grade displays, and completed workflow states.",
  "Students should see final outcomes rather than pending submission actions.",
  "Staff should be able to audit assessment evidence against the published marks.",
  "This scenario acts as a benchmark for end-to-end project lifecycle completion.",
  "Treat this as the canonical 'completed and marked' reference scenario for QA.",
].join("\n\n");

export const TEAM_HEALTH_WARNING_PROJECT_INFORMATION_TEXT = [
  "This demo project is configured to exercise team health messaging and warning workflows.",
  "The timeline is set in late delivery so risk signals and escalations are meaningful.",
  "Seeded team health messages include open and resolved states for review testing.",
  "Warning configuration is enabled to surface cards, alerts, and intervention cues.",
  "Use this scenario to validate staff triage flows and status transitions.",
  "Students in this team should still show realistic participation and assessment context.",
  "The project is designed to test communication risk visibility before final deadline closure.",
  "Meeting and activity data can be inspected alongside warning and health indicators.",
  "This scenario should remain active rather than completed to preserve intervention behaviours.",
  "Treat this as the canonical 'team health and warnings' reference scenario for QA.",
].join("\n\n");
