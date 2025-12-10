
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, MODEL_NAME } from "../constants";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCloneContent = async (
  sampleText: string,
  newTopic: string,
  contextInfo: string = ""
): Promise<AnalysisResult> => {
  try {
    const prompt = `
NHIỆM VỤ: VIẾT BÀI MỚI DÙNG "STYLE" CỦA BÀI MẪU NHƯNG DÙNG "DATA" CỦA INPUT.

1. BÀI MẪU (STYLE SOURCE ONLY - IGNORE CONTENT):
"""
${sampleText}
"""
*(Chỉ phân tích cách viết, không dùng thông tin/sự kiện từ bài này)*

2. DỮ LIỆU BÀI MỚI (CONTENT SOURCE OF TRUTH):
- Chủ đề: ${newTopic}
- Dữ liệu chi tiết/Dàn ý (Context Info): 
"""
${contextInfo ? contextInfo : "Không có dữ liệu cụ thể, hãy phát triển nội dung dựa trên kiến thức chung chính xác về chủ đề này."}
"""
*(Đây là nguồn thông tin duy nhất. Nếu có số liệu/tên riêng ở đây, BẮT BUỘC phải đưa vào bài viết)*

3. YÊU CẦU CẤU TRÚC (VISIBILITY - STRICT):
- **FULL SEGMENTATION**: Bài viết bắt buộc phải có tiêu đề cho TẤT CẢ các phần:
  1. **INTRODUCTION** (Phải có tiêu đề này)
  2. **Part 1, Part 2...** (Body chia nhỏ có tiêu đề chức năng)
  3. **CONCLUSION** (Phải có tiêu đề này)
- **Structure**: Số lượng câu/đoạn phải tương đương bài mẫu.

4. YÊU CẦU KIỂM SOÁT DỮ LIỆU (DATA CONTROL):
- **CẤM**: Không nhắc đến bất kỳ nhân vật, địa điểm, con số nào của bài mẫu (Mục 1) trong bài viết mới.
- **BẮT BUỘC**: Mọi thông tin trong bài viết mới phải dựa trên Mục 2. Không bịa đặt số liệu nếu không có trong Mục 2.

HÃY BẮT ĐẦU VỚI [PHÂN TÍCH PHONG CÁCH], SAU ĐÓ LÀ BẢNG BLUEPRINT, VÀ CUỐI CÙNG LÀ [BÀI VIẾT MỚI].
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.5, // Giảm temperature để AI bám sát dữ liệu thật (context info) hơn, bớt sáng tạo lung tung
      },
    });

    const rawText = response.text || "";

    // Parse the output based on the tags defined in the system prompt
    const analysisTag = "[PHÂN TÍCH PHONG CÁCH]";
    const contentTag = "[BÀI VIẾT MỚI]";

    let analysis = "";
    let generatedContent = "";

    const analysisIndex = rawText.indexOf(analysisTag);
    const contentIndex = rawText.indexOf(contentTag);

    if (analysisIndex !== -1 && contentIndex !== -1) {
      analysis = rawText
        .substring(analysisIndex + analysisTag.length, contentIndex)
        .trim();
      generatedContent = rawText
        .substring(contentIndex + contentTag.length)
        .trim();
    } else {
      // Fallback if tags are missing, just treat everything as content or try best guess
      if (analysisIndex !== -1) {
          analysis = rawText.substring(analysisIndex + analysisTag.length).trim();
      } else {
          generatedContent = rawText;
      }
    }

    return {
      raw: rawText,
      analysis,
      generatedContent,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Không thể kết nối với AI. Vui lòng thử lại sau.");
  }
};