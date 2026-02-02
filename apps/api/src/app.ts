import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import questionnairesRouter from "./features/questionnaires/router.js";
import peerAssessmentsRouter from "./features/peerAssessment/router.js";
import meetingsRouter from "./features/meetings/router.js";
import authRouter from "./auth/router.js";
import { healthHandler } from "./health.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3001", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.get("/health", healthHandler);

app.use("/auth", authRouter);
app.use("/questionnaires", questionnairesRouter);
app.use("/peer-assessments", peerAssessmentsRouter);
app.use("/meetings", meetingsRouter);

export { app };