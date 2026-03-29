import express from "express";
import { Resend } from 'resend';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Initialize Resend with API Key from environment
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.post("/api/send-email", async (req, res) => {
  const { to, subject, body, pdfBase64 } = req.body;
  
  if (!resend) {
    console.error("[Vercel API] RESEND_API_KEY is not configured.");
    return res.status(500).json({ 
      success: false, 
      message: "Email service not configured. Please add RESEND_API_KEY to Vercel environment variables." 
    });
  }

  try {
    console.log(`[Vercel API] Attempting to send real email to: ${to}`);
    
    const { data, error } = await resend.emails.send({
      from: 'Reimbful <onboarding@resend.dev>', // Default Resend test address
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
});

export default app;
