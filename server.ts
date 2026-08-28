import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index.js";
import { initNeonTables } from "./src/db/neonService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount API router
  app.use(apiApp);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Initialize Neon PostgreSQL database tables & sync data in background
  initNeonTables().then((res) => {
    if (res.success) {
      console.log(`[Neon Database] ${res.message}`);
    } else {
      console.log(`[Neon Database] Info: ${res.message}`);
    }
  }).catch((err) => {
    console.error("[Neon Database] Startup init error:", err);
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jeres Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
