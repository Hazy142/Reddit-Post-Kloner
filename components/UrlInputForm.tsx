import React, { useState } from 'react';
import { LoadingSpinner } from './icons';

interface UrlInputFormProps {
    onSubmit: (url: string) => void;
    isLoading: boolean;
}

export const UrlInputForm: React.FC<UrlInputFormProps> = ({ onSubmit, isLoading }) => {
    const [url, setUrl] = useState('https://www.reddit.com/r/tifu/comments/1e2n7l9/tifu_by_letting_my_girlfriend_use_my_computer/');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(url);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-black/20 border-2 border-neon-cyan/30 rounded-lg p-6 mb-8 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-4">
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-grow bg-navy-black border-2 border-neon-cyan/50 rounded-md p-3 text-lg text-gray-200 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                    placeholder="Reddit Post-URL hier eingeben..."
                    disabled={isLoading}
                    required
                />
                <button
                    type="submit"
                    className="bg-neon-pink hover:bg-opacity-90 text-navy-black font-bold text-lg px-8 py-3 rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-neon-pink/30 hover:shadow-lg hover:shadow-neon-pink/50"
                    disabled={isLoading}
                >
                    {isLoading ? <LoadingSpinner /> : 'Laden & Analysieren'}
                </button>
            </div>
        </form>
    );
};