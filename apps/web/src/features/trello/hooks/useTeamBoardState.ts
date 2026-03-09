"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mergeSectionConfigWithDefaults } from "@/features/trello/api/client";
import {
  loadTeamBoardState,
  type TeamBoardViewState,
} from "@/features/trello/lib/teamBoardState";

export type { TeamBoardViewState } from "@/features/trello/lib/teamBoardState";

export function useTeamBoardState(teamId: number) {
  const [state, setState] = useState<TeamBoardViewState>({ status: "loading" });

  const loadTeamBoard = useCallback(() => loadTeamBoardState(teamId, setState), [teamId]);

  useEffect(() => {
    loadTeamBoard();
  }, [loadTeamBoard]);

  const mergedSectionConfig = useMemo(() => {
    if (state.status !== "board") return {};
    return mergeSectionConfigWithDefaults(
      (state.view.board.lists ?? []).map((l) => l.name),
      state.sectionConfig
    );
  }, [state.status, state.status === "board" ? state.view?.board?.lists : null, state.status === "board" ? state.sectionConfig : null]);

  return { state, setState, loadTeamBoard, mergedSectionConfig };
}
