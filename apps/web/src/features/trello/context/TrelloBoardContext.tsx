/* eslint-disable react-refresh/only-export-components */
"use client";

import React, { createContext, useContext } from "react";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import type { LoadTeamBoardOptions, TeamBoardViewState } from "@/features/trello/lib/teamBoardState";

export type { TeamBoardViewState };

type TrelloBoardContextValue = ReturnType<typeof useTeamBoardState>;

const TrelloBoardContext = createContext<TrelloBoardContextValue | null>(null);

export function useTrelloBoard(): TrelloBoardContextValue | null {
  return useContext(TrelloBoardContext);
}

type TrelloBoardProviderProps = {
  teamId: number;
  staffView?: boolean;
  children: React.ReactNode;
};

export function TrelloBoardProvider({ teamId, staffView, children }: TrelloBoardProviderProps) {
  const boardOptions: LoadTeamBoardOptions | undefined = staffView ? { staffView: true } : undefined;
  const value = useTeamBoardState(teamId, boardOptions);
  return (
    <TrelloBoardContext.Provider value={value}>
      {children}
    </TrelloBoardContext.Provider>
  );
}
