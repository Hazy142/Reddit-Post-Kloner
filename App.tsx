import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RedditPostData } from './types';
import { fetchRedditPost } from './services/redditService';
import { generateTikTokTitle, generateVoiceover } from './services/geminiService';
import { UrlInputForm } from './components/UrlInputForm';
import { RedditPostCard } from './components/RedditPostCard';
// FIX: Imported missing `CommentIcon` and `UpvoteIcon` components.
import { LoadingSpinner, SparklesIcon, UploadIcon, MusicNoteIcon, CogIcon, VideoCameraIcon, PlayIcon, HeartIcon, CommentBubbleIcon, ShareArrowIcon, CommentIcon, UpvoteIcon } from './components/icons';

// --- Helper functions for WAV file creation ---
const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const createWavBlob = (pcmData: Uint8Array): Blob => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // Audio format 1 is PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    return new Blob([view, pcmData], { type: 'audio/wav' });
};


// --- Inlined component: AnimatedSubtitles ---
const AnimatedSubtitles: React.FC<{ text: string, duration: number, isPlaying: boolean }> = ({ text, duration, isPlaying }) => {
    const words = text.split(/\s+/);
    const wordCount = words.length;
    const timePerWord = duration / wordCount;
    const [visibleWords, setVisibleWords] = useState(0);

    useEffect(() => {
        let interval: number;
        if (isPlaying) {
            setVisibleWords(0);
            interval = window.setInterval(() => {
                setVisibleWords(prev => {
                    if (prev >= wordCount) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 1;
                });
            }, timePerWord * 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
            if (!isPlaying) setVisibleWords(0);
        };
    }, [isPlaying, timePerWord, wordCount]);

    if (!isPlaying) return null;

    return (
        <div className="absolute inset-x-0 bottom-[20%] z-20 flex items-center justify-center p-4">
            <p className="font-display uppercase text-3xl sm:text-4xl text-white font-black text-center text-stroke leading-tight">
                {words.slice(0, visibleWords).join(' ')}
            </p>
        </div>
    );
};


// --- Inlined component: TikTokPostOverlay ---
const TikTokPostOverlay: React.FC<{ post: RedditPostData; aiTitle: string; selectedPostView: 'original' | 'ai' }> = ({ post, aiTitle, selectedPostView }) => {
    const titleToShow = selectedPostView === 'ai' ? aiTitle : post.title;
    
    return (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 p-8 flex justify-center">
            <div className="bg-white/95 backdrop-blur-sm text-zinc-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-2">
                     {post.authorProfilePic ? 
                        <img src={post.authorProfilePic} alt={post.author} className="w-10 h-10 rounded-full object-cover"/> :
                        <div className="w-10 h-10 rounded-full bg-red-500"></div>
                    }
                    <div>
                        <p className="font-bold text-sm">r/{post.subreddit}</p>
                        <p className="text-xs text-zinc-600">u/{post.author}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-1 my-2">
                    {post.all_awardings.slice(0, 5).map(award => (
                        <img key={award.id} src={award.icon_url} alt={award.name} className="w-4 h-4" title={award.name} />
                    ))}
                    {post.all_awardings.length > 5 && <span className="text-xs text-zinc-500">+{post.all_awardings.length - 5}</span>}
                </div>
                <p className="font-semibold my-2 text-base leading-tight">
                    {titleToShow}
                </p>
                <div className="flex justify-between items-center text-zinc-600 mt-2">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1"><CommentIcon className="w-5 h-5" /> 99+</span>
                        <span className="flex items-center gap-1"><UpvoteIcon className="w-5 h-5" /> 99+</span>
                    </div>
                     <button className="font-bold text-sm">Share</button>
                </div>
            </div>
        </div>
    );
}

// --- Inlined component: VideoPreview ---
interface VideoPreviewProps {
    post: RedditPostData;
    aiTitle: string;
    backgroundVideo: File | null;
    backgroundMusic: File | null;
    visualTheme: string;
    aspectRatio: string;
    voiceover: { url: string; text: string, duration: number } | null;
    selectedPostView: 'original' | 'ai';
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ post, aiTitle, backgroundVideo, backgroundMusic, visualTheme, aspectRatio, voiceover, selectedPostView }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);
    const voiceoverRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoSrc, setVideoSrc] = useState('');
    
    useEffect(() => {
        let objectUrl: string | undefined;
        if (backgroundVideo) {
            objectUrl = URL.createObjectURL(backgroundVideo);
            setVideoSrc(objectUrl);
        } else {
            const placeholderVideos: { [key: string]: string } = {
                'Subway Surfer Gameplay': 'https://assets.codepen.io/6093409/subway-surfers.mp4',
                'Minecraft Parkour': 'https://assets.codepen.io/6093409/minecraft-parkour.mp4',
                'Satisfying ASMR Clips': 'https://assets.codepen.io/6093409/satisfying-clips.mp4',
                'Simple Gradient': ''
            };
            setVideoSrc(placeholderVideos[visualTheme]);
        }
        setIsPlaying(false);
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [backgroundVideo, visualTheme]);

    const [musicSrc, setMusicSrc] = useState<string | null>(null);
    useEffect(() => {
        let objectUrl: string | undefined;
        if (backgroundMusic) {
            objectUrl = URL.createObjectURL(backgroundMusic);
            setMusicSrc(objectUrl);
        } else {
            setMusicSrc(null);
        }
        setIsPlaying(false);
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [backgroundMusic]);

    const handleTogglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        setIsPlaying(prev => !prev);
    };

    useEffect(() => {
        const video = videoRef.current;
        const music = musicRef.current;
        const voice = voiceoverRef.current;
        
        if (!video) return;

        if (isPlaying) {
            video.play().catch(console.error);
            if (music) music.play().catch(console.error);
            if (voice) voice.play().catch(console.error);
        } else {
            video.pause();
            if (music) music.pause();
            if (voice) voice.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const music = musicRef.current;
        const voice = voiceoverRef.current;
        if (!music || !voice) return;

        const handleVoicePlay = () => music.volume = 0.2;
        const handleVoiceEnd = () => music.volume = 1.0;

        voice.addEventListener('play', handleVoicePlay);
        voice.addEventListener('pause', handleVoiceEnd);
        voice.addEventListener('ended', handleVoiceEnd);
        
        return () => {
            voice.removeEventListener('play', handleVoicePlay);
            voice.removeEventListener('pause', handleVoiceEnd);
            voice.removeEventListener('ended', handleVoiceEnd);
        }
    }, [voiceover, musicSrc]);
    
    const aspectRatioClasses: { [key: string]: string } = {
        '9:16': 'aspect-[9/16] max-w-[320px]',
        '1:1': 'aspect-[1/1] max-w-[480px]',
        '16:9': 'aspect-[16/9] max-w-[640px]'
    };

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div 
                className={`relative w-full ${aspectRatioClasses[aspectRatio]} bg-navy-black rounded-3xl p-2 border-4 border-zinc-700 shadow-2xl mx-auto cursor-pointer group transition-all duration-300`}
                onClick={handleTogglePlay}
            >
                <div className="w-full h-full bg-zinc-900 rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-700 rounded-b-lg z-30"></div>
                    
                    {videoSrc ? (
                        <video ref={videoRef} key={videoSrc} src={videoSrc} loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 z-0"></div>
                    )}
                    
                    {musicSrc && <audio ref={musicRef} key={musicSrc} src={musicSrc} loop />}
                    {voiceover && <audio ref={voiceoverRef} key={voiceover.url} src={voiceover.url} />}

                    <div className="absolute inset-0 bg-black/40 z-10"></div>
                    
                    {!isPlaying && (
                         <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
                            <PlayIcon className="w-16 h-16 text-white/70" />
                        </div>
                    )}
                    
                    <TikTokPostOverlay post={post} aiTitle={aiTitle} selectedPostView={selectedPostView}/>

                    {voiceover && <AnimatedSubtitles text={voiceover.text} duration={voiceover.duration} isPlaying={isPlaying}/>}

                     <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 z-30">
                        <div className="w-12 h-12 rounded-full bg-zinc-600 border-2 border-white"></div>
                        <div className="flex flex-col items-center text-white"><HeartIcon className="w-10 h-10" /><span className="text-sm font-bold text-shadow">1.2M</span></div>
                        <div className="flex flex-col items-center text-white"><CommentBubbleIcon className="w-10 h-10" /><span className="text-sm font-bold text-shadow">45.2k</span></div>
                        <div className="flex flex-col items-center text-white"><ShareArrowIcon className="w-10 h-10" /><span className="text-sm font-bold text-shadow">10.1k</span></div>
                        <div className={`w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-600 ${isPlaying ? 'animate-spin-slow' : ''}`}></div>
                     </div>
                </div>
            </div>
        </div>
    );
};


