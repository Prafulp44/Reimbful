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
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route for sending email
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

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
      if (!resend) throw new Error("Resend instance target missing");
      
      console.log(`[Email Service] Sending via Resend SDK to: ${to}`);
      console.log(`[Email Service] Attachment count: ${pdfAttachments.length}`);

      const attachmentPayload = pdfAttachments.map((att: any, idx: number) => {
        if (!att.content || att.content.length < 10) {
          console.error(`[Email Service] Attachment ${idx} (${att.filename}) has INVALID or EMPTY content!`);
        } else {
          // Robust base64 cleaning
          const cleanBase64 = att.content.includes('base64,') ? att.content.split('base64,')[1] : att.content;
          const buffer = Buffer.from(cleanBase64.replace(/\s/g, ''), 'base64');
          
          const magicNumber = buffer.toString('utf8', 0, 5);
          if (magicNumber !== '%PDF-') {
            console.error(`[Email Service] Attachment ${idx} (${att.filename}) is NOT A VALID PDF! Magic number: "${magicNumber}" (Size: ${buffer.length} bytes)`);
          } else {
            console.log(`[Email Service] Attachment ${idx} (${att.filename}) verified size: ${Math.round(buffer.length / 1024)} KB`);
          }
          
          return {
            filename: att.filename,
            content: buffer,
          };
        }
        return {
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
        };
      });

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [to],
        subject: subject,
        text: body,
        attachments: attachmentPayload,
      });

      if (error) {
        console.error("[Resend SDK Error]:", error);
        return res.status(400).json({ success: false, message: error.message });
      }

      console.log("[Email Service] Email sent successfully via SDK. ID:", data?.id);
      res.json({ success: true, message: "Email sent successfully via Resend", id: data?.id });
    } catch (err: any) {
      console.error("[Email Service Exception]:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Proxy route for mobile downloads to bypass iframe/blob issues
  app.post("/api/download-pdf", (req, res) => {
    console.log("[Download Service] Received download request for:", req.body.filename);
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      console.error("[Download Service] Missing filename or content");
      return res.status(400).send("Missing filename or content");
    }

    try {
      // Clean content: remove data URL prefix and whitespace
      const cleanContent = content.includes('base64,') ? content.split('base64,')[1] : content;
      const buffer = Buffer.from(cleanContent.replace(/\s/g, ''), 'base64');
      
      console.log(`[Download Service] Sending PDF: ${filename} (${buffer.length} bytes)`);
      
      // Verify PDF magic number
      const magicNumber = buffer.toString('utf8', 0, 5);
      if (magicNumber !== '%PDF-') {
        console.error(`[Download Service] INVALID PDF FORMAT! Magic number was: "${magicNumber}" (Decoded size: ${buffer.length} bytes)`);
      } else {
        console.log(`[Download Service] PDF Magic Number verified: ${magicNumber}`);
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } catch (error) {
      console.error("[Download Service] Failed:", error);
      res.status(500).send("Download failed");
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
