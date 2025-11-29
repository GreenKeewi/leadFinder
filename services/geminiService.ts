
import { GoogleGenAI } from "@google/genai";
import { BusinessResult, AdvancedSearchOptions } from "../types";

// NOTE: In a production Next.js app, this logic would typically reside in a server-side API route
// (e.g., app/api/scrape/route.ts) using Cheerio + Axios as requested.
// However, since this is a client-side Single Page Application (SPA) environment, 
// we cannot make direct CORS requests to 3rd party websites.
//
// SOLUTION: We use Gemini 2.5 Flash with Google Search Grounding to perform the "scrape" intelligently.
// This is more robust than a static scraper as it adapts to layout changes and can search multiple sources.

// Determine API key from Vite build env (client) or Node env (server)
const getApiKey = () => {
  // Vite exposes env vars with the `VITE_` prefix via `import.meta.env` at build time
  const viteKey = (import.meta.env as any).VITE_API_KEY;
  // Fallback to Node's process.env when running server-side
  const nodeKey = typeof process !== 'undefined' ? (process.env.API_KEY as string | undefined) : undefined;
  return viteKey ?? nodeKey;
};

const API_KEY = getApiKey();

if (!API_KEY) {
  throw new Error("An API Key must be set. For client builds set `VITE_API_KEY` in your .env (Vite) or set `process.env.API_KEY` on the server.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const sanitizeResult = (item: any): BusinessResult => {
  // Guard against null/undefined or non-object items in the array
  if (!item || typeof item !== 'object') {
    return {
      name: "N/A",
      phone: "N/A",
      address: "N/A",
      website: "N/A",
    };
  }
  return {
    name: typeof item.name === 'string' ? item.name : "N/A",
    phone: typeof item.phone === 'string' ? item.phone : "N/A",
    address: typeof item.address === 'string' ? item.address : "N/A",
    website: typeof item.website === 'string' ? item.website : "N/A",
  };
};

export const fetchBusinessData = async (keyword: string, city: string, options?: AdvancedSearchOptions): Promise<BusinessResult[]> => {
  try {
    let advancedInstructions = "";
    if (options) {
      if (options.industry) advancedInstructions += `\n- Specific Industry/Category: ${options.industry}`;
      if (options.companySize) advancedInstructions += `\n- Company Size: ${options.companySize}`;
      if (options.yearsInOperation) advancedInstructions += `\n- Years in Operation: ${options.yearsInOperation}`;
    }

    const prompt = `Find 20 to 25 real businesses in ${city} (North America) that match the keyword "${keyword}".
    ${advancedInstructions}
    
    CRITICAL INSTRUCTIONS:
    1. Only return businesses that have a valid Phone Number and Website URL.
    2. Physical Address is optional (use "N/A" if unavailable).
    3. If you cannot find businesses strictly matching the advanced filters (e.g. Years in Operation), YOU MUST RELAX THOSE FILTERS and return the best available matches rather than returning nothing or an error message.
    4. DO NOT return an explanation, apology, or conversational text.
    5. RETURN ONLY A RAW JSON ARRAY.

    For each business, return the Name, Phone Number, Address, and Website URL.

    Return the result strictly as a JSON array of objects with the following keys:
    - "name": Business Name
    - "phone": Phone Number
    - "address": Full Address (or "N/A" if unavailable)
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

    // Robust JSON extraction: Find the first '[' and last ']' to ignore conversational intros/outros
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    
    // Only substring if both brackets exist and are in correct order
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      text = text.substring(firstBracket, lastBracket + 1);
    } else {
      // If we can't find array brackets, check for single object brackets
      const firstCurly = text.indexOf('{');
      const lastCurly = text.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        text = text.substring(firstCurly, lastCurly + 1);
      }
    }

    try {
      if (!text || text.length === 0) return [];
      
      const parsed = JSON.parse(text);
      
      let results: BusinessResult[] = [];

      if (Array.isArray(parsed)) {
        results = parsed.map(sanitizeResult);
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Handle case where model returns a single object instead of an array
        results = [sanitizeResult(parsed)];
      }
      
      // Strict filtering in code to ensure no partial data slips through
      // Address is no longer strictly required
      return results.filter(r => 
        r.name !== "N/A" &&
        r.phone !== "N/A" && 
        r.website !== "N/A"
      );

    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      // Check if the response was a polite refusal
      if (text.toLowerCase().includes("unable to fulfill") || text.toLowerCase().includes("cannot confidently provide")) {
        throw new Error("Criteria too strict. The AI could not find enough matching businesses. Please try relaxing your advanced filters (e.g., 'Years in Operation').");
      }
      throw new Error("Received malformed data from AI. Please try again or relax your search filters.");
    }

  } catch (error: any) {
    console.error("Error fetching business data:", error);
    // Propagate the specific error message if it was thrown by our parse logic
    if (error.message && (error.message.includes("Criteria too strict") || error.message.includes("malformed data"))) {
      throw error;
    }
    throw new Error("Failed to fetch business data. Please try again.");
  }
};
