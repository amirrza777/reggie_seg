/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PeerFeedback, Answer } from "../types";

type TemplateQuestion = {
	id: string;
	label: string;
	order: number;
	type: "text" | "multiple-choice" | "rating" | "slider";
	configs?: Answer["configs"];
};

function normalizeAnswerValue(value: unknown): Answer["answer"] {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" || typeof value === "boolean") return value;
	if (value == null) return null;
	return String(value);
}

function normalizeQuestionType(type: unknown): "text" | "multiple-choice" | "rating" | "slider" {
	const normalized = String(type)
		.trim()
		.toLowerCase();

	if (normalized === "multiple-choice") return "multiple-choice";
	if (normalized === "rating") return "rating";
	if (normalized === "slider") return "slider";
	return "text";
}

function normalizeQuestionConfigs(configs: any): Answer["configs"] | undefined {
	if (!configs || typeof configs !== "object") return undefined;

	const normalized: NonNullable<Answer["configs"]> = {
		required: typeof configs.required === "boolean" ? configs.required : undefined,
		helperText: typeof configs.helperText === "string" ? configs.helperText : undefined,
		placeholder: typeof configs.placeholder === "string" ? configs.placeholder : undefined,
		minLength: typeof configs.minLength === "number" ? configs.minLength : undefined,
		maxLength: typeof configs.maxLength === "number" ? configs.maxLength : undefined,
		options: Array.isArray(configs.options) ? configs.options.map(String) : undefined,
		min: typeof configs.min === "number" ? configs.min : undefined,
		max: typeof configs.max === "number" ? configs.max : undefined,
		step: typeof configs.step === "number" ? configs.step : undefined,
		left: typeof configs.left === "string" ? configs.left : undefined,
		right: typeof configs.right === "string" ? configs.right : undefined,
	};

	const hasAnyConfig = Object.values(normalized).some((value) => value !== undefined);
	return hasAnyConfig ? normalized : undefined;
}

function mapTemplateQuestions(questions: any[]): Record<string, TemplateQuestion> {
	const result: Record<string, TemplateQuestion> = {};

	questions.forEach((question, index) => {
		if (!question || typeof question !== "object") return;
		const questionId = String(question.id ?? "").trim();
		const label = typeof question.label === "string" ? question.label.trim() : "";
		if (!questionId || !label) return;

		result[questionId] = {
			id: questionId,
			label,
			order: typeof question.order === "number" ? question.order : index,
			type: normalizeQuestionType(question.type),
			configs: normalizeQuestionConfigs(question.configs),
		};
	});

	return result;
}

function mapAnswersJsonToArray(answersJson: any, questionMap: Record<string, TemplateQuestion>): Answer[] {
	if (!answersJson) return [];

	if (Array.isArray(answersJson)) {
		return answersJson
			.map((entry, index) => {
				if (!entry || typeof entry !== "object") return null;
				const questionId = String((entry.question ?? entry.questionId) ?? "").trim();
				if (!questionId) return null;
				const templateQuestion = questionMap[questionId];

				return {
					id: questionId,
					questionId,
					order: templateQuestion?.order ?? index,
					question: templateQuestion?.label ?? questionId,
					type: templateQuestion?.type ?? "text",
					configs: templateQuestion?.configs,
					answer: normalizeAnswerValue(entry.answer),
				} as Answer;
			})
			.filter((entry): entry is Answer => entry !== null)
			.sort((a, b) => a.order - b.order);
	}

	if (typeof answersJson === "object") {
		return Object.entries(answersJson)
			.map(([rawQuestionId, value], index) => {
				const questionId = String(rawQuestionId).trim();
				if (!questionId) return null;
				const templateQuestion = questionMap[questionId];

				return {
					id: questionId,
					questionId,
					order: templateQuestion?.order ?? index,
					question: templateQuestion?.label ?? questionId,
					type: templateQuestion?.type ?? "text",
					configs: templateQuestion?.configs,
					answer: normalizeAnswerValue(value),
				} as Answer;
			})
			.filter((entry): entry is Answer => entry !== null)
			.sort((a, b) => a.order - b.order);
	}

	return [];
}

export function mapApiAssessmentToPeerFeedback(raw: any): PeerFeedback {
	if (!raw) {
		return { id: "", reviewerId: "", revieweeId: "", submittedAt: "", answers: [] };
	}

	const assessment = raw.peerAssessment ?? raw;
	const questions = Array.isArray(assessment?.questionnaireTemplate?.questions)
		? assessment.questionnaireTemplate.questions
		: [];
	const questionMap = mapTemplateQuestions(questions);
	const answers = mapAnswersJsonToArray(assessment?.answersJson, questionMap);
	const projectId = assessment?.projectId;
	const reviewerUserId = assessment?.reviewerUserId;
	const revieweeUserId = assessment?.revieweeUserId;
	const templateId =
		typeof assessment?.templateId === "number"
			? assessment.templateId
			: typeof assessment?.questionnaireTemplate?.id === "number"
				? assessment.questionnaireTemplate.id
				: undefined;

	return {
		id: String(raw.id ?? ""),
		projectId: projectId != null ? String(projectId) : undefined,
		reviewerId: reviewerUserId != null ? String(reviewerUserId) : "",
		revieweeId: revieweeUserId != null ? String(revieweeUserId) : "",
		submittedAt: String(raw.submittedAt ?? raw.updatedAt ?? ""),
		answers,
		templateId,
		firstName: assessment?.reviewee?.firstName ?? "",
		lastName: assessment?.reviewee?.lastName ?? "",
	};
}

export function mapApiAssessmentsToPeerFeedbacks(raw: any): PeerFeedback[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.data)) return raw.data.map(mapApiAssessmentToPeerFeedback);
	if (Array.isArray(raw.feedbacks)) return raw.feedbacks.map(mapApiAssessmentToPeerFeedback);

	return [mapApiAssessmentToPeerFeedback(raw)]; //single case
}
