import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// 1. OCR Service: Analyze medicine bottle/box
export const analyzeMedicineImage = async (base64Image: string) => {
  if (!ai) return {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "请分析这张药品图片，提取以下信息：药品名称(name)，建议用法用量(dosage)，注意事项(instructions)。请用JSON格式返回。"
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            dosage: { type: Type.STRING },
            instructions: { type: Type.STRING },
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};

// 2. Voice Intent Service
export const analyzeVoiceIntent = async (transcript: string) => {
  if (!ai) return { intent: "UNKNOWN" };
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User said: "${transcript}". 
      Determine the user's intent from the following categories:
      - "CONFIRM_TAKEN": User says they took medicine.
      - "FEELING_BAD": User says they feel unwell/dizzy/pain.
      - "QUERY_TIME": User asks what time it is or when to take medicine.
      - "UNKNOWN": Anything else.
      
      If intent is CONFIRM_TAKEN, try to extract which medicine (entity).
      If intent is FEELING_BAD, summarize the symptom.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING, enum: ["CONFIRM_TAKEN", "FEELING_BAD", "QUERY_TIME", "UNKNOWN"] },
            entity: { type: Type.STRING, description: "Medicine name if applicable" },
            symptom: { type: Type.STRING, description: "Symptom description if applicable" }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Intent Error:", error);
    return { intent: "UNKNOWN" };
  }
};

// 3. AI Companion Chat Service
export const getAIChatResponse = async (history: { role: string, parts: [{ text: string }] }[], message: string) => {
  if (!ai) return "请配置 Gemini API Key 后再跟我聊天吧。";
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history,
      config: {
        systemInstruction: "你是一位贴心的老年人健康助手，名字叫“药小助”。你的语气要亲切、耐心、温暖，像对待自己的长辈一样。回答要简洁易懂，避免使用专业术语。多关心老人的身体和心情。"
      }
    });

    const result = await chat.sendMessage({ message: message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "我现在有点累了，请稍后再跟我聊天吧。";
  }
};