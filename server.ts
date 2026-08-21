import app from "./api/index.ts";
import express from "express";
import path from "path";

const PORT = 3000;

// If running in traditional Node.js environment (Local Dev Server / Cloud Run)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando servidor Express em modo Desenvolvimento com Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando servidor Express em modo Produção servindo arquivos estáticos...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Glyco AI rodando com sucesso na porta ${PORT}`);
  });
}

startServer();

export default app;
