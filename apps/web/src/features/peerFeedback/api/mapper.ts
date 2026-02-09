import type { PeerFeedback, Answer } from "../types";

function mapAnswersJsonToArray(answersJson: any): Answer[] {
	if (!answersJson) return [];

	if (answersJson.answers && Array.isArray(answersJson.answers)) {
    	answersJson = answersJson.answers;
  		}

	if (Array.isArray(answersJson)) {
		return answersJson.map((a, idx) => ({
			id: String(a.id ?? a.question ?? idx),
			order: a.order ?? idx,
			question: a.question ?? a.prompt ?? String(a.id ?? a.question ?? idx),
			answer:
				a.answer !== undefined
				? a.answer
				: typeof a === "string"
				? a
				: a.value ?? ""
		}));
	}

	if (typeof answersJson === "object") {
		return Object.keys(answersJson).map((key, idx) => {
			const val = answersJson[key];
			if (val == null) {
				return { id: String(key), order: idx, question: String(key), answer: "" };
			}

			if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
				return { id: String(key), order: idx, question: String(key), answer: String(val) };
			}

			return {
				id: String(val.id ?? key),
				order: val.order ?? idx,
				question: String(val.question ?? val.prompt ?? key),
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

	const answers = mapAnswersJsonToArray(raw.answersJson ?? {});

	return {
		id: String(raw.id ?? raw.assessmentId ?? ""),
        projectId: String(raw.projectId ?? ""),
		reviewerId: String(raw.reviewerUserId ?? ""),
		revieweeId: String(raw.revieweeUserId ?? ""),
		submittedAt: raw.submittedAt ? String(raw.submittedAt) : raw.updatedAt ? String(raw.updatedAt) : "",
		answers,
		firstName: raw.reviewee?.firstName ?? "",
		lastName: raw.reviewee?.lastName ?? "",
	};
}

export function mapApiAssessmentsToPeerFeedbacks(raw: any): PeerFeedback[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.data)) return raw.data.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.feedbacks)) return raw.feedbacks.map(mapApiAssessmentToPeerFeedback);

	return [mapApiAssessmentToPeerFeedback(raw)]; //single case
}
