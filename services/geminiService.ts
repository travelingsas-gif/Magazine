import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Add explicit return type to the function to ensure type safety for API responses.
export const analyzeInventoryImage = async (base64Image: string, availableProducts: Product[]): Promise<{ productName: string; estimatedQuantity: number }[]> => {
  try {
    // We strip the data url prefix if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const productNames = availableProducts.map(p => p.name).join(', ');

    const prompt = `
      Analizza questa immagine di un magazzino/ripostiglio.
      Ho bisogno di stimare la quantità dei seguenti prodotti visibili: ${productNames}.
      
      Restituisci SOLO un array JSON dove ogni oggetto ha:
      - productName: il nome del prodotto trovato (deve corrispondere esattamente a uno della lista fornita, o essere molto simile)
      - estimatedQuantity: un numero intero stimato.
      
      Se non trovi nulla, restituisci un array vuoto.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              estimatedQuantity: { type: Type.INTEGER }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Fix: Safely parse the JSON and ensure it's an array to avoid runtime errors.
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch(e) {
        console.error("Error parsing Gemini JSON response:", text, e);
        return [];
    }

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return [];
  }
};
