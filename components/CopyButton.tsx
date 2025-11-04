import React, { useState } from 'react';

interface CopyButtonProps {
    text: string;
    className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className = '' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Fehler beim Kopieren:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`relative px-6 py-3 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${className} ${
                copied
                    ? 'bg-neon-green text-navy-black shadow-[0_0_20px_rgba(57,255,20,0.8)]'
                    : 'bg-neon-pink hover:bg-opacity-90 text-navy-black shadow-md shadow-neon-pink/30 hover:shadow-lg hover:shadow-neon-pink/50'
            }`}
        >
            <span className="flex items-center gap-2">
                {copied ? (
                    <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Kopiert!
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Titel kopieren
                    </>
                )}
            </span>
        </button>
    );
};
