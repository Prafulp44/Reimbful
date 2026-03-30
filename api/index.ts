import express from "express";
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Initialize Nodemailer with Gmail credentials from environment
const transporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD 
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

// Handle both /api/send-email and /send-email due to Vercel rewrite variations
const emailHandler = async (req: any, res: any) => {
  const { to, subject, body, pdfBase64 } = req.body;
  
  if (!transporter) {
    console.error("[Vercel API] Gmail credentials are not configured.");
    return res.status(500).json({ 
      success: false, 
      message: "Email service not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to environment variables." 
    });
  }

  // Check payload size (Vercel limit is 4.5MB)
  const payloadSize = Buffer.byteLength(JSON.stringify(req.body));
  if (payloadSize > 4 * 1024 * 1024) {
    return res.status(413).json({
      success: false,
      message: "The report is too large to send via email (exceeds 4MB). Please try downloading it instead."
    });
  }

  try {
    console.log(`[Vercel API] Attempting to send email via Gmail to: ${to}`);
    
    const mailOptions = {
      from: `"Reimbful" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      text: body,
      attachments: [
        {
          filename: 'Expense_Report.pdf',
          content: pdfBase64,
          encoding: 'base64'
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Vercel API] Email sent successfully via Gmail: ${info.messageId}`);
    res.json({ success: true, message: "Email sent successfully via Gmail!" });
  } catch (err: any) {
    console.error("[Vercel API] Unexpected Error:", err);
    res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
};

app.post("/api/send-email", emailHandler);
app.post("/send-email", emailHandler);
app.post("/", emailHandler); // Fallback for direct function calls

export default app;
