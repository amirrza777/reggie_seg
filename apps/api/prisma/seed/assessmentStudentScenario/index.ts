import { getTemplateQuestionLabels } from "../peerAssessmentScenario/assessments";
import { withSeedLogging } from "../logging";
import type { SeedContext } from "../types";
import { resolveAssessmentStudentActors } from "./actors";
import { syncAssessmentStudentModuleMembership, syncAssessmentStudentTeamMembers } from "./membership";
import { seedAssessmentStudentMarks } from "./marks";
import { seedAssessmentStudentMeetings } from "./meetings";
import { seedAssessmentStudentPeerData } from "./peerData";
import { ensureAssessmentStudentModules, ensureAssessmentStudentProjects } from "./setup";

export async function seedAssessmentStudentScenario(context: SeedContext) {
  return withSeedLogging("seedAssessmentStudentScenario", async () => {
    const actors = resolveAssessmentStudentActors(context);
    const template = context.templates[0];
    if (!actors || !template) return { value: undefined, rows: 0, details: "skipped (missing assessment student, marker, teammates, or template)" };

    const modules = await ensureAssessmentStudentModules(context.enterprise);
    const moduleMemberIds = actors.assessmentStaff
      ? [actors.assessmentStudent.id, actors.assessmentStaff.id]
      : [actors.assessmentStudent.id];
    const moduleRows = await syncAssessmentStudentModuleMembership(
      context.enterprise.id,
      modules,
      moduleMemberIds,
      actors.marker.id,
    );
    const projects = await ensureAssessmentStudentProjects(context.enterprise.id, modules, template);
    const allocations = await syncAssessmentStudentTeamMembers(projects, actors.memberIds);
    const questionLabels = await getTemplateQuestionLabels(template.id, template.questionLabels);
    const meetings = await seedAssessmentStudentMeetings(projects, actors.memberIds);
    const peerData = await seedAssessmentStudentPeerData(projects, actors.memberIds, questionLabels);
    const marks = await seedAssessmentStudentMarks(projects, actors.memberIds, actors.marker.id);
    const rows = modules.length + moduleRows + projects.length + allocations + meetings.meetings + meetings.comments + peerData.assessments + peerData.feedbacks + marks.teamMarks + marks.studentMarks;

    return {
      value: { moduleIds: modules.map((module) => module.id), projectIds: projects.map((project) => project.id) },
      rows,
      details: `modules=${modules.length}, moduleMembershipRows=${moduleRows}, projects=${projects.length}, allocations=${allocations}, meetings=${meetings.meetings}, comments=${meetings.comments}, mentions=${meetings.mentions}, assessments=${peerData.assessments}, feedbacks=${peerData.feedbacks}, teamMarks=${marks.teamMarks}, studentMarks=${marks.studentMarks}`,
    };
  });
}

export {
  ASSESSMENT_STUDENT_MODULE_NAMES,
  ASSESSMENT_STUDENT_PROJECTS,
  ASSESSMENT_STUDENT_SCENARIO_STEP,
} from "./constants";
