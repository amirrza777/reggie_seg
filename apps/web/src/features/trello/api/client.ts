import { refreshAccessToken } from "@/features/auth/api/client";
import { ApiError } from "@/shared/api/errors";
import { apiFetch } from "@/shared/api/http";
import type { TrelloBoardAction, TrelloBoardDetail, TrelloCard, TrelloMember } from "../types";

type ApiFetchInit = Parameters<typeof apiFetch>[1];

async function trelloFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  try {
    return await apiFetch<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const token = await refreshAccessToken();
      if (token) {
        return await apiFetch<T>(path, init);
      }
    }
    throw err;
  }
}

function addMembersToCards(
  cards: TrelloCard[],
  membersById: Record<string, TrelloMember>
): TrelloCard[] {
  return cards.map((card) => ({
    ...card,
    members:
      card.members?.length ?
        card.members
      : (card.idMembers ?? []).map((id) => membersById[id]).filter(Boolean),
  }));
}

export type BoardView = {
  board: TrelloBoardDetail;
  listNamesById: Record<string, string>;
  actionsByDate: Record<string, TrelloBoardAction[]>;
  cardsByList: Record<string, TrelloCard[]>;
};

export function rawBoardToBoardView(board: TrelloBoardDetail): BoardView {
  const membersById = (board.members ?? []).reduce<Record<string, TrelloMember>>(
    (acc, m) => {
      acc[m.id] = m;
      return acc;
    },
    {}
  );
  const cardsWithMembers = addMembersToCards(board.cards ?? [], membersById);
  const cardsByList = cardsWithMembers.reduce<Record<string, TrelloCard[]>>((acc, card) => {
    const listId = card.idList;
    if (!acc[listId]) acc[listId] = [];
    acc[listId].push(card);
    return acc;
  }, {});
  const listNamesById = (board.lists ?? []).reduce<Record<string, string>>((acc, list) => {
    acc[list.id] = list.name;
    return acc;
  }, {});
  const actions = (board.actions ?? []).slice().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const actionsByDate = actions.reduce<Record<string, TrelloBoardAction[]>>((acc, action) => {
    const dateKey = action.date.slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(action);
    return acc;
  }, {});
  return { board, listNamesById, actionsByDate, cardsByList };
}

export async function getBoardById(boardId: string): Promise<BoardView> {
  const board = await trelloFetch<TrelloBoardDetail>(
    `/trello/boards/${encodeURIComponent(boardId)}`,
    { method: "GET" }
  );
  return rawBoardToBoardView(board);
}

export type TeamBoardSummary = { id: string; name: string; url?: string };

export type TeamBoardResult =
  | { ok: true; view: BoardView; sectionConfig: Record<string, string> }
  | { ok: false; requireJoin: true; boardUrl: string };

/** Fetches the board assigned to the team. Returns full board view + section config, or requireJoin + boardUrl if the user must join the board on Trello first. */
export async function getTeamBoard(teamId: number): Promise<TeamBoardResult> {
  const raw = await trelloFetch<
    | { requireJoin: true; boardUrl: string }
    | { board: TrelloBoardDetail; sectionConfig?: Record<string, string> }
  >(`/trello/team-board?teamId=${encodeURIComponent(String(teamId))}`, { method: "GET" });
  if (raw && typeof raw === "object" && "requireJoin" in raw && raw.requireJoin && raw.boardUrl) {
    return { ok: false, requireJoin: true, boardUrl: raw.boardUrl };
  }
  const { board, sectionConfig } = raw as { board: TrelloBoardDetail; sectionConfig?: Record<string, string> };
  return {
    ok: true,
    view: rawBoardToBoardView(board),
    sectionConfig: sectionConfig && typeof sectionConfig === "object" ? sectionConfig : {},
  };
}

export const TRELLO_SECTION_STATUSES = [
  "information_only",
  "backlog",
  "work_in_progress",
  "completed",
] as const;
export type TrelloSectionStatus = (typeof TRELLO_SECTION_STATUSES)[number];

/** Default status from list name */
export function getDefaultStatusForListName(listName: string): "backlog" | "work_in_progress" | "completed" {
  const lower = listName.toLowerCase().trim();
  if (lower === "backlog") return "backlog";
  if (lower === "completed") return "completed";
  return "work_in_progress";
}

export function mergeSectionConfigWithDefaults(
  listNames: string[],
  savedConfig: Record<string, string> | null | undefined
): Record<string, string> {
  const merged: Record<string, string> = {};
  const config = savedConfig && typeof savedConfig === "object" ? savedConfig : {};
  for (const name of listNames) {
    const saved = config[name];
    const valid =
      saved &&
      typeof saved === "string" &&
      (TRELLO_SECTION_STATUSES as readonly string[]).includes(saved);
    merged[name] = valid ? saved : getDefaultStatusForListName(name);
  }
  return merged;
}

export async function putTrelloSectionConfig(
  teamId: number,
  config: Record<string, string>
): Promise<{ ok: boolean }> {
  return trelloFetch<{ ok: boolean }>("/trello/team-section-config", {
    method: "PUT",
    body: JSON.stringify({ teamId, config }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function getLinkToken(): Promise<{ linkToken: string }> {
  return trelloFetch<{ linkToken: string }>("/trello/link-token", { method: "GET" });
}

/** Get trello connect URL. Pass full callback URL (e.g. origin + /projects/:projectId/trello/callback) so redirects there after auth. */
export async function getConnectUrl(callbackUrl?: string): Promise<{ url: string }> {
  const url = callbackUrl
    ? `/trello/connect-url?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/trello/connect-url";
  return trelloFetch<{ url: string }>(url, { method: "GET" });
}

export type OwnerBoard = { id: string; name: string };

export async function getMyBoards(): Promise<OwnerBoard[]> {
  const data = await trelloFetch<OwnerBoard[]>("/trello/boards", { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function assignBoardToTeam(teamId: number, boardId: string): Promise<{ message: string }> {
  return trelloFetch<{ message: string }>("/trello/assign", {
    method: "POST",
    body: JSON.stringify({ teamId, boardId }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function completeTrelloLinkWithToken(linkToken: string, trelloToken: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/trello/callback-with-link-token", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ linkToken, token: trelloToken }),
  });
}

export async function getMyTrelloMemberId(): Promise<{ trelloMemberId: string | null }> {
  return trelloFetch<{ trelloMemberId: string | null }>("/trello/me-member", { method: "GET" });
}

export type TrelloProfile = {
  trelloMemberId: string | null;
  fullName: string | null;
  username: string | null;
};

export async function getMyTrelloProfile(): Promise<TrelloProfile> {
  return trelloFetch<TrelloProfile>("/trello/me-profile", { method: "GET" });
}
