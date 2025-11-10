import { RedditPostData } from '../types';
import { getRedditAccessToken } from './redditOAuth';

// Funktion zum Extrahieren der Post-ID aus einer Reddit-URL
function extractPostId(url: string): string | null {
    try {
        // Format: https://www.reddit.com/r/SUBREDDIT/comments/POST_ID/title/
        const match = url.match(/\/comments\/([a-z0-9]+)/i);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

// Funktion zum Konvertieren einer Reddit-URL zu einem lokalen Proxy-Pfad
function convertToLocalProxy(url: string, _useOldReddit: boolean = true): string {
    try {
        const urlObj = new URL(url);
        // Entferne das Protokoll und die Domain, behalte den Pfad
        const path = urlObj.pathname + urlObj.search;
        // Verwende den Vite-Proxy, der an Express-Server weiterleitet (mit OAuth)
        return `/api/reddit${path}`;
    } catch (error) {
        // Falls URL-Parsing fehlschlägt, versuche einfache String-Manipulation
        const match = url.match(/https?:\/\/[^/]+(\/.*)/);
        if (match) {
            return `/api/reddit${match[1]}`;
        }
        throw new Error(`Ungültige URL: ${url}`);
    }
}

// Alternative: Versuche über redditjson.com (öffentlicher Service)
async function fetchViaRedditJson(postId: string): Promise<unknown> {
    try {
        const url = `https://www.reddit.com/comments/${postId}.json?raw_json=1`;
        const response = await fetch(`https://redditjson.com/api/post/${postId}`);
        
        if (!response.ok) {
            throw new Error(`RedditJSON Service: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('RedditJSON Service failed:', error);
        throw error;
    }
}

async function fetchWithLocalProxy(url: string, useOldReddit: boolean = true): Promise<unknown> {
    try {
        // Versuche zuerst direkten Browser-Zugriff (kein Proxy) - Reddit blockiert Server-Anfragen
        // Browser-Anfragen werden normalerweise nicht blockiert
        console.log(`Fetching directly from browser: ${url}`);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors', // CORS-Modus für Cross-Origin-Anfragen
                cache: 'no-cache',
            });
            
            console.log(`Response status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const text = await response.text();
                const trimmedText = text.trim();
                
                if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
                    return JSON.parse(trimmedText);
                } else {
                    throw new Error(`Unerwartetes Antwortformat: ${trimmedText.substring(0, 100)}...`);
                }
            } else {
                // CORS-Fehler oder Blockierung - versuche Proxy als Fallback
                throw new Error(`Direct fetch failed: ${response.status}`);
            }
        } catch (directError) {
            // Direkter Zugriff fehlgeschlagen (wahrscheinlich CORS) - verwende Proxy
            console.warn('Direkter Browser-Zugriff fehlgeschlagen, verwende Proxy:', directError);
            const proxyUrl = convertToLocalProxy(url, useOldReddit);
            const fullProxyUrl = typeof window !== 'undefined' 
                ? `${window.location.origin}${proxyUrl}`
                : proxyUrl;
            
            console.log(`Fetching from proxy: ${fullProxyUrl}`);
            
            const proxyResponse = await fetch(fullProxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-cache',
            });
            
            console.log(`Proxy response status: ${proxyResponse.status} ${proxyResponse.statusText}`);
            
            if (!proxyResponse.ok) {
                const errorText = await proxyResponse.text();
                console.error(`Proxy error response body: ${errorText.substring(0, 500)}`);
                throw new Error(`HTTP ${proxyResponse.status}: ${proxyResponse.statusText}. Response: ${errorText.substring(0, 200)}`);
            }
            
            const text = await proxyResponse.text();
            const trimmedText = text.trim();
            
            console.log(`Response preview: ${trimmedText.substring(0, 100)}...`);
            
            if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
                try {
                    return JSON.parse(trimmedText);
                } catch (parseError) {
                    throw new Error(`Ungültiges JSON erhalten: ${trimmedText.substring(0, 100)}...`);
                }
            } else if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html')) {
                throw new Error(`Reddit blockiert die Anfrage (HTML-Antwort erhalten)`);
            } else {
                throw new Error(`Unerwartetes Antwortformat. Erwartet JSON, erhalten: ${trimmedText.substring(0, 100)}...`);
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Fetch error: ${error.message}`);
            throw error;
        }
        throw new Error('Unbekannter Fehler beim Abrufen der Daten');
    }
}

function appendRawJsonParam(url: string): string {
    const hasQuery = url.includes('?');
    const separator = hasQuery ? '&' : '?';
    return `${url}${separator}raw_json=1`;
}

// Helper function to fetch author's profile picture
async function fetchAuthorProfilePic(author: string): Promise<string | undefined> {
    if (!author || author === '[deleted]') {
        return undefined;
    }
    try {
        // Verwende api.reddit.com für OAuth
        const aboutUrl = appendRawJsonParam(`https://api.reddit.com/user/${author}/about.json`);
        const data = await fetchWithLocalProxy(aboutUrl, true) as any;
        const profilePicUrl = data?.data?.snoovatar_img || data?.data?.icon_img;
        // Clean URL by removing query parameters
        return profilePicUrl ? profilePicUrl.split('?')[0] : undefined;
    } catch (error) {
        console.error(`Failed to fetch profile picture for ${author}:`, error);
        return undefined;
    }
}

