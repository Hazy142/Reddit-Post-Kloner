import React, { useMemo, useState } from 'react';
import { RedditPostData } from '../types';
import { UpvoteIcon, CommentIcon, ShareIcon, SparklesIcon, ThumbsUpIcon, EyeIcon, EyeSlashIcon, AwardIcon } from './icons';

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
    const accentRing = isAiCard
        ? 'ring-neon-pink/60 shadow-[0_8px_16px_-8px_rgba(255,0,110,0.7)]'
        : 'ring-neon-cyan/60 shadow-[0_8px_16px_-8px_rgba(0,245,255,0.6)]';

    if (post.authorProfilePic) {
        return (
            <div className={`relative inline-flex items-center justify-center rounded-full bg-black/40 p-0.5 ring-2 ring-offset-1 ring-offset-black/60 ${accentRing}`}>
                <img
                    src={post.authorProfilePic}
                    alt={post.author}
                    className="h-10 w-10 rounded-full object-cover"
                />
                <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-black/70 opacity-40"></span>
            </div>
        );
    }

    const initial = post.author ? post.author.charAt(0).toUpperCase() : '?';

    return (
        <div className={`relative inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 font-display text-xl text-white ring-2 ring-offset-1 ring-offset-black/60 ${accentRing}`}>
            {initial}
            <span className="pointer-events-none absolute inset-0 rounded-full bg-white/10 mix-blend-screen opacity-40"></span>
        </div>
    );
};

const STAT_VARIANTS = {
    green: {
        icon: 'text-neon-green',
        glow: 'bg-neon-green/25'
    },
    cyan: {
        icon: 'text-neon-cyan',
        glow: 'bg-neon-cyan/25'
    },
    pink: {
        icon: 'text-neon-pink',
        glow: 'bg-neon-pink/25'
    },
    orange: {
        icon: 'text-orange-400',
        glow: 'bg-orange-400/25'
    }
} as const;

type StatVariant = keyof typeof STAT_VARIANTS;

const StatBox: React.FC<{ icon: React.ReactNode, value: string, label: string, variant: StatVariant }> = ({ icon, value, label, variant }) => {
    const styles = STAT_VARIANTS[variant];

    return (
        <div className="group/stat relative flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-all duration-200 ease-out hover:border-white/30 hover:bg-white/10">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <p className="font-display text-xl font-bold leading-none text-white">{value}</p>
                <p className="text-[0.65rem] uppercase tracking-wider text-white/50">{label}</p>
            </div>
        </div>
    );
};


