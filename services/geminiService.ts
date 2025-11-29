import { GoogleGenAI } from "@google/genai";
import { BusinessResult } from "../types";

// NOTE: In a production Next.js app, this logic would typically reside in a server-side API route
// (e.g., app/api/scrape/route.ts) using Cheerio + Axios as requested.
// However, since this is a client-side Single Page Application (SPA) environment, 
// we cannot make direct CORS requests to 3rd party websites.
//
// SOLUTION: We use Gemini 2.5 Flash with Google Search Grounding to perform the "scrape" intelligently.
// This is more robust than a static scraper as it adapts to layout changes and can search multiple sources.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchBusinessData = async (keyword: string, city: string): Promise<BusinessResult[]> => {
  try {
    const prompt = `Find 5 to 10 real businesses in ${city}, Ontario that match the keyword "${keyword}".
    
    For each business, find their specific Name, Phone Number, Address, and Website URL.
    If a specific detail is not available, use "N/A".
    Ensure the data is accurate and from Ontario, Canada.

    Return the result strictly as a JSON array of objects with the following keys:
    - "name": Business Name
    - "phone": Phone Number
    - "address": Full Address
    - "website": Website URL

    Do not return markdown code blocks, just the raw JSON string.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType and responseSchema are not supported when using googleSearch tools.
      },
    });

    let text = response.text;
    if (!text) return [];

    // Clean up potential markdown code blocks if the model ignores the instruction
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(text) as BusinessResult[];
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Received malformed data from AI. Please try again.");
    }

  } catch (error) {
    console.error("Error fetching business data:", error);
    throw new Error("Failed to fetch business data. Please try again.");
  }
};