// --- Inlined component: VideoControls ---
const ControlSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-black/20 p-4 rounded-lg border border-zinc-700 mb-6">
        <h4 className="text-lg font-bold text-zinc-300 flex items-center gap-2 mb-4">{icon}<span>{title}</span></h4>
        <div className="space-y-4">{children}</div>
    </div>
);

const FileInput: React.FC<{ label: string; id: string; file: File | null; setFile: (file: File | null) => void; accept: string; }> = ({ label, id, file, setFile, accept }) => (
    <div>
        <label htmlFor={id} className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 transition-colors w-full justify-center">
            <UploadIcon className="w-5 h-5" /><span>{label}</span>
        </label>
        <input id={id} type="file" className="hidden" accept={accept} onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
        {file && <p className="text-sm text-zinc-400 mt-2 truncate">Selected: {file.name}</p>}
    </div>
);

const SelectInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
    <div>
        <label className="text-sm font-medium text-zinc-400 block mb-1">{label}</label>
        <select value={value} onChange={onChange} className="w-full bg-navy-black border-2 border-neon-cyan/50 rounded-md p-2 text-base text-gray-200 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all">{children}</select>
    </div>
);

interface VideoControlsProps {
    backgroundVideo: File | null; setBackgroundVideo: (file: File | null) => void;
    backgroundMusic: File | null; setBackgroundMusic: (file: File | null) => void;
    visualTheme: string; setVisualTheme: (theme: string) => void;
    ttsVoice: string; setTtsVoice: (voice: string) => void;
    aspectRatio: string; setAspectRatio: (ratio: string) => void;
    onGenerateVoiceover: () => void; isGeneratingVoiceover: boolean;
}