export const RedditPostCard: React.FC<RedditPostCardProps> = ({ post, aiTitle, isAiCard = false }) => {
    const [isBodyVisible, setIsBodyVisible] = useState(isAiCard);

    const stats = useMemo(() => {
        const baseStats = [
            {
                icon: <UpvoteIcon className="h-5 w-5" />,
                value: formatNumber(post.score),
                label: 'Upvotes',
                variant: 'green' as StatVariant
            },
            {
                icon: <CommentIcon className="h-5 w-5" />,
                value: formatNumber(post.num_comments),
                label: 'Kommentare',
                variant: 'cyan' as StatVariant
            },
            {
                icon: <ThumbsUpIcon className="h-5 w-5" />,
                value: `${Math.round(post.upvote_ratio * 100)}%`,
                label: 'Upvote-Rate',
                variant: 'pink' as StatVariant
            }
        ];

        if ((post.total_awards_received ?? 0) > 0) {
            baseStats.push({
                icon: <AwardIcon className="h-5 w-5" />,
                value: formatNumber(post.total_awards_received ?? 0),
                label: 'Awards',
                variant: 'orange' as StatVariant
            });
        }

        return baseStats;
    }, [post.score, post.num_comments, post.upvote_ratio, post.total_awards_received]);

    const statsGridCols = stats.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

    const cardAccent = isAiCard
        ? 'border-neon-pink/40 shadow-[0_18px_55px_-28px_rgba(255,0,110,0.9)]'
        : 'border-neon-cyan/30 shadow-[0_18px_55px_-28px_rgba(0,245,255,0.7)]';

    return (
        <article className={`group relative isolate overflow-hidden rounded-2xl border ${cardAccent} bg-gradient-to-br from-white/10 via-[#0f162d]/90 to-black/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.9)]`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_50%)]"></div>
            <div className={`pointer-events-none absolute -top-20 right-[-30px] h-48 w-48 rounded-full blur-3xl opacity-50 ${isAiCard ? 'bg-neon-pink/25' : 'bg-neon-cyan/20'}`}></div>
            <div className={`pointer-events-none absolute -bottom-20 left-[-40px] h-52 w-52 rounded-full blur-3xl opacity-40 ${isAiCard ? 'bg-neon-cyan/20' : 'bg-neon-green/20'}`}></div>

            <div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6">
                <header className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <AuthorAvatar post={post} isAiCard={isAiCard} />
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-white/70">
                                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-white/80">
                                    {post.subreddit_name_prefixed}
                                </span>
                                {isAiCard && (
                                    <span className="flex items-center gap-1 rounded-md border border-neon-pink/50 bg-neon-pink/15 px-2 py-0.5 text-neon-pink">
                                        <SparklesIcon className="h-3 w-3" /> AI
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-300/80">
                                u/{post.author} · {formatTimeAgo(post.created_utc)}
                            </p>
                        </div>
                    </div>
                    {post.link_flair_text && (
                        <span className="rounded-md border border-neon-pink/40 bg-neon-pink/10 px-2 py-1 text-[0.65rem] text-neon-pink">
                            {post.link_flair_text}
                        </span>
                    )}
                </header>

                <div className="space-y-4">
                    <h2 className={`font-display text-2xl font-black leading-snug sm:text-3xl lg:text-4xl ${isAiCard ? 'bg-gradient-to-r from-white via-neon-pink to-neon-cyan bg-clip-text text-transparent drop-shadow-[0_8px_12px_rgba(255,0,110,0.3)]' : 'text-white drop-shadow-[0_8px_12px_rgba(0,0,0,0.4)]'}`}>
                        {isAiCard && aiTitle ? aiTitle : post.title}
                    </h2>

                    <div className={`grid grid-cols-2 gap-2.5 ${statsGridCols}`}>
                        {stats.map((stat, index) => (
                            <StatBox key={`${stat.label}-${index}`} icon={stat.icon} value={stat.value} label={stat.label} variant={stat.variant} />
                        ))}
                    </div>

                    {isBodyVisible && post.selftext && (
                        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-200 shadow-[0_8px_20px_-15px_rgba(0,0,0,0.9)] transition-all duration-300">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            <p className="whitespace-pre-wrap leading-relaxed">{post.selftext}</p>
                        </div>
                    )}
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-wider text-white/50">
                        {(post.total_awards_received ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                                <AwardIcon className="h-3.5 w-3.5 text-orange-400" />
                                {formatNumber(post.total_awards_received ?? 0)}
                            </span>
                        )}
                        {post.gilded > 0 && (
                            <span>Gilded ×{post.gilded}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {post.selftext && (
                            <button
                                onClick={() => setIsBodyVisible(!isBodyVisible)}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white"
                                title={isBodyVisible ? 'Inhalt ausblenden' : 'Inhalt anzeigen'}
                                aria-label={isBodyVisible ? 'Inhalt ausblenden' : 'Inhalt anzeigen'}
                            >
                                {isBodyVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                <span className="hidden sm:inline">{isBodyVisible ? 'Hide' : 'Read'}</span>
                            </button>
                        )}
                        <a
                            href={`https://reddit.com${post.permalink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white"
                            title="View on Reddit"
                        >
                            <ShareIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Share</span>
                        </a>
                    </div>
                </footer>
            </div>
        </article>
    );
};