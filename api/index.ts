import express from "express";
import { Resend } from 'resend';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Initialize Resend with API Key from environment
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Handle both /api/send-email and /send-email due to Vercel rewrite variations
const emailHandler = async (req: any, res: any) => {
  const { to, subject, body, pdfBase64 } = req.body;
  
  if (!resend) {
    console.error("[Vercel API] RESEND_API_KEY is not configured.");
    return res.status(500).json({ 
      success: false, 
      message: "Email service not configured. Please add RESEND_API_KEY to Vercel environment variables." 
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
    console.log(`[Vercel API] Attempting to send real email to: ${to}`);
    
    const { data, error } = await resend.emails.send({
      from: 'Reimbful <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: body,
      attachments: [
        {
          filename: 'Expense_Report.pdf',
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      console.error("[Vercel API] Resend Error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }

    console.log(`[Vercel API] Email sent successfully via Resend: ${data?.id}`);
    res.json({ success: true, message: "Email sent successfully via Resend!" });
  } catch (err: any) {
    console.error("[Vercel API] Unexpected Error:", err);
    res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
};

app.post("/api/send-email", emailHandler);
app.post("/send-email", emailHandler);
app.post("/", emailHandler); // Fallback for direct function calls

export default app;
