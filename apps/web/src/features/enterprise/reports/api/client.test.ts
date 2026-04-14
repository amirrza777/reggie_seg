import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  dismissForumReport,
  getForumReportConversation,
  getForumReports,
  removeForumReportPost,
} from "./client";

describe("enterprise reports api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("lists forum reports", async () => {
    await getForumReports();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/forum-reports");
  });

  it("dismisses and removes reports by id", async () => {
    await dismissForumReport(12);
    await removeForumReportPost(13);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/enterprise-admin/forum-reports/12", {
      method: "DELETE",
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/enterprise-admin/forum-reports/13/remove", {
      method: "DELETE",
    });
  });

  it("loads a report conversation", async () => {
    await getForumReportConversation(88);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/forum-reports/88/conversation");
  });
});
