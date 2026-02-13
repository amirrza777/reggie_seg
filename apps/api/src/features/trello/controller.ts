import { Request, Response } from "express";
import {
  getBoard,
  getBoardLists,
  getListCards
} from "./service.js";

//GET /trello/boards/:boardId
export async function fetchBoard(req: Request, res: Response) {
  const { boardId } = req.params;

  const board = await getBoard(boardId);
  res.json(board);
}

//GET /trello/boards/:boardId/lists
export async function fetchBoardLists(req: Request, res: Response) {
  const { boardId } = req.params;

  const lists = await getBoardLists(boardId);
  res.json(lists);
}

//GET /trello/lists/:listId/cards
export async function fetchListCards(req: Request, res: Response) {
  const { listId } = req.params;

  const cards = await getListCards(listId);
  res.json(cards);
}
