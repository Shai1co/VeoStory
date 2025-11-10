
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

const STAGE_DURATION_MS = 8000;
const TOTAL_ESTIMATED_TIME_MS = 90000;

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ title }) => {
    const [message, setMessage] = useState(loadingMessages[0]);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [currentStage, setCurrentStage] = useState(0);

    const stages = [
        'Initializing',
        'Generating',
        'Processing',
        'Finalizing'
    ];

    useEffect(() => {
        const messageInterval = setInterval(() => {
            setMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        }, 4000);

        const timerInterval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        const stageInterval = setInterval(() => {
            setCurrentStage(prev => (prev + 1) % stages.length);
        }, STAGE_DURATION_MS);

        return () => {
            clearInterval(messageInterval);
            clearInterval(timerInterval);
            clearInterval(stageInterval);
        };
    }, []);

    const progressPercentage = Math.min((elapsedSeconds / (TOTAL_ESTIMATED_TIME_MS / 1000)) * 100, 95);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-md flex flex-col items-center justify-center z-50 text-center p-4">
            {/* Animated Background Particles */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
                <div className="absolute w-64 h-64 bg-sky-500 rounded-full blur-3xl animate-pulse" style={{ top: '20%', left: '10%' }}></div>
                <div className="absolute w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse" style={{ top: '60%', right: '10%', animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 max-w-lg w-full">
                {/* Spinner */}
                <div className="relative w-20 h-20 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-sky-400/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-indigo-400/30 rounded-full"></div>
                    <div className="absolute inset-2 border-4 border-indigo-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>

                <h2 className="text-3xl font-bold text-slate-100 mb-4">{title}</h2>
                
                {/* Stage Indicators */}
                <div className="flex justify-center gap-2 mb-6">
                    {stages.map((stage, index) => (
                        <div key={stage} className="flex items-center">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-500 ${
                                index === currentStage 
                                    ? 'bg-sky-500 text-white scale-110' 
                                    : index < currentStage 
                                        ? 'bg-sky-700 text-slate-300' 
                                        : 'bg-slate-700 text-slate-400'
                            }`}>
                                {stage}
                            </div>
                            {index < stages.length - 1 && (
                                <svg className="w-4 h-4 mx-1 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>

                {/* Elapsed Time */}
                <div className="text-slate-400 text-sm mb-4 font-mono">
                    Elapsed: {formatTime(elapsedSeconds)}
                </div>

                <p className="text-lg text-slate-300 max-w-md mx-auto">{message}</p>
            </div>
        </div>
    );
};

export default LoadingIndicator;
