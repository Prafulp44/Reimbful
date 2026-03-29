import express from "express";

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post("/api/send-email", async (req, res) => {
  const { to, subject, body, pdfBase64 } = req.body;
  
  console.log(`[Vercel API] Sending email to: ${to}`);
  console.log(`[Vercel API] Subject: ${subject}`);
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  res.json({ success: true, message: "Email sent successfully (simulated on Vercel)" });
});

export default app;
