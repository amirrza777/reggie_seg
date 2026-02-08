import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import questionnairesRouter from "./features/questionnaires/router.js";
import peerAssessmentsRouter from "./features/peerAssessment/router.js";
import staffPeerAssessmentsRouter from "./features/peerAssessment/staff/router.js";
import meetingsRouter from "./features/meetings/router.js";
import authRouter from "./auth/router.js";
import { healthHandler } from "./health.js";
import adminRouter from "./features/admin/router.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3001", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.get("/health", healthHandler);

app.use("/auth", authRouter);
app.use("/questionnaires", questionnairesRouter);
app.use("/peer-assessments", peerAssessmentsRouter);
app.use("/staff/peer-assessments", staffPeerAssessmentsRouter);
app.use("/meetings", meetingsRouter);
app.use("/admin", adminRouter);

export { app };
