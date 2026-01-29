import type { PeerFeedback, Answer } from "../types";

function mapAnswersJsonToArray(answersJson: any): Answer[] {
	if (!answersJson) return [];

	// If already an array of answer-like objects, normalize and return
	if (Array.isArray(answersJson)) {
		return answersJson.map((a, idx) => ({
			id: String(a.id ?? a.question ?? idx),
			order: String(a.order ?? idx),
			question: a.question ?? a.prompt ?? String(a.id ?? a.question ?? idx),
			answer:
				typeof a.answer === "string"
					? a.answer
					: typeof a === "string"
					? a
					: a.value ?? JSON.stringify(a),
		}));
	}

	// If answersJson is an object map of questionId -> value
	if (typeof answersJson === "object") {
		return Object.keys(answersJson).map((key, idx) => {
			const val = answersJson[key];
			if (val == null) {
				return { id: String(key), order: String(idx), question: String(key), answer: "" };
			}

			// If the stored value is a primitive string/number, use it as the answer
			if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
				return { id: String(key), order: String(idx), question: String(key), answer: String(val) };
			}

			// If the stored value is an object, try to pick descriptive fields
			return {
				id: String(val.id ?? key),
				order: String(val.order ?? idx),
				question: String(val.question ?? val.prompt ?? key),
				answer: typeof val.answer === "string" ? val.answer : JSON.stringify(val.answer ?? val),
			};
		});
	}

	// Fallback: convert to string
	return [
		{ id: "0", order: "0", question: "answer", answer: String(answersJson) },
	];
}

export function mapApiAssessmentToPeerFeedback(raw: any): PeerFeedback {
	if (!raw) {
		return { id: "", reviewerId: "", revieweeId: "", submittedAt: "", answers: [] };
	}

	const answers = mapAnswersJsonToArray(raw.answersJson ?? raw.answers ?? raw.awnsers ?? raw.answersJson);

	return {
		id: String(raw.id ?? raw.assessmentId ?? ""),
		reviewerId: String(raw.reviewerUserId ?? raw.reviewerId ?? raw.reviewer ?? ""),
		revieweeId: String(raw.revieweeUserId ?? raw.revieweeId ?? raw.reviewee ?? ""),
		submittedAt: raw.submittedAt ? String(raw.submittedAt) : raw.updatedAt ? String(raw.updatedAt) : "",
		answers,
	};
}

export function mapApiAssessmentsToPeerFeedbacks(raw: any): PeerFeedback[] {
	if (!raw) return [];

	// If already an array, map each element
	if (Array.isArray(raw)) return raw.map(mapApiAssessmentToPeerFeedback);

	// If the API wrapped the array in a property like `data` or `feedbacks`
	if (Array.isArray(raw.data)) return raw.data.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.feedbacks)) return raw.feedbacks.map(mapApiAssessmentToPeerFeedback);

	// If single object returned, return single-element array
	return [mapApiAssessmentToPeerFeedback(raw)];
}
