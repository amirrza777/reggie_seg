import express from "express";
import cors from "cors";
import questionnairesRouter from "./features/questionnaires/router";
import { healthHandler } from "./health";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", healthHandler);

app.use("/questionnaires", questionnairesRouter);

export { app };
