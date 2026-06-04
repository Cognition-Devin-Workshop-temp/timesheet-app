import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import knowledgeRoutes from "./routes/knowledge";
import chatRoutes from "./routes/chat";

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", mode: process.env.LLM_PROVIDER || "demo" });
});

app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/chat", chatRoutes);

app.listen(PORT, () => {
  console.log(`Knowledge Chat Agent API running on http://localhost:${PORT}`);
  console.log(`LLM mode: ${process.env.LLM_PROVIDER || "demo"}`);
});
