"use client";

import React, { createContext, useContext } from "react";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import type { TeamBoardViewState } from "@/features/trello/lib/teamBoardState";

export type { TeamBoardViewState };

type TrelloBoardContextValue = ReturnType<typeof useTeamBoardState>;

const TrelloBoardContext = createContext<TrelloBoardContextValue | null>(null);

export function useTrelloBoard(): TrelloBoardContextValue | null {
  return useContext(TrelloBoardContext);
}

type TrelloBoardProviderProps = {
  teamId: number;
  children: React.ReactNode;
};

export function TrelloBoardProvider({ teamId, children }: TrelloBoardProviderProps) {
  const value = useTeamBoardState(teamId);
  return (
    <TrelloBoardContext.Provider value={value}>
      {children}
    </TrelloBoardContext.Provider>
  );
}
