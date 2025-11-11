import { RedditPostData } from '../types';

const CORS_PROXY = 'https://corsproxy.io/?';

// Helper function to fetch author's profile picture
async function fetchAuthorProfilePic(author: string): Promise<string | undefined> {
    if (!author || author === '[deleted]') {
        return undefined;
    }
    try {
        const response = await fetch(`${CORS_PROXY}https://www.reddit.com/user/${author}/about.json`);
        if (!response.ok) {
            return undefined;
        }
        const data = await response.json();
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
    const jsonUrl = cleanedUrl.endsWith('/') ? `${cleanedUrl}.json` : `${cleanedUrl}/.json`;

    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(jsonUrl)}`);
        if (!response.ok) {
            throw new Error(`Post konnte nicht geladen werden (Status: ${response.status})`);
        }
        const data = await response.json();

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
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Fehler beim Laden der Reddit-Daten: ${error.message}`);
        }
        throw new Error('Ein unbekannter Fehler ist aufgetreten.');
    }
}