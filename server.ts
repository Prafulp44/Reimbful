import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Nodemailer
  const transporter =
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
      ? nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        })
      : null;

  // API Route for sending email
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, body, attachments, pdfBase64 } = req.body;

    // Normalize attachments
    const pdfAttachments =
      attachments ||
      (pdfBase64 ? [{ filename: "Expense_Report.pdf", content: pdfBase64 }] : []);

    if (!transporter) {
      console.warn("[Email Service] Gmail credentials not configured. Mocking success.");
      return res.json({ success: true, message: "Email sent successfully (simulated/mock)" });
    }

    try {
      console.log(`[Email Service] Sending real email to: ${to}`);

      const mailOptions = {
        from: `"Reimbful" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text: body,
        attachments: pdfAttachments.map((att: any) => ({
          filename: att.filename,
          content: Buffer.from(att.content, "base64"),
          contentType: "application/pdf",
        })),
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully!" });
    } catch (error: any) {
      console.error("[Email Service] Error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to send email" });
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
