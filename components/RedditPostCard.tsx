import React, { useState } from 'react';
import { RedditPostData } from '../types';
import { UpvoteIcon, CommentIcon, ShareIcon, SparklesIcon, ThumbsUpIcon, EyeIcon, EyeSlashIcon } from './icons';

interface RedditPostCardProps {
    post: RedditPostData;
    aiTitle?: string | null;
    isAiCard?: boolean;
}

const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
};

const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
    return `${Math.floor(diff / 31536000)}y`;
};

const AuthorAvatar: React.FC<{ post: RedditPostData, isAiCard: boolean }> = ({ post, isAiCard }) => {
    const borderColor = isAiCard ? 'border-neon-pink' : 'border-neon-cyan';
    if (post.authorProfilePic) {
        return <img src={post.authorProfilePic} alt={post.author} className={`w-16 h-16 rounded-full border-4 ${borderColor} object-cover shadow-lg`} />;
    }
    const initial = post.author ? post.author.charAt(0).toUpperCase() : '?';
    return (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
            {initial}
        </div>
    );
};


const StatBox: React.FC<{ icon: React.ReactNode, value: string, label: string, colorClass: string }> = ({ icon, value, label, colorClass }) => (
    <div className={`flex-1 p-3 bg-black/20 rounded-lg border-2 ${colorClass}/50 text-center shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
        <div className={`mx-auto h-8 w-8 ${colorClass} flex items-center justify-center`}>
            {icon}
        </div>
        <p className={`font-display font-black text-4xl mt-2 text-white`}>{value}</p>
        <p className="text-xs uppercase text-zinc-400 tracking-wider">{label}</p>
    </div>
);


export const RedditPostCard: React.FC<RedditPostCardProps> = ({ post, aiTitle, isAiCard = false }) => {
    const [isBodyVisible, setIsBodyVisible] = useState(isAiCard);

    const cardBorderClass = isAiCard 
        ? 'border-neon-pink shadow-[0_0_25px_-5px_rgba(255,0,110,0.7)]' 
        : 'border-neon-cyan shadow-[0_0_25px_-5px_rgba(0,245,255,0.7)]';

    return (
        <div className={`bg-black/20 border-2 ${cardBorderClass} rounded-lg overflow-hidden max-w-2xl mx-auto transition-all duration-300`}>
            <div className="p-4 flex items-center gap-4 bg-black/20">
                <AuthorAvatar post={post} isAiCard={isAiCard} />
                <div className="overflow-hidden">
                    <p className={`font-bold text-lg ${isAiCard ? 'text-neon-pink' : 'text-neon-cyan'}`}>
                        {post.subreddit_name_prefixed}
                    </p>
                    <p className="text-sm text-zinc-400 truncate">
                        u/{post.author} · {formatTimeAgo(post.created_utc)}
                    </p>
                </div>
            </div>
            
            <div className="p-6">
                <h2 className={`font-display uppercase font-black text-4xl lg:text-5xl my-4 leading-none ${isAiCard ? 'text-neon-pink' : 'text-white'}`}>
                    {isAiCard && aiTitle ? aiTitle : post.title}
                </h2>

                <div className="flex items-center gap-2 my-6">
                    <StatBox 
                        icon={<UpvoteIcon className="w-6 h-6"/>} 
                        value={formatNumber(post.score)} 
                        label="Upvotes"
                        colorClass="text-neon-green"
                    />
                    <StatBox 
                        icon={<CommentIcon className="w-6 h-6"/>} 
                        value={formatNumber(post.num_comments)} 
                        label="Comments"
                        colorClass="text-neon-cyan"
                    />
                     <StatBox 
                        icon={<ThumbsUpIcon className="w-6 h-6"/>} 
                        value={`${Math.round(post.upvote_ratio * 100)}%`}
                        label="Upvoted"
                        colorClass="text-neon-pink"
                    />
                </div>
                
                {isBodyVisible && post.selftext && (
                    <div className="my-6 text-zinc-300 whitespace-pre-wrap animate-fade-in text-base bg-black/20 p-4 rounded-md border border-zinc-700">
                        {post.selftext}
                    </div>
                )}
            </div>

            <div className="px-4 py-2 border-t-2 border-zinc-800 flex items-center justify-end text-zinc-400">
                <div className="flex items-center gap-2">
                    {post.selftext && (
                        <button
                            onClick={() => setIsBodyVisible(!isBodyVisible)}
                            className="p-2 rounded-full hover:bg-zinc-700 hover:text-white transition-colors"
                            title={isBodyVisible ? 'Inhalt ausblenden' : 'Inhalt anzeigen'}
                            aria-label={isBodyVisible ? 'Inhalt ausblenden' : 'Inhalt anzeigen'}
                        >
                            {isBodyVisible ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                        </button>
                    )}
                     <a href={`https://reddit.com${post.permalink}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-zinc-700 hover:text-white transition-colors" title="Auf Reddit teilen">
                       <ShareIcon className="w-6 h-6" />
                    </a>
                </div>
            </div>
        </div>
    );
};