import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import questionnaireCreationRouter from "./questionnaire-creation 2";
import questionnaireEditingRouter from "./questionnaire-editing";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.use("/questionnaire-creation", questionnaireCreationRouter);

app.use("/questionnaire-editing", questionnaireEditingRouter);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

