import express from "express";
import cors from "cors";
import questionnairesRouter from "./features/questionnaires/router.js";
import peerAssessmentsRouter from "./features/peerAssessment/router.js";
import staffPeerAssessmentsRouter from "./features/peerAssessment/staff/router.js";
import { healthHandler } from "./health.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", healthHandler);

app.use("/questionnaires", questionnairesRouter);
app.use("/peer-assessments", peerAssessmentsRouter);
app.use("/staff/peer-assessments", staffPeerAssessmentsRouter);

export { app };
