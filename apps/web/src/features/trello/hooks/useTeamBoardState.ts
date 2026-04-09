"use client";

import { useCallback, useEffect, useState } from "react";
import { mergeSectionConfigWithDefaults } from "@/features/trello/api/client";
import {
  loadTeamBoardState,
  type LoadTeamBoardOptions,
  type TeamBoardViewState,
} from "@/features/trello/lib/teamBoardState";

export type { TeamBoardViewState } from "@/features/trello/lib/teamBoardState";

export function useTeamBoardState(teamId: number, options?: LoadTeamBoardOptions) {
  const staffView = Boolean(options?.staffView);
  const [state, setState] = useState<TeamBoardViewState>({ status: "loading" });

  const loadTeamBoard = useCallback(
    () => loadTeamBoardState(teamId, setState, staffView ? { staffView: true } : undefined),
    [teamId, staffView]
  );

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
