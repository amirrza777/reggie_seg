import express from "express";
import cors from "cors";
import questionnairesRouter from "./features/questionnaires/router";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.use("/questionnaires", questionnairesRouter);

export { app };
