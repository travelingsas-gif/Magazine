import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

// Follows @google/genai guidelines:
// 1. Use process.env.API_KEY directly.
// 2. Do not use import.meta.env (fixes TS error).
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInventoryImage = async (base64Image: string, availableProducts: Product[]) => {
  try {
    // Rimuove il prefisso data url se presente
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

    // Use gemini-3-flash-preview for multimodal tasks (image + text) as per guidelines examples.
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

    // Access .text directly as per guidelines
    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return [];
  }
};