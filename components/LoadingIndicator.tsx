
import React, { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
    title: string;
}

const loadingMessages = [
    "Summoning pixels from the digital ether...",
    "Directing the next scene with circuits and code...",
    "The character is contemplating their next move...",
    "Rendering a new chapter of your adventure...",
    "Weaving light and sound into a moving story...",
    "This can take a minute or two, great stories take time!",
];

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ title }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const rotation = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 5000);

        return () => {
            clearInterval(rotation);
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 px-6">
            <div className="max-w-md w-full bg-slate-900/80 border border-slate-700 rounded-2xl shadow-2xl px-8 py-10 text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full border-4 border-sky-400/60 border-t-transparent animate-spin" />
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
                    <p className="text-slate-400 text-base leading-relaxed">{loadingMessages[messageIndex]}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Preparing your scene…</p>
            </div>
        </div>
    );
};

export default LoadingIndicator;
