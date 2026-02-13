import { Router } from "express"
import { TrelloController } from "./controller.js"
import { requireAuth } from "../../auth/middleware.js"
import { TrelloRepo } from "./repo.js"; //need to refactor

const router = Router()

function buildTrelloAuthorizeUrl() {
  const trelloKey = process.env.TRELLO_KEY;
  if (!trelloKey) return null;

  const appName = process.env.TRELLO_APP_NAME || "Team Feedback";
  // Keep Trello callback host independent from APP_BASE_URL so Trello can stay localhost-only.
  const trelloAppBaseUrl = (process.env.TRELLO_APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
  const callbackUrl = `${trelloAppBaseUrl}/trello-test/callback`;

  return `https://trello.com/1/authorize?key=${trelloKey}&name=${encodeURIComponent(appName)}&scope=read&expiration=never&response_type=token&return_url=${encodeURIComponent(callbackUrl)}`;
}

router.post("/assign", requireAuth, TrelloController.assignBoard)
router.get("/team-board", requireAuth, TrelloController.fetchTeamBoard)
router.get("/owner-boards", requireAuth, TrelloController.fetchOwnerBoards)

router.get("/connect-url", requireAuth, (_req, res) => {
  const url = buildTrelloAuthorizeUrl();
  if (!url) {
    return res.status(503).json({ error: "Trello is not configured on this server." });
  }

  return res.status(200).json({ url });
});

router.get("/connect", requireAuth, (_req, res) => {
  const url = buildTrelloAuthorizeUrl();
  if (!url) {
    return res.status(503).json({ error: "Trello is not configured on this server." });
  }

  return res.redirect(url);
});

router.post("/callback", requireAuth, async (req, res) => {
  try {
    const token = req.body?.token as string;
    const userId = (req.user as any).sub as number;

    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    const trelloKey = process.env.TRELLO_KEY;
    if (!trelloKey) {
      return res.status(503).json({ error: "Trello is not configured on this server." });
    }

    const memberRes = await fetch(
      `https://api.trello.com/1/members/me?key=${trelloKey}&token=${token}`
    );
    if (!memberRes.ok) throw new Error("Failed to fetch Trello member");
    const memberData = await memberRes.json();
    const trelloMemberId = memberData.id;

    await TrelloRepo.updateUserTrelloToken(userId, token, trelloMemberId);

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/callback", (_req, res) => {
  return res.status(405).json({ error: "Use POST /trello/callback after handling Trello token on the frontend callback page." });
});

export default router
