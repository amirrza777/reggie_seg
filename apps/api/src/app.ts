import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import questionnairesRouter from "./features/questionnaires/router.js";
import peerAssessmentsRouter from "./features/peerAssessment/router.js";
import staffPeerAssessmentsRouter from "./features/peerAssessment/staff/router.js";
import meetingsRouter from "./features/meetings/router.js";
import teamAllocationRouter from "./features/teamAllocation/router.js";
import authRouter from "./auth/router.js";
import peerFeedbackRouter from "./features/peerFeedback/router.js";
import projectsRouter from "./features/projects/router.js";
import { healthHandler } from "./health.js";
import adminRouter from "./features/admin/router.js";

const app = express();

// Normalize quoted charset to avoid body-parser charset errors (e.g. charset="UTF-8").
app.use((req, _res, next) => {
  const ct = req.headers["content-type"];
  if (ct && /charset\s*=\s*"/i.test(ct)) {
    req.headers["content-type"] = ct.replace(/charset\s*=\s*"([^"]*)"/i, "charset=$1");
  }
  next();
});

app.use(
  cors({
    origin: ["http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3001", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.get("/health", healthHandler);

app.use("/auth", authRouter);
app.use("/questionnaires", questionnairesRouter);
app.use("/projects", projectsRouter);
app.use("/peer-assessments", peerAssessmentsRouter);
app.use("/peer-feedback", peerFeedbackRouter);
app.use("/staff/peer-assessments", staffPeerAssessmentsRouter);
app.use("/meetings", meetingsRouter);
app.use("/team-allocation", teamAllocationRouter);
app.use("/admin", adminRouter);

export { app };
