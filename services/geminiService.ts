
import { GoogleGenAI } from "@google/genai";
import { BusinessResult, AdvancedSearchOptions } from "../types";

// NOTE: In a production Next.js app, this logic would typically reside in a server-side API route
// (e.g., app/api/scrape/route.ts) using Cheerio + Axios as requested.
// However, since this is a client-side Single Page Application (SPA) environment, 
// we cannot make direct CORS requests to 3rd party websites.
//
// SOLUTION: We use Gemini 2.5 Flash with Google Search Grounding to perform the "scrape" intelligently.
// This is more robust than a static scraper as it adapts to layout changes and can search multiple sources.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    
    CRITICAL REQUIREMENT: Only return businesses that have ALL of the following:
    1. A valid Phone Number
    2. A valid Website URL
    
    Physical Address is preferred but OPTIONAL. If a business does not have a specific address (e.g. online only or service area), return "N/A" for address.

    If a business is missing a Phone Number or Website, DO NOT include it in the list.

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
      throw new Error("Received malformed data from AI. Please try again.");
    }

  } catch (error) {
    console.error("Error fetching business data:", error);
    throw new Error("Failed to fetch business data. Please try again.");
  }
};
