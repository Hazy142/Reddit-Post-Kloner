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
        ? 'ring-neon-pink/70 shadow-[0_18px_38px_-20px_rgba(255,0,110,0.85)]'
        : 'ring-neon-cyan/70 shadow-[0_18px_38px_-20px_rgba(0,245,255,0.75)]';

    if (post.authorProfilePic) {
        return (
            <div className={`relative inline-flex items-center justify-center rounded-full bg-black/40 p-1 ring-2 ring-offset-2 ring-offset-black/60 ${accentRing}`}>
                <img
                    src={post.authorProfilePic}
                    alt={post.author}
                    className="h-14 w-14 rounded-full object-cover"
                />
                <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-black/70 opacity-40"></span>
            </div>
        );
    }

    const initial = post.author ? post.author.charAt(0).toUpperCase() : '?';

    return (
        <div className={`relative inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 font-display text-3xl text-white ring-2 ring-offset-2 ring-offset-black/60 ${accentRing}`}>
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
        <div className="group/stat relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-white/30 hover:bg-white/10">
            <span className={`pointer-events-none absolute -inset-8 opacity-0 blur-3xl transition-opacity duration-500 group-hover/stat:opacity-80 ${styles.glow}`}></span>
            <div className="flex items-center gap-3">
                <div className={`relative flex h-11 w-11 items-center justify-center rounded-2xl bg-black/60 ${styles.icon}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
                    <p className="font-display text-3xl font-black leading-none text-white sm:text-4xl">{value}</p>
                </div>
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
        <article className={`group relative isolate overflow-hidden rounded-3xl border ${cardAccent} bg-gradient-to-br from-white/10 via-[#0f162d]/80 to-black/80 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]"></div>
            <div className={`pointer-events-none absolute -top-28 right-[-40px] h-64 w-64 rounded-full blur-3xl opacity-70 ${isAiCard ? 'bg-neon-pink/35' : 'bg-neon-cyan/30'}`}></div>
            <div className={`pointer-events-none absolute -bottom-36 left-[-60px] h-72 w-72 rounded-full blur-3xl opacity-60 ${isAiCard ? 'bg-neon-cyan/25' : 'bg-neon-green/25'}`}></div>

            <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <AuthorAvatar post={post} isAiCard={isAiCard} />
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-white/70">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                                    {post.subreddit_name_prefixed}
                                </span>
                                {post.link_flair_text && (
                                    <span className="rounded-full border border-neon-pink/40 bg-neon-pink/20 px-3 py-1 text-neon-pink">
                                        {post.link_flair_text}
                                    </span>
                                )}
                                {isAiCard && (
                                    <span className="flex items-center gap-1 rounded-full border border-neon-pink/50 bg-neon-pink/15 px-3 py-1 text-neon-pink">
                                        <SparklesIcon className="h-4 w-4" /> KI Remix
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-zinc-300/90">
                                u/{post.author} · {formatTimeAgo(post.created_utc)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start text-xs uppercase tracking-[0.4em] text-white/50 sm:self-end">
                        <span className={`h-2 w-2 rounded-full ${isAiCard ? 'bg-neon-pink animate-pulse' : 'bg-neon-cyan animate-ping'}`}></span>
                        <span>{isAiCard ? 'AI-Fokus' : 'Original'}</span>
                    </div>
                </header>

                <div className="space-y-5">
                    <h2 className={`font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl ${isAiCard ? 'bg-gradient-to-r from-white via-neon-pink to-neon-cyan bg-clip-text text-transparent drop-shadow-[0_12px_18px_rgba(255,0,110,0.35)]' : 'text-white drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]'}`}>
                        {isAiCard && aiTitle ? aiTitle : post.title}
                    </h2>

                    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${statsGridCols}`}>
                        {stats.map((stat, index) => (
                            <StatBox key={`${stat.label}-${index}`} icon={stat.icon} value={stat.value} label={stat.label} variant={stat.variant} />
                        ))}
                    </div>

                    {isBodyVisible && post.selftext && (
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5 text-base text-zinc-200 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.9)] transition-all duration-500">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                            <p className="whitespace-pre-wrap leading-relaxed">{post.selftext}</p>
                        </div>
                    )}
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/55">
                        <span className="flex items-center gap-2">
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isAiCard ? 'bg-neon-pink' : 'bg-neon-cyan'}`}></span>
                            {post.gilded > 0 ? `Gilded ×${post.gilded}` : 'Signalstark'}
                        </span>
                        {(post.total_awards_received ?? 0) > 0 && (
                            <span>Awards: {formatNumber(post.total_awards_received ?? 0)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {post.selftext && (
                            <button
                                onClick={() => setIsBodyVisible(!isBodyVisible)}
                                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition-colors duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white"
                                title={isBodyVisible ? 'Inhalt ausblenden' : 'Inhalt anzeigen'}
                                aria-label={isBodyVisible ? 'Inhalt ausblenden' : 'Inhalt anzeigen'}
                            >
                                {isBodyVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                <span className="hidden sm:inline">{isBodyVisible ? 'Verbergen' : 'Lesen'}</span>
                            </button>
                        )}
                        <a
                            href={`https://reddit.com${post.permalink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition-colors duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white"
                            title="Auf Reddit teilen"
                        >
                            <ShareIcon className="h-5 w-5" />
                            <span className="hidden sm:inline">Teilen</span>
                        </a>
                    </div>
                </footer>
            </div>
        </article>
    );
};