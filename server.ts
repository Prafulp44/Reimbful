import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for sending email
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, body, attachments } = req.body;
    
    // Support legacy single attachment for compatibility
    const pdfAttachments = attachments || (req.body.pdfBase64 ? [{ filename: 'report.pdf', content: req.body.pdfBase64 }] : []);

    console.log(`[Email Service] Attempting to send email to: ${to}`);
    console.log(`[Email Service] Attachments received: ${pdfAttachments.length}`);

    if (!resend) {
      console.warn("[Email Service] RESEND_API_KEY not found. Simulating success.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.json({ success: true, message: "Email sent successfully (simulated - no API key)" });
    }

    try {
      console.log(`[Email Service] Sending via Resend API to: ${to}`);
      console.log(`[Email Service] Attachment filenames: ${pdfAttachments.map((a: any) => a.filename).join(', ')}`);
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: [to],
          subject: subject,
          text: body,
          attachments: pdfAttachments.map((att: any) => ({
            filename: att.filename,
            content: att.content,
          })),
        }),
      });

      const data = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error("[Resend API Error]:", data);
        return res.status(resendResponse.status).json({ success: false, message: data.message || "Resend API error" });
      }

      console.log("[Email Service] Email sent via Resend API:", data.id);
      res.json({ success: true, message: "Email sent successfully via Resend", id: data.id });
    } catch (err: any) {
      console.error("[Email Service Exception]:", err);
      res.status(500).json({ success: false, message: err.message });
    }
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
