import { GoogleGenAI } from "@google/genai";

async function generateScreenshots() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompts = [
    "A professional mobile app login screen for 'Reimbful' expense tracker, orange and white theme, clean modern UI, high resolution.",
    "A mobile app dashboard for 'Reimbful' showing travel trip cards like 'Mumbai Trip' and 'Delhi Business', orange accents, plus button, clean UI.",
    "A mobile app screen showing a list of expenses for a trip, categories like Food and Travel, amounts in INR, receipt icons, orange theme.",
    "A professional PDF expense report summary page, clean table with columns for Category, Vendor, Date, and Amount, orange header."
  ];

  const results = [];
  for (const prompt of prompts) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        results.push(part.inlineData.data);
      }
    }
  }
  return results;
}

// This is a helper to be used in the next step
