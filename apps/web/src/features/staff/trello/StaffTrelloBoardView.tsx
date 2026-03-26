"use client";

import { TrelloBoardView } from "@/features/trello/views/TrelloBoardView";
import type { StaffTrelloContentViewProps } from "./StaffProjectTrelloContent";

export function StaffTrelloBoardView(props: StaffTrelloContentViewProps) {
  return <TrelloBoardView {...props} filterVariant="staff" />;
}
