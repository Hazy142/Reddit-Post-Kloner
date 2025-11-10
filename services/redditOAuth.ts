// Reddit OAuth Token Management
// Für Script-Apps: Direkter Token-Abruf mit Client-ID und Secret

interface TokenCache {
    token: string;
    expiresAt: number;
}

let tokenCache: TokenCache | null = null;

const REDDIT_CLIENT_ID = typeof process !== 'undefined' && process.env.REDDIT_CLIENT_ID 
    ? process.env.REDDIT_CLIENT_ID 
    : 'K31ykUdjLyJ_m2ujQvLuTw';

const REDDIT_CLIENT_SECRET = typeof process !== 'undefined' && process.env.REDDIT_CLIENT_SECRET 
    ? process.env.REDDIT_CLIENT_SECRET 
    : 'ekdVGrgS7coi6SmkEajpD2lKLTzl2w';

// User-Agent für Reddit API (erforderlich)
const REDDIT_USER_AGENT = 'web:reddit-post-kloner:v1.0.0 (by /u/Ill_Comfortable8964)';

/**
 * Ruft einen OAuth Access Token von Reddit ab
 * Für Script-Apps verwenden wir "client_credentials" Grant Type
 */
export async function getRedditAccessToken(): Promise<string> {
    // Prüfe, ob wir einen gültigen Token im Cache haben
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
        return tokenCache.token;
    }

    try {
        // Base64-encode Client-ID:Secret für Basic Auth
        const credentials = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
        
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': REDDIT_USER_AGENT,
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Reddit OAuth Fehler: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.access_token) {
            throw new Error('Kein Access Token in der Antwort erhalten');
        }

        // Cache den Token (normalerweise 1 Stunde gültig, wir verwenden expires_in - 60 Sekunden Sicherheit)
        const expiresIn = (data.expires_in || 3600) * 1000; // Konvertiere zu Millisekunden
        tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + expiresIn - 60000, // 1 Minute vor Ablauf erneuern
        };

        console.log('Reddit OAuth Token erfolgreich abgerufen');
        return data.access_token;
    } catch (error) {
        console.error('Fehler beim Abrufen des Reddit OAuth Tokens:', error);
        throw error;
    }
}

/**
 * Setzt den Token-Cache zurück (für Tests oder bei Fehlern)
 */
export function clearTokenCache(): void {
    tokenCache = null;
}

