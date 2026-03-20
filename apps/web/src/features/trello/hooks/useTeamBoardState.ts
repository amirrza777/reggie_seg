"use client";

import { useCallback, useEffect, useState } from "react";
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

  const mergedSectionConfig =
    state.status !== "board"
      ? {}
      : mergeSectionConfigWithDefaults(
          (state.view.board.lists ?? []).map((l) => l.name),
          state.sectionConfig
        );

  return { state, setState, loadTeamBoard, mergedSectionConfig };
}
