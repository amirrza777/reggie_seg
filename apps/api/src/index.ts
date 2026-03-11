import dotenv from "dotenv";
import { app } from "./app.js";
import { startNotificationJob } from "./shared/notificationJob.js";

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
  startNotificationJob();
});
