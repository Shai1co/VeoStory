
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
    const [message, setMessage] = useState(loadingMessages[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
            <div className="w-16 h-16 border-4 border-sky-400 border-dashed rounded-full animate-spin mb-6"></div>
            <h2 className="text-3xl font-bold text-slate-100 mb-2">{title}</h2>
            <p className="text-lg text-slate-300 max-w-md">{message}</p>
        </div>
    );
};

export default LoadingIndicator;
