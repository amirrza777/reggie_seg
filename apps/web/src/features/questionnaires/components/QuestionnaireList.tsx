"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useRouter } from "next/navigation";
import { logDevError } from "@/shared/lib/devLogger";
import { Button } from "@/shared/ui/Button";
import { QuestionnaireListSkeleton } from "@/shared/ui/skeletons/LoadingSkeletonBlocks";
import {
  getMyQuestionnaires,
  getPublicQuestionnairesFromOthers,
} from "../api/client";
import type { Questionnaire } from "../types";
import {
  QUESTIONNAIRE_PURPOSE_LABELS,
  normalizeQuestionnairePurpose,
} from "../purpose";
import { EditQuestionnaireButton, DeleteQuestionnaireButton } from "./SharedQuestionnaireButtons";

export function QuestionnaireList() {
  const [myQuestionnaires, setMyQuestionnaires] = useState<Questionnaire[]>([]);
  const [publicQuestionnaires, setPublicQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listPanelRef = useRef<HTMLDivElement | null>(null);
  const myQuestionnairesRef = useRef<HTMLElement | null>(null);
  const publicQuestionnairesRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    Promise.all([getMyQuestionnaires(), getPublicQuestionnairesFromOthers()])
      .then(([mine, publicOthers]) => {
        if (!active) return;
        setMyQuestionnaires(mine);
        setPublicQuestionnaires(publicOthers);
      })
      .catch((err: unknown) => {
        if (!active) return;
        logDevError(err);
        setError("Failed to load questionnaires.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <QuestionnaireListSkeleton />;
  }
  if (error) return <p className="ui-note ui-note--muted">{error}</p>;

  const scrollToSection = (sectionRef: RefObject<HTMLElement | null>) => {
    const panel = listPanelRef.current;
    const section = sectionRef.current;
    if (!panel || !section) return;

    const top =
      section.getBoundingClientRect().top -
      panel.getBoundingClientRect().top +
      panel.scrollTop;

    panel.scrollTo({ top, behavior: "smooth" });
  };

  const renderCard = (q: Questionnaire, allowManage: boolean) => (
    <div key={q.id} className="questionnaire-editor__list-card">
      <div className="ui-stack-xs">
        <strong>{q.templateName}</strong>
        <div className="questionnaire-editor__meta">
          Created {new Date(q.createdAt).toLocaleDateString()}{" "}
          {"\u00b7"} {QUESTIONNAIRE_PURPOSE_LABELS[normalizeQuestionnairePurpose(q.purpose)]}
        </div>
      </div>

      <div className="questionnaire-editor__list-card-actions">
        <Button
          type="button"
          variant="quiet"
          onClick={() => router.push(`/staff/questionnaires/${q.id}`)}
        >
          Preview
        </Button>
        {allowManage && <EditQuestionnaireButton questionnaireId={q.id} />}
        {allowManage && (
          <DeleteQuestionnaireButton
            questionnaireId={q.id}
            onDeleted={(deletedId) => {
              const idNum = typeof deletedId === "string" ? Number(deletedId) : deletedId;
              setMyQuestionnaires((items) => items.filter((item) => item.id !== idNum));
            }}
          />
        )}
      </div>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="questionnaire-editor__empty">
      <p>{message}</p>
    </div>
  );

  return (
    <div className="questionnaire-editor__list-shell">
      <div className="questionnaire-editor__actions">
        <Button type="button" variant="quiet" onClick={() => scrollToSection(myQuestionnairesRef)}>
          My Questionnaires
        </Button>
        <Button type="button" variant="quiet" onClick={() => scrollToSection(publicQuestionnairesRef)}>
          Public Questionnaires
        </Button>
      </div>

      <div ref={listPanelRef} className="questionnaire-editor__list-sections">
        <section className="stack" ref={myQuestionnairesRef}>
          <h2 className="questionnaire-editor__section-title">My Questionnaires</h2>
          {myQuestionnaires.length === 0
            ? renderEmptyState("You do not have any questionnaire templates. Create one to view it here.")
            : myQuestionnaires.map((q) => renderCard(q, true))}
        </section>

        <section className="stack" ref={publicQuestionnairesRef}>
          <h2 className="questionnaire-editor__section-title">Public Questionnaires</h2>
          {publicQuestionnaires.length === 0
            ? renderEmptyState("There are no public questionnaire templates yet.")
            : publicQuestionnaires.map((q) => renderCard(q, false))}
        </section>
      </div>
    </div>
  );
}