// Main function to fetch and process Reddit post data
export async function fetchRedditPost(url: string): Promise<RedditPostData> {
    if (!url.trim()) {
        throw new Error('URL darf nicht leer sein.');
    }

    const cleanedUrl = url.split('?')[0].split('#')[0];
    const postId = extractPostId(cleanedUrl);
    
    // Konvertiere zu api.reddit.com Format (für OAuth)
    // api.reddit.com verwendet das gleiche Format wie www.reddit.com
    let apiPath = '';
    try {
        const urlObj = new URL(cleanedUrl);
        apiPath = urlObj.pathname;
        // Stelle sicher, dass .json am Ende steht
        if (!apiPath.endsWith('.json')) {
            apiPath = apiPath.endsWith('/') ? `${apiPath}.json` : `${apiPath}/.json`;
        }
    } catch {
        // Fallback: String-Manipulation
        const match = cleanedUrl.match(/https?:\/\/[^/]+(\/r\/[^?]+)/);
        if (match) {
            apiPath = match[1].endsWith('/') ? `${match[1]}.json` : `${match[1]}/.json`;
        } else {
            throw new Error('Ungültige Reddit-URL');
        }
    }
    
    const jsonUrl = appendRawJsonParam(`https://api.reddit.com${apiPath}`);
    
    let lastError: Error | null = null;
    
    // Versuche api.reddit.com über den lokalen Proxy (mit OAuth)
    try {
        const data = await fetchWithLocalProxy(jsonUrl, true);

        if (!Array.isArray(data) || data.length < 1 || !data[0]?.data?.children?.[0]?.data) {
            throw new Error('Unerwartetes Datenformat von Reddit erhalten.');
        }

        const postData = data[0].data.children[0].data;
        
        const authorProfilePic = await fetchAuthorProfilePic(postData.author);

        // Erfolg - gib die Daten zurück
        return {
            id: postData.id,
            title: postData.title,
            selftext: postData.selftext,
            author: postData.author,
            subreddit: postData.subreddit,
            score: postData.score,
            num_comments: postData.num_comments,
            created_utc: postData.created_utc,
            permalink: postData.permalink,
            subreddit_name_prefixed: postData.subreddit_name_prefixed,
            authorProfilePic: authorProfilePic,
            link_flair_text: postData.link_flair_text,
            total_awards_received: postData.total_awards_received,
            all_awardings: Array.isArray(postData.all_awardings) ? postData.all_awardings : [],
            upvote_ratio: postData.upvote_ratio ?? 0,
            gilded: postData.gilded ?? 0,
        };
    } catch (error) {
        // Falls old.reddit.com fehlschlägt, versuche www.reddit.com
        if (error instanceof Error) {
            lastError = error;
            console.warn(`Fehler beim Abrufen von api.reddit.com, versuche old.reddit.com:`, error.message);
        } else {
            lastError = new Error('Unbekannter Fehler');
        }
        
        // Fallback: Versuche www.reddit.com
        try {
            const wwwRedditUrl = cleanedUrl.replace(/https?:\/\/(www\.)?reddit\.com/, 'https://www.reddit.com');
            const wwwBaseJsonUrl = wwwRedditUrl.endsWith('/') ? `${wwwRedditUrl}.json` : `${wwwRedditUrl}/.json`;
            const wwwJsonUrl = appendRawJsonParam(wwwBaseJsonUrl);
            
            const data = await fetchWithLocalProxy(wwwJsonUrl, false);
            
            if (!Array.isArray(data) || data.length < 1 || !data[0]?.data?.children?.[0]?.data) {
                throw new Error('Unerwartetes Datenformat von Reddit erhalten.');
            }

            const postData = data[0].data.children[0].data;
            
            const authorProfilePic = await fetchAuthorProfilePic(postData.author);

            return {
                id: postData.id,
                title: postData.title,
                selftext: postData.selftext,
                author: postData.author,
                subreddit: postData.subreddit,
                score: postData.score,
                num_comments: postData.num_comments,
                created_utc: postData.created_utc,
                permalink: postData.permalink,
                subreddit_name_prefixed: postData.subreddit_name_prefixed,
                authorProfilePic: authorProfilePic,
                link_flair_text: postData.link_flair_text,
                total_awards_received: postData.total_awards_received,
                all_awardings: Array.isArray(postData.all_awardings) ? postData.all_awardings : [],
                upvote_ratio: postData.upvote_ratio ?? 0,
                gilded: postData.gilded ?? 0,
            };
        } catch (fallbackError) {
            // Beide direkten Versuche fehlgeschlagen
            // Fallback: Versuche über alternativen Service (falls Post-ID verfügbar)
            if (postId) {
                try {
                    console.warn('Direkte Reddit-Anfragen blockiert, versuche alternativen Service...');
                    const data = await fetchViaRedditJson(postId);
                    
                    // RedditJSON gibt möglicherweise ein anderes Format zurück
                    // Versuche, die Daten zu parsen
                    if (data && typeof data === 'object') {
                        // Hier müssten wir das Format von redditjson.com anpassen
                        // Für jetzt: Fehler werfen, da wir das Format nicht kennen
                        throw new Error('Alternativer Service gibt unerwartetes Format zurück');
                    }
                } catch (altError) {
                    // Alle Methoden fehlgeschlagen
                    if (lastError) {
                        throw new Error(
                            `Fehler beim Laden der Reddit-Daten: ${lastError.message}. ` +
                            `Reddit blockiert Server-Anfragen. Bitte verwenden Sie Reddit OAuth oder einen eigenen Proxy-Server.`
                        );
                    }
                    throw new Error('Ein unbekannter Fehler ist aufgetreten.');
                }
            }
            
            // Keine Post-ID verfügbar oder alternativer Service fehlgeschlagen
            if (lastError) {
                throw new Error(
                    `Fehler beim Laden der Reddit-Daten: ${lastError.message}. ` +
                    `Reddit blockiert Server-Anfragen. Bitte verwenden Sie Reddit OAuth oder einen eigenen Proxy-Server.`
                );
            }
            throw new Error('Ein unbekannter Fehler ist aufgetreten.');
        }
    }
}