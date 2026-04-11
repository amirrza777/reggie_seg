import { describe, expect, it } from "vitest";
import { buildTrelloGraphProps } from "./trelloGraphProps";
import type { BoardView } from "@/features/trello/api/client";

const minimalView: BoardView = {
  board: { id: "b1", name: "B", lists: [], members: [], url: "" },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

describe("buildTrelloGraphProps", () => {
  it("maps view fields and trims deadline dates to YYYY-MM-DD", () => {
    const props = buildTrelloGraphProps(
      minimalView,
      { Done: "completed" },
      {
        taskOpenDate: "2026-01-15T00:00:00.000Z",
        taskDueDate: " 2026-06-01T12:00:00Z ",
      } as any,
    );

    expect(props.cardsByList).toBe(minimalView.cardsByList);
    expect(props.sectionConfig).toEqual({ Done: "completed" });
    expect(props.projectStartDate).toBe("2026-01-15");
    expect(props.projectEndDate).toBe("2026-06-01");
  });

  it("omits project dates when deadline is missing or blank", () => {
    expect(buildTrelloGraphProps(minimalView, {}, null).projectStartDate).toBeUndefined();
    expect(buildTrelloGraphProps(minimalView, {}, { taskOpenDate: "  " } as any).projectStartDate).toBeUndefined();
  });
});
