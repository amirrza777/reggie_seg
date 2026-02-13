const TRELLO_BASE_URL = "https://api.trello.com/1";

const key = process.env.TRELLO_KEY!;
const token = process.env.TRELLO_TOKEN!;

async function trelloFetch(path: string) {
  const url = new URL(`${TRELLO_BASE_URL}${path}`);
  url.searchParams.append("key", key);
  url.searchParams.append("token", token);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return response.json();
}

//fetch a team's trello board
export function getBoard(boardId: string) {
  return trelloFetch(`/boards/${boardId}`);
}

//fetch lists on a board
export function getBoardLists(boardId: string) {
  return trelloFetch(`/boards/${boardId}/lists`);
}

//fetch cards on a list
export function getListCards(listId: string) {
  return trelloFetch(`/lists/${listId}/cards`);
}

