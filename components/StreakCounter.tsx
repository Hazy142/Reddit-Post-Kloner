import React, { useEffect, useState } from 'react';
import { SparklesIcon } from './icons';

export const StreakCounter: React.FC = () => {
    const [streak, setStreak] = useState(() => {
        const saved = localStorage.getItem('reddit-kloner-streak');
        return saved ? parseInt(saved, 10) : 0;
    });

    useEffect(() => {
        const saved = localStorage.getItem('reddit-kloner-streak');
        const currentStreak = saved ? parseInt(saved, 10) : 0;
        if (currentStreak > 0) {
            setStreak(currentStreak);
        }
    }, []);

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('reddit-kloner-streak');
            if (saved) {
                setStreak(parseInt(saved, 10));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        // Also listen for custom events
        window.addEventListener('streak-updated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('streak-updated', handleStorageChange);
        };
    }, []);

    if (streak === 0) return null;

    return (
        <div className="fixed top-4 right-4 bg-black/40 border-2 border-neon-pink rounded-lg px-4 py-2 shadow-[0_0_15px_rgba(255,0,110,0.5)] backdrop-blur-sm z-40 animate-fade-in">
            <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-neon-pink animate-pulse" />
                <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider">Streak</p>
                    <p className="text-xl font-black text-neon-pink">{streak}</p>
                </div>
            </div>
        </div>
    );
};
