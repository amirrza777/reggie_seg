import type { PeerFeedback, Answer } from "../types";

function mapAnswersJsonToArray(answersJson: any, questions: any[] = []): Answer[] {
	if (!answersJson) return [];
	const questionMap: Record<string, { label: string; order: number }> = {};
	if (Array.isArray(questions)) {
		questions.forEach((q) => {
			const key = String(q.id);
			questionMap[key] = { label: q.label, order: q.order };
			questionMap[q.id] = { label: q.label, order: q.order };
		});
	}

	if (answersJson.answers && Array.isArray(answersJson.answers)) {
    	answersJson = answersJson.answers;
  		}

	if (Array.isArray(answersJson)) {
		return answersJson.map((a, idx) => {
			const questionKey = String(a.question);
			const questionData = questionMap[questionKey];
			return {
				id: a.id || String(idx),
				order: questionData?.order ?? a.order ?? idx,
				question: questionData?.label ?? a.label ?? String(a.question),
				answer:
					a.answer !== undefined
					? a.answer
					: typeof a === "string"
					? a
					: a.value ?? ""
			};
		});
	}

	if (typeof answersJson === "object") {
		return Object.keys(answersJson).map((key, idx) => {
			const val = answersJson[key];
			const questionData = questionMap[key];
			
			if (val == null) {
				return { id: String(key), order: questionData?.order ?? idx, question: questionData?.label ?? String(key), answer: "" };
			}

			if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
				return { id: String(key), order: questionData?.order ?? idx, question: questionData?.label ?? String(key), answer: String(val) };
			}

			return {
				id: String(val.id ?? key),
				order: questionData?.order ?? val.order ?? idx,
				question: questionData?.label ?? String(val.question ?? val.prompt ?? key),
				answer: typeof val.answer === "string" ? val.answer : JSON.stringify(val.answer ?? val),
			};
		});
	}
	return [
		{ id: "0", order: 0, question: "answer", answer: String(answersJson) },
	];
}

export function mapApiAssessmentToPeerFeedback(raw: any): PeerFeedback {
	if (!raw) {
		return { id: "", reviewerId: "", revieweeId: "", submittedAt: "", answers: [] };
	}
	
	const questions = raw.peerAssessment?.questionnaireTemplate?.questions ?? raw.questionnaireTemplate?.questions ?? [];
	const answers = mapAnswersJsonToArray(raw.peerAssessment?.answersJson ?? raw.answersJson ?? {}, questions);

	return {
		id: String(raw.id ?? raw.assessmentId ?? ""),
        projectId: String(raw.peerAssessment?.projectId ?? raw.projectId ?? ""),
		reviewerId: String(raw.peerAssessment?.reviewerUserId ?? raw.reviewerUserId ?? ""),
		revieweeId: String(raw.peerAssessment?.revieweeUserId ?? raw.revieweeUserId ?? ""),
		submittedAt: raw.submittedAt ? String(raw.submittedAt) : raw.updatedAt ? String(raw.updatedAt) : "",
		answers,
		firstName: raw.peerAssessment?.reviewee?.firstName ?? raw.reviewee?.firstName ?? "",
		lastName: raw.peerAssessment?.reviewee?.lastName ?? raw.reviewee?.lastName ?? "",
	};
}

export function mapApiAssessmentsToPeerFeedbacks(raw: any): PeerFeedback[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.data)) return raw.data.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.feedbacks)) return raw.feedbacks.map(mapApiAssessmentToPeerFeedback);

	return [mapApiAssessmentToPeerFeedback(raw)]; //single case
}
