import { GoogleGenAI, Modality } from "@google/genai";

export async function generateTikTokTitle(postTitle: string, postBody: string): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API-Schlüssel für Gemini nicht konfiguriert.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        Act as a viral social media expert specializing in TikTok. Your goal is to create a highly engaging, provocative, and clickable title for a TikTok video based on a Reddit post.
        
        **Constraints:**
        - The title MUST be in English.
        - The title MUST be 100 characters or less.
        - The title should be formatted in a way that sparks curiosity, like a classic "AITA" (Am I The A**hole) post title.
        - Do NOT use emojis.
        - Do NOT include hashtags.
        - Do NOT add quotation marks around the title.
        
        **Reddit Post Title:** "${postTitle}"
        
        **Reddit Post Body (excerpt):**
        "${postBody.substring(0, 500)}..."
        
        Now, generate the perfect viral TikTok title.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const text = response.text.trim();
        return text.replace(/^"|"$/g, '');
    } catch (error) {
        console.error("Error generating title with Gemini:", error);
        throw new Error("Konnte keinen Titel mit der AI generieren.");
    }
}


export async function generateVoiceover(text: string, voice: string): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API-Schlüssel für Gemini nicht konfiguriert.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const voiceMap: { [key: string]: string } = {
        'Alice (Calm)': 'Kore',
        'David (Energetic)': 'Puck',
        'Sarah (Storyteller)': 'Zephyr',
    };
    const selectedVoice = voiceMap[voice] || 'Kore';

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: selectedVoice },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating voiceover with Gemini:", error);
        throw new Error("Konnte kein Voiceover mit der AI generieren.");
    }
}