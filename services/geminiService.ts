

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, MODEL_NAME } from "../constants";
import { AnalysisResult } from "../types";

export const generateCloneContent = async (
  apiKey: string,
  sampleText: string,
  newTopic: string,
  contextInfo: string = ""
): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Google Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `
INPUT DATA:
1. SAMPLE TEXT (MẪU - ONLY FOR STYLE ANALYSIS):
"""
${sampleText}
"""

2. NEW TASK:
- Topic: ${newTopic}
- Context Info (THE ONLY SOURCE OF TRUTH FOR DATA): 
"""
${contextInfo ? contextInfo : "No specific context provided. Use general knowledge consistent with the topic, but DO NOT copy facts from Sample Text."}
"""

STRICT DATA RULES:
- **SOURCE MATERIAL**: Use \`SAMPLE TEXT\` ONLY for Style, Tone, and Structure analysis. Treat its specific content (names, dates, locations) as meaningless placeholders.
- **FACTUAL SOURCE**: Use \`NEW TASK\` (Topic + Context Info) as the ONLY source for facts, names, data, and events.
- **PROHIBITED**: Do not copy any entities (people, places, specific events, numbers) from the SAMPLE TEXT to the NEW ARTICLE.

EXECUTION ORDER:
1. Analyze the SAMPLE TEXT to extract the Style JSON.
2. Construct the \`STYLE_DNA_JSON\` object.
3. Write the NEW ARTICLE in English. Ensure the content is derived 100% from the NEW TASK and 0% from the SAMPLE TEXT's facts.

REMEMBER: The new article's length must match the sample's length defined in the JSON.
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7, 
      },
    });

    const rawText = response.text || "";

    // Parse the output based on the tags
    const jsonTag = "[STYLE_DNA_JSON]";
    const contentTag = "[BÀI VIẾT MỚI]";

    let analysis = "";
    let generatedContent = "";

    const jsonIndex = rawText.indexOf(jsonTag);
    const contentIndex = rawText.indexOf(contentTag);

    // Extract JSON part
    if (jsonIndex !== -1) {
      const endOfJson = contentIndex !== -1 ? contentIndex : rawText.length;
      let jsonString = rawText.substring(jsonIndex + jsonTag.length, endOfJson).trim();
      
      // Clean up markdown code blocks if present to make it look nice in UI
      // We keep the code block markers for display in the "Analysis" sidebar so it looks like code
      analysis = jsonString;
    }

    // Extract Content part
    if (contentIndex !== -1) {
      generatedContent = rawText.substring(contentIndex + contentTag.length).trim();
    } else if (jsonIndex === -1) {
      // Fallback: if no tags found, assume everything is content
      generatedContent = rawText;
    }

    return {
      raw: rawText,
      analysis: analysis || "Could not extract Style DNA JSON.",
      generatedContent,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Không thể kết nối với AI. Vui lòng kiểm tra API Key hoặc thử lại sau.");
  }
};