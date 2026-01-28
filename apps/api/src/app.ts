import express from "express";
import cors from "cors";
import questionnairesRouter from "./features/questionnaires/router.js";
import peerAssessmentsRouter from "./features/peerAssessment/router.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.use("/questionnaires", questionnairesRouter);
app.use("/peer-assessments", peerAssessmentsRouter);

export { app };
