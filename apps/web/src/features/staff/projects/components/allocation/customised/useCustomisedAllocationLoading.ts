/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import {
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  type CustomAllocationCoverage,
} from "@/features/projects/api/teamAllocation";
import {
  countEligibleQuestions,
  sortByTemplateName,
  type CustomAllocationQuestionnaire,
} from "./customisedAllocation.utils";

type Args = {
  projectId: number;
  selectedTemplateId: string;
};

export function useCustomisedAllocationLoading({ projectId, selectedTemplateId }: Args) {
  const [questionnaires, setQuestionnaires] = useState<CustomAllocationQuestionnaire[]>([]);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [coverage, setCoverage] = useState<CustomAllocationCoverage | null>(null);
  const [isLoadingCoverage, setIsLoadingCoverage] = useState(false);
  const [coverageError, setCoverageError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoadingQuestionnaires(true);
    setLoadError("");
    getCustomAllocationQuestionnaires(projectId)
      .then((result) => {
        if (!isMounted) return;
        setQuestionnaires(sortByTemplateName(result.questionnaires));
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load questionnaires.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingQuestionnaires(false);
      });
    return () => { isMounted = false; };
  }, [projectId]);

  const eligibleQuestionnaires = useMemo(
    () => questionnaires.filter((template) => countEligibleQuestions(template) > 0),
    [questionnaires],
  );

  const selectedQuestionnaire = useMemo(() => {
    const parsedTemplateId = Number(selectedTemplateId);
    if (!Number.isInteger(parsedTemplateId)) return null;
    return eligibleQuestionnaires.find((template) => template.id === parsedTemplateId) ?? null;
  }, [eligibleQuestionnaires, selectedTemplateId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedQuestionnaire) {
      setCoverage(null);
      setCoverageError("");
      setIsLoadingCoverage(false);
      return;
    }
    setCoverage(null);
    setCoverageError("");
    setIsLoadingCoverage(true);
    getCustomAllocationCoverage(projectId, selectedQuestionnaire.id)
      .then((result) => {
        if (!isMounted) return;
        setCoverage(result);
      })
      .catch((error) => {
        if (!isMounted) return;
        setCoverageError(error instanceof Error ? error.message : "Failed to load response coverage.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingCoverage(false);
      });
    return () => { isMounted = false; };
  }, [projectId, selectedQuestionnaire]);

  return {
    questionnaires,
    isLoadingQuestionnaires, loadError,
    eligibleQuestionnaires, selectedQuestionnaire,
    coverage, isLoadingCoverage, coverageError,
  };
}