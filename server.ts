import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for sending email
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, body, attachments } = req.body;
    
    // Support legacy single attachment for compatibility
    const pdfAttachments = attachments || (req.body.pdfBase64 ? [{ filename: 'report.pdf', content: req.body.pdfBase64 }] : []);

    console.log(`[Email Service] Sending email to: ${to}`);
    console.log(`[Email Service] Subject: ${subject}`);
    console.log(`[Email Service] Attachments: ${pdfAttachments.length}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({ success: true, message: "Email sent successfully (simulated)" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
