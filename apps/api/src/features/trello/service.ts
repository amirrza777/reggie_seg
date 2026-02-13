import axios from "axios";

const TRELLO_BASE_URL = "https://api.trello.com/1";

const key = process.env.TRELLO_KEY!;
const token = process.env.TRELLO_TOKEN!;

//fetch a team's trello board
export async function getBoard(boardId: string) {
  const response = await axios.get(
    `${TRELLO_BASE_URL}/boards/${boardId}`,
    {
      params: { key, token }
    }
  );

  return response.data;
}

//fetch lists on a board
export async function getBoardLists(boardId: string) {
  const response = await axios.get(
    `${TRELLO_BASE_URL}/boards/${boardId}/lists`,
    {
      params: { key, token }
    }
  );

  return response.data;
}

//fetch cards on a list
export async function getListCards(listId: string) {
  const response = await axios.get(
    `${TRELLO_BASE_URL}/lists/${listId}/cards`,
    {
      params: { key, token }
    }
  );

  return response.data;
}
