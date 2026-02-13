import { Router } from "express";
import {
  fetchBoard,
  fetchBoardLists,
  fetchListCards
} from "./controller.js";

const router = Router();

router.get("/boards/:boardId", fetchBoard);
router.get("/boards/:boardId/lists", fetchBoardLists);
router.get("/lists/:listId/cards", fetchListCards);

export default router;
