import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import questionnairesRouter from "./features/questionnaires/router.js";
import peerAssessmentsRouter from "./features/peerAssessment/router.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.use("/questionnaires", questionnairesRouter)
app.use("/peer-assessments", peerAssessmentsRouter);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