const VideoControls: React.FC<VideoControlsProps> = ({
    backgroundVideo, setBackgroundVideo, backgroundMusic, setBackgroundMusic,
    visualTheme, setVisualTheme, ttsVoice, setTtsVoice, aspectRatio, setAspectRatio,
    onGenerateVoiceover, isGeneratingVoiceover
}) => {
    
    const aspectButtonClass = (ratio: string) => `rounded-md transition-all ${aspectRatio === ratio ? 'bg-zinc-800 border-2 border-neon-cyan ring-2 ring-neon-cyan' : 'bg-zinc-800/50 hover:border-zinc-500 border-2 border-transparent'}`;
    const aspectLabelClass = (ratio: string) => `flex items-center justify-center text-xs font-bold ${aspectRatio === ratio ? 'text-neon-cyan' : 'text-zinc-400'}`;

    return (
        <div>
            <ControlSection title="Assets" icon={<VideoCameraIcon className="w-6 h-6 text-neon-cyan" />}>
                <FileInput label="Add Background Video" id="video-upload" file={backgroundVideo} setFile={setBackgroundVideo} accept="video/*" />
            </ControlSection>
            <ControlSection title="Audio" icon={<MusicNoteIcon className="w-6 h-6 text-neon-pink" />}>
                 <FileInput label="Add Background Music" id="music-upload" file={backgroundMusic} setFile={setBackgroundMusic} accept="audio/*" />
                <SelectInput label="Voiceover Style (TTS)" value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                    <option>Alice (Calm)</option><option>David (Energetic)</option><option>Sarah (Storyteller)</option>
                </SelectInput>
                 <button onClick={onGenerateVoiceover} disabled={isGeneratingVoiceover} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 transition-colors justify-center disabled:opacity-50 disabled:cursor-wait">
                    {isGeneratingVoiceover ? <><LoadingSpinner /> Generating...</> : <><SparklesIcon className="w-5 h-5 text-neon-pink" /> Generate Voiceover</>}
                </button>
            </ControlSection>
            <ControlSection title="Styling" icon={<CogIcon className="w-6 h-6 text-neon-green" />}>
                <SelectInput label="Visual Theme" value={visualTheme} onChange={(e) => setVisualTheme(e.target.value)}>
                    <option>Subway Surfer Gameplay</option><option>Minecraft Parkour</option><option>Satisfying ASMR Clips</option><option>Simple Gradient</option>
                </SelectInput>
                <div>
                     <label className="text-sm font-medium text-zinc-400 block mb-2">Aspect Ratio</label>
                     <div className="grid grid-cols-3 gap-2">
                        <button className={`${aspectButtonClass('9:16')} aspect-w-9 aspect-h-16`} onClick={() => setAspectRatio('9:16')}><div className={aspectLabelClass('9:16')}>9:16</div></button>
                        <button className={`${aspectButtonClass('1:1')} aspect-w-1 aspect-h-1`} onClick={() => setAspectRatio('1:1')}><div className={aspectLabelClass('1:1')}>1:1</div></button>
                        <button className={`${aspectButtonClass('16:9')} aspect-w-16 aspect-h-9`} onClick={() => setAspectRatio('16:9')}><div className={aspectLabelClass('16:9')}>16:9</div></button>
                     </div>
                </div>
            </ControlSection>
            <div className="mt-8">
                 <button type="button" className="w-full bg-neon-green hover:bg-opacity-90 text-navy-black font-bold text-lg px-8 py-4 rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-neon-green/30 hover:shadow-lg hover:shadow-neon-green/50">Generate Video</button>
            </div>
        </div>
    )
};

