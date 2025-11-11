export async function generateTikTokTitle(postTitle: string, postBody: string): Promise<string> {
    const prompt = `
        Create a viral TikTok title for a Reddit post. 
        
        STRICT RULES:
        - Output ONLY the title text, nothing else
        - Maximum 100 characters
        - No emojis, no hashtags, no quotation marks
        - No explanations, no sources, no additional text
        - Format like AITA posts to spark curiosity
        
        Reddit Post: "${postTitle}"
        Content: "${postBody.substring(0, 500)}..."
        
        Output only the title:
    `;

    // Request body configuration
    const requestBody = {
        model: "sonar",  // Use standard sonar model (sonar-pro for higher quality)
        messages: [
            {
                role: "system",
                content: "You are a viral social media expert specializing in TikTok content."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 150,
        temperature: 0.7,
        top_p: 0.9
    };

    try {
        console.log('[Perplexity] Sending request to API...');
        console.log('[Perplexity] Request body:', JSON.stringify(requestBody, null, 2));
        
        // Use local proxy to avoid CORS issues
        const response = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('[Perplexity] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Perplexity API Error:", response.status, errorText);
            throw new Error(`Perplexity API Fehler: ${response.status}`);
        }

        const data = await response.json();
        console.log('[Perplexity] Response data:', data);
        
        // Validate response structure
        if (!data.choices || data.choices.length === 0) {
            throw new Error("Perplexity API hat keine Antwort generiert.");
        }
        
        let generatedTitle = data.choices[0].message.content.trim();
        
        if (!generatedTitle) {
            throw new Error("Keine Antwort vom Perplexity-Modell erhalten.");
        }
        
        // Clean up the response:
        // 1. Remove surrounding quotes
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
        
        // 2. Take only the first line (in case there are multiple lines)
        generatedTitle = generatedTitle.split('\n')[0];
        
        // 3. Remove everything after "This title" or similar explanatory phrases
        const explanationPatterns = [
            /\s+This title.*/i,
            /\s+The title.*/i,
            /\s+It's.*/i,
            /\s+\[.*\].*$/,  // Remove source references like [1][6]
            /\s+Sources?:.*/i
        ];
        
        for (const pattern of explanationPatterns) {
            generatedTitle = generatedTitle.replace(pattern, '');
        }
        
        // 4. Trim again after cleanup
        generatedTitle = generatedTitle.trim();
        
        // 5. Enforce 100 character limit
        if (generatedTitle.length > 100) {
            generatedTitle = generatedTitle.substring(0, 100).trim();
        }
        
        console.log('[Perplexity] Final cleaned title:', generatedTitle);
        
        return generatedTitle;
    } catch (error) {
        console.error("Error generating title with Perplexity:", error);
        throw new Error("Konnte keinen Titel mit der AI generieren.");
    }
}

