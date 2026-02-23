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

export async function getBoardById(boardId: string): Promise<BoardView> {
  const board = await trelloFetch<TrelloBoardDetail>(
    `/trello/boards/${encodeURIComponent(boardId)}`,
    { method: "GET" }
  );
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