// --- Inlined component: VideoCreationArea ---
const VideoCreationArea: React.FC<{ post: RedditPostData; aiTitle: string; }> = ({ post, aiTitle }) => {
    const [backgroundVideo, setBackgroundVideo] = useState<File | null>(null);
    const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null);
    const [visualTheme, setVisualTheme] = useState('Subway Surfer Gameplay');
    const [ttsVoice, setTtsVoice] = useState('Alice (Calm)');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [voiceover, setVoiceover] = useState<{ url: string; text: string, duration: number } | null>(null);
    const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
    const [selectedPostView, setSelectedPostView] = useState<'original' | 'ai'>('ai');

    const handleGenerateVoiceover = useCallback(async () => {
        if (!post.selftext) {
            alert("This post has no text to generate a voiceover from.");
            return;
        }
        setIsGeneratingVoiceover(true);

        const MAX_VOICEOVER_CHARS = 1000;
        let textToSynthesize = post.selftext;
        if (textToSynthesize.length > MAX_VOICEOVER_CHARS) {
            let truncatedText = textToSynthesize.substring(0, MAX_VOICEOVER_CHARS);
            const lastSentenceEnd = Math.max(
                truncatedText.lastIndexOf('.'),
                truncatedText.lastIndexOf('?'),
                truncatedText.lastIndexOf('!')
            );
            
            if (lastSentenceEnd > 0) {
                textToSynthesize = truncatedText.substring(0, lastSentenceEnd + 1);
            } else {
                 textToSynthesize = truncatedText;
            }
        }

        try {
            const base64Audio = await generateVoiceover(textToSynthesize, ttsVoice);
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = createWavBlob(byteArray);
            const url = URL.createObjectURL(blob);
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
            const duration = audioBuffer.duration;

            setVoiceover({ url, text: textToSynthesize, duration });
        } catch (error) {
            console.error("Failed to generate voiceover:", error);
            alert("Sorry, the voiceover could not be generated.");
        } finally {
            setIsGeneratingVoiceover(false);
        }
    }, [post.selftext, ttsVoice]);
    
    const PostViewButton: React.FC<{ view: 'original' | 'ai', label: string }> = ({ view, label }) => (
      <button 
        onClick={() => setSelectedPostView(view)}
        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${selectedPostView === view ? 'bg-neon-green text-navy-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
      >
        {label}
      </button>
    );

    return (
        <div className="mt-12">
             <div className="text-center p-6 sm:p-10 border-2 border-dashed border-zinc-700 rounded-lg">
                <h2 className="font-display uppercase text-3xl sm:text-4xl font-black tracking-tighter text-white mb-8">Video <span className="text-neon-green">Creation Studio</span></h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    <div className="lg:col-span-1">
                       <VideoControls 
                            backgroundVideo={backgroundVideo} setBackgroundVideo={setBackgroundVideo}
                            backgroundMusic={backgroundMusic} setBackgroundMusic={setBackgroundMusic}
                            visualTheme={visualTheme} setVisualTheme={setVisualTheme}
                            ttsVoice={ttsVoice} setTtsVoice={setTtsVoice}
                            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                            onGenerateVoiceover={handleGenerateVoiceover} isGeneratingVoiceover={isGeneratingVoiceover}
                       />
                    </div>
                    <div className="lg:col-span-2 flex flex-col items-center justify-center gap-4">
                        <div className="bg-black/20 p-2 rounded-lg border border-zinc-700">
                           <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-zinc-400 mr-2">Post in Video:</p>
                                <PostViewButton view="ai" label="AI Version" />
                                <PostViewButton view="original" label="Original" />
                           </div>
                        </div>
                        <VideoPreview 
                            post={post} aiTitle={aiTitle}
                            backgroundVideo={backgroundVideo} backgroundMusic={backgroundMusic}
                            visualTheme={visualTheme} aspectRatio={aspectRatio}
                            voiceover={voiceover} selectedPostView={selectedPostView}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [postData, setPostData] = useState<RedditPostData | null>(null);
    const [aiTitle, setAiTitle] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchAndAnalyze = useCallback(async (url: string) => {
        setIsLoading(true); setError(null); setPostData(null); setAiTitle(null);
        try {
            const fetchedPostData = await fetchRedditPost(url);
            setPostData(fetchedPostData);
            const generatedTitle = await generateTikTokTitle(fetchedPostData.title, fetchedPostData.selftext);
            setAiTitle(generatedTitle);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const LoadingState: React.FC = () => (
        <div className="text-center p-10 bg-black/20 border-2 border-neon-cyan rounded-lg">
            <div className="flex justify-center mb-4"><LoadingSpinner /></div>
            <p className="text-xl font-semibold text-neon-cyan">Analysiere Reddit Post...</p>
            <p className="text-zinc-400">Moment, das dauert nur kurz.</p>
        </div>
    );

    const ErrorState: React.FC<{ message: string }> = ({ message }) => (
        <div className="text-center p-10 bg-neon-pink/10 border-2 border-neon-pink rounded-lg">
            <p className="text-xl font-semibold text-neon-pink">Fehler</p>
            <p className="text-white mt-2">{message}</p>
        </div>
    );

    const WelcomeState: React.FC = () => (
         <div className="text-center p-10 border-2 border-dashed border-zinc-700 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-2">Bereit zum Klonen & Analysieren!</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Füge oben eine Reddit-URL ein, um den Post zu laden. Wir extrahieren die Daten und lassen die Gemini-KI einen viralen TikTok-Titel dafür erstellen.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-navy-black text-gray-200 font-sans p-4 sm:p-8">
            <main className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="font-display uppercase text-5xl sm:text-7xl font-black tracking-tighter text-white mb-2">Reddit Post <span className="text-neon-pink">Kloner</span></h1>
                    <p className="text-lg text-zinc-400">Verwandle Reddit-Gold in virale TikTok-Titel mit der Power von Gemini AI.</p>
                </header>
                <UrlInputForm onSubmit={handleFetchAndAnalyze} isLoading={isLoading} />
                <div className="mt-8">
                    {isLoading && <LoadingState />}
                    {error && <ErrorState message={error} />}
                    {!isLoading && !error && !postData && <WelcomeState />}
                    {postData && (
                        <div className="animate-fade-in">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div>
                                    <h3 className="font-display text-3xl font-black text-center mb-4 text-neon-cyan uppercase tracking-wide">Original Post</h3>
                                    <RedditPostCard post={postData} />
                                </div>
                                <div>
                                    <h3 className="font-display text-3xl font-black text-center mb-4 text-neon-pink uppercase tracking-wide flex items-center justify-center gap-2">
                                        <SparklesIcon className="w-7 h-7" /><span>KI-generierter Titel</span>
                                    </h3>
                                    {aiTitle ? (
                                        <RedditPostCard post={postData} aiTitle={aiTitle} isAiCard={true} />
                                    ) : (
                                        <div className="bg-black/20 rounded-lg p-8 text-center flex items-center justify-center h-full border-2 border-neon-pink/50">
                                            <div className="flex flex-col items-center gap-4"><LoadingSpinner /><p className="text-neon-pink/80">Generiere AI-Titel...</p></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {aiTitle && <VideoCreationArea post={postData} aiTitle={aiTitle} />}
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