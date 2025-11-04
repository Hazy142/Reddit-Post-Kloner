import React, { useState, useCallback } from 'react';
import { RedditPostData } from './types';
import { fetchRedditPost } from './services/redditService';
import { generateTikTokTitle } from './services/geminiService';
import { UrlInputForm } from './components/UrlInputForm';
import { RedditPostCard } from './components/RedditPostCard';
import { LoadingSpinner, SparklesIcon } from './components/icons';
import { Confetti } from './components/Confetti';
import { ParticleBackground } from './components/ParticleBackground';
import { StreakCounter } from './components/StreakCounter';

const App: React.FC = () => {
    const [postData, setPostData] = useState<RedditPostData | null>(null);
    const [aiTitle, setAiTitle] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState<boolean>(false);
    const [successCount, setSuccessCount] = useState<number>(0);

    const handleFetchAndAnalyze = useCallback(async (url: string) => {
        setIsLoading(true);
        setError(null);
        setPostData(null);
        setAiTitle(null);

        try {
            // Fetch Reddit post data first
            const fetchedPostData = await fetchRedditPost(url);
            setPostData(fetchedPostData);

            // Then, generate AI title
            const generatedTitle = await generateTikTokTitle(fetchedPostData.title, fetchedPostData.selftext);
            setAiTitle(generatedTitle);
            setShowConfetti(true);
            setSuccessCount(prev => prev + 1);
            
            // Update streak
            const currentStreak = parseInt(localStorage.getItem('reddit-kloner-streak') || '0', 10);
            const newStreak = currentStreak + 1;
            localStorage.setItem('reddit-kloner-streak', newStreak.toString());
            window.dispatchEvent(new Event('streak-updated'));
            
            setTimeout(() => setShowConfetti(false), 3000);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Ein unbekannter Fehler ist aufgetreten.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const LoadingState: React.FC = () => (
        <div className="text-center p-10 bg-black/20 border-2 border-neon-cyan rounded-lg animate-pulse shadow-[0_0_30px_rgba(0,245,255,0.3)]">
            <div className="flex justify-center mb-4">
                <LoadingSpinner />
            </div>
            <p className="text-xl font-semibold text-neon-cyan animate-pulse">Analysiere Reddit Post...</p>
            <p className="text-zinc-400">Moment, das dauert nur kurz.</p>
            <div className="mt-4 flex justify-center gap-2">
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0s' }}>🚀</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>💫</span>
            </div>
        </div>
    );

    const ErrorState: React.FC<{ message: string }> = ({ message }) => (
        <div className="text-center p-10 bg-neon-pink/10 border-2 border-neon-pink rounded-lg">
            <p className="text-xl font-semibold text-neon-pink">Fehler</p>
            <p className="text-white mt-2">{message}</p>
        </div>
    );

    const WelcomeState: React.FC = () => (
         <div className="text-center p-10 border-2 border-dashed border-zinc-700 rounded-lg hover:border-neon-cyan transition-all duration-300 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <span className="text-3xl animate-bounce">🎯</span>
                Bereit zum Klonen & Analysieren!
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.3s' }}>🔥</span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
                Füge oben eine Reddit-URL ein, um den Post zu laden. Wir extrahieren die Daten und lassen die Gemini-KI einen viralen TikTok-Titel dafür erstellen.
            </p>
        </div>
    );


    return (
        <div className="min-h-screen bg-navy-black text-gray-200 font-sans p-4 sm:p-8 relative overflow-hidden">
            <ParticleBackground />
            <Confetti trigger={showConfetti} />
            <StreakCounter />
            <main className="max-w-7xl mx-auto relative z-10">
                <header className="text-center mb-8 animate-fade-in">
                    <h1 className="font-display uppercase text-5xl sm:text-7xl font-black tracking-tighter text-white mb-2 relative">
                        <span className="relative inline-block">
                            Reddit Post <span className="text-neon-pink animate-pulse">Kloner</span>
                            <span className="absolute -top-2 -right-2 text-neon-pink animate-bounce">✨</span>
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400">
                        Verwandle Reddit-Gold in virale TikTok-Titel mit der Power von Gemini AI.
                    </p>
                </header>

                <UrlInputForm onSubmit={handleFetchAndAnalyze} isLoading={isLoading} />

                <div className="mt-8">
                    {isLoading && <LoadingState />}
                    {error && <ErrorState message={error} />}
                    {!isLoading && !error && !postData && <WelcomeState />}
                    
                    {postData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
                            <div className="transform transition-all duration-500 hover:scale-105">
                                <h3 className="font-display text-3xl font-black text-center mb-4 text-neon-cyan uppercase tracking-wide animate-pulse">Original Post</h3>
                                <RedditPostCard post={postData} />
                            </div>
                            <div className="transform transition-all duration-500 hover:scale-105">
                                 <h3 className="font-display text-3xl font-black text-center mb-4 text-neon-pink uppercase tracking-wide flex items-center justify-center gap-2 animate-pulse">
                                    <SparklesIcon className="w-7 h-7 animate-spin" style={{ animationDuration: '3s' }} />
                                    <span>KI-generierter Titel</span>
                                </h3>
                                {aiTitle ? (
                                    <div className="animate-fade-in">
                                        <RedditPostCard post={postData} aiTitle={aiTitle} isAiCard={true} />
                                    </div>
                                ) : (
                                    <div className="bg-black/20 rounded-lg p-8 text-center flex items-center justify-center h-full border-2 border-neon-pink/50 animate-pulse shadow-[0_0_30px_rgba(255,0,110,0.3)]">
                                        <div className="flex flex-col items-center gap-4">
                                            <LoadingSpinner />
                                            <p className="text-neon-pink/80">Generiere AI-Titel...</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-xl animate-bounce" style={{ animationDelay: '0s' }}>✨</span>
                                                <span className="text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🚀</span>
                                                <span className="text-xl animate-bounce" style={{ animationDelay: '0.4s' }}>💫</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                 <footer className="text-center mt-12 text-zinc-500 text-sm">
                    <p>Powered by React, Tailwind CSS, Reddit API, and Google Gemini.</p>
                </footer>
            </main>
        </div>
    );
};

export default App;