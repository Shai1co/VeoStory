import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, VideoSegment, StoredVideoSegment, SerializableSegment, ExportedStoryFile } from './types';
import { generateInitialVideo, generateNextVideo, pollVideoOperation, generateChoices } from './services/geminiService';
import { extractVideoLastFrame } from './utils/canvas';
import { initDB, saveSegment, loadSegments, clearHistory } from './utils/db';
import { blobToBase64, base64ToBlob } from './utils/file';
import { combineVideos } from './utils/video';
import ApiKeySelector from './components/ApiKeySelector';
import PromptInput from './components/PromptInput';
import VideoPlayer from './components/VideoPlayer';
import ChoiceOptions from './components/ChoiceOptions';
import LoadingIndicator from './components/LoadingIndicator';

export default function App() {
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [gameState, setGameState] = useState(GameState.SELECTING_API_KEY);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<number | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const [loadingTitle, setLoadingTitle] = useState('');
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadGameFromDB = useCallback(async () => {
    await initDB();
    const storedSegments = await loadSegments();
    if (storedSegments.length > 0) {
        const loadedSegments = storedSegments.map(s => ({
            ...s,
            videoUrl: URL.createObjectURL(s.videoBlob)
        }));
        setVideoSegments(loadedSegments);
        const lastSegment = loadedSegments[loadedSegments.length - 1];
        setCurrentSegmentId(lastSegment.id);

        if (lastSegment.choices && !lastSegment.selectedChoice) {
            setGameState(GameState.CHOICES);
            setChoices(lastSegment.choices);
        } else {
            setGameState(GameState.REPLAY);
        }
    } else {
        setGameState(GameState.START);
    }
  }, []);

  const checkApiKeyAndLoadGame = useCallback(async () => {
    try {
      const hasKey = window.aistudio && await window.aistudio.hasSelectedApiKey();
      if (hasKey) {
        setApiKeySelected(true);
        await loadGameFromDB();
      } else {
        setApiKeySelected(false);
        setGameState(GameState.SELECTING_API_KEY);
      }
    } catch (e) {
      console.error("aistudio not found or error checking key, assuming local dev.");
      setApiKeySelected(true); // Assume key is set via env for local dev
      await loadGameFromDB();
    }
  }, [loadGameFromDB]);


  useEffect(() => {
    checkApiKeyAndLoadGame();

    return () => {
        // Cleanup blob URLs on unmount to prevent memory leaks
        videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial mount

  const scrollToBottom = () => {
    if (mainContentRef.current) {
        mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
    }
  };

  const handleError = (error: any, context: string) => {
    console.error(context, error);
    let message = 'An unknown error occurred.';
    if (error instanceof Error) { message = error.message; }
    else if (typeof error === 'string') { message = error; }

    if (message.includes("exceeded your current quota") || message.includes("RESOURCE_EXHAUSTED")) {
        setErrorMessage(
            <>
                You've exceeded your API quota. To continue generating videos, please enable billing on your Google Cloud project.
                <div className="mt-4 flex flex-col items-center gap-2 text-sm">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">
                        How to Enable Billing
                    </a>
                    <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">
                        Learn about Rate Limits
                    </a>
                    <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">
                        Monitor Your Usage
                    </a>
                </div>
            </>
        );
        setGameState(GameState.ERROR);
    } else if (message.includes("Requested entity was not found") || message.includes("API key not found")) {
      setErrorMessage("API Key is invalid or missing. Please select a valid key.");
      setGameState(GameState.SELECTING_API_KEY);
      setApiKeySelected(false);
    } else {
      setErrorMessage(`Error: ${message}`);
      setGameState(GameState.ERROR);
    }
  };

  const startNewGame = async (prompt: string) => {
    // Set loading state immediately to show indicator and prevent more clicks
    setGameState(GameState.GENERATING_VIDEO);
    setLoadingTitle('Crafting Your First Scene...');

    // Clear any previous game state
    await clearHistory();
    videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
    setVideoSegments([]);
    setChoices([]);
    setCurrentSegmentId(null);
    setErrorMessage(null);
    
    // Start generating the first video
    generateVideo(prompt);
  };
  
  const generateVideo = useCallback(async (prompt: string, lastFrame?: string) => {
    try {
      const initialOperation = lastFrame
        ? await generateNextVideo(prompt, lastFrame)
        : await generateInitialVideo(prompt);
      
      const finalOperation = await pollVideoOperation(initialOperation);
      const videoUri = finalOperation.response?.generatedVideos?.[0]?.video?.uri;

      if (!videoUri) throw new Error('Video generation failed to return a valid URI.');
      
      const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
      const videoBlob = await response.blob();
      
      const newSegmentData: StoredVideoSegment = {
          id: Date.now(), prompt, videoBlob, lastFrameDataUrl: null
      };
      await saveSegment(newSegmentData);
      
      const videoUrl = URL.createObjectURL(videoBlob);
      const newSegmentState = { ...newSegmentData, videoUrl };

      setVideoSegments(prev => [...prev, newSegmentState]);
      setCurrentSegmentId(newSegmentState.id);
      setGameState(GameState.PLAYING);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      handleError(error, 'during video generation');
    }
  }, []);

  const handleVideoEnd = useCallback(async (videoElement: HTMLVideoElement) => {
    const lastSegment = videoSegments[videoSegments.length - 1];
    if (!lastSegment || lastSegment.id !== currentSegmentId) return;

    // If choices have already been generated for this segment, do nothing on subsequent video ends.
    if (lastSegment.choices && lastSegment.choices.length > 0) {
      return;
    }

    try {
      setGameState(GameState.GENERATING_CHOICES);
      setLoadingTitle("Imagining What's Next...");

      const lastFrameDataUrl = await extractVideoLastFrame(videoElement);
      const storyContext = videoSegments.map(s => s.prompt).join(' Then, ');
      const newChoices = await generateChoices(storyContext);
      
      const blob = await(await fetch(lastSegment.videoUrl)).blob();
      const segmentToUpdate: StoredVideoSegment = { ...lastSegment, videoBlob: blob, lastFrameDataUrl, choices: newChoices };
      await saveSegment(segmentToUpdate);

      setVideoSegments(prev => prev.map(seg => seg.id === lastSegment.id ? { ...seg, lastFrameDataUrl, choices: newChoices } : seg ));
      setChoices(newChoices);
      setGameState(GameState.CHOICES);
    } catch (error) {
      handleError(error, 'during video end processing');
    }
  }, [videoSegments, currentSegmentId]);

  const handleChoiceSelected = async (choice: string) => {
    const lastSegment = videoSegments[videoSegments.length - 1];
    if (lastSegment && lastSegment.lastFrameDataUrl) {
      setChoices([]);
      
      const blob = await(await fetch(lastSegment.videoUrl)).blob();
      const segmentToUpdate: StoredVideoSegment = { ...lastSegment, videoBlob: blob, selectedChoice: choice };
      await saveSegment(segmentToUpdate);
      setVideoSegments(prev => prev.map(s => s.id === lastSegment.id ? {...s, selectedChoice: choice} : s));

      setGameState(GameState.GENERATING_VIDEO);
      setLoadingTitle('Bringing Your Choice to Life...');
      generateVideo(choice, lastSegment.lastFrameDataUrl);
    } else {
      handleError(new Error("Could not find the last frame to continue the story."), 'on choice selection');
    }
  };

  const handleExportStory = async () => {
    const segmentsToExport = await loadSegments();
    if (segmentsToExport.length === 0) {
      alert("There is no story to export.");
      return;
    }
    
    setLoadingTitle("Exporting your story...");
    setGameState(GameState.EXPORTING);

    try {
      const serializableSegments: SerializableSegment[] = await Promise.all(
        segmentsToExport.map(async (segment) => ({
          id: segment.id,
          prompt: segment.prompt,
          lastFrameDataUrl: segment.lastFrameDataUrl,
          choices: segment.choices,
          selectedChoice: segment.selectedChoice,
          videoDataUrl: await blobToBase64(segment.videoBlob),
        }))
      );
      
      const exportData: ExportedStoryFile = { version: 1, segments: serializableSegments };
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veo-visual-novel-story-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleError(error, "during story export");
    } finally {
      const lastSegment = videoSegments[videoSegments.length - 1];
      if (lastSegment?.choices && !lastSegment.selectedChoice) {
        setGameState(GameState.CHOICES);
      } else if (videoSegments.length > 0) {
        setGameState(GameState.REPLAY);
      } else {
        setGameState(GameState.START);
      }
    }
  };

    const handleExportVideo = async () => {
        const segmentsToExport = await loadSegments();
        if (segmentsToExport.length < 2) {
            alert("You need at least two video segments to create a movie.");
            return;
        }

        setLoadingTitle("Stitching your movie together...");
        setGameState(GameState.EXPORTING_VIDEO);
        
        try {
            const videoBlobs = segmentsToExport.map(s => s.videoBlob);
            const combinedVideoBlob = await combineVideos(videoBlobs);

            const url = URL.createObjectURL(combinedVideoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `veo-visual-novel-movie-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            handleError(error, "during video export");
        } finally {
            const lastSegment = videoSegments[videoSegments.length - 1];
            if (lastSegment?.choices && !lastSegment.selectedChoice) {
                setGameState(GameState.CHOICES);
            } else if (videoSegments.length > 0) {
                setGameState(GameState.REPLAY);
            } else {
                setGameState(GameState.START);
            }
        }
    }

  const handleImportStory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingTitle("Importing your story...");
    setGameState(GameState.IMPORTING);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Failed to read file.");
        const data: ExportedStoryFile = JSON.parse(text);

        if (!data.version || !Array.isArray(data.segments)) throw new Error("Invalid story file format.");
        
        await clearHistory();
        videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
        setVideoSegments([]);
        
        const importedSegments: StoredVideoSegment[] = data.segments.map(s => ({ ...s, videoBlob: base64ToBlob(s.videoDataUrl) }));
        
        for (const segment of importedSegments) {
          await saveSegment(segment);
        }
        await loadGameFromDB();
      } catch (error) {
        handleError(error, "during story import");
      } finally {
        if(importInputRef.current) importInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const resetGame = async () => {
    await clearHistory();
    videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
    setVideoSegments([]);
    setChoices([]);
    setCurrentSegmentId(null);
    setErrorMessage(null);
    checkApiKeyAndLoadGame();
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col font-sans">
        {(
          gameState === GameState.GENERATING_VIDEO || 
          gameState === GameState.GENERATING_CHOICES ||
          gameState === GameState.EXPORTING ||
          gameState === GameState.IMPORTING ||
          gameState === GameState.EXPORTING_VIDEO
        ) && <LoadingIndicator title={loadingTitle} />}
        
        <header className="w-full p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
                Veo Visual Novel
            </h1>
            <div className="flex items-center gap-4">
              {videoSegments.length > 1 && (
                  <button onClick={handleExportVideo} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-500 transition-colors">
                      Export Video
                  </button>
              )}
              {videoSegments.length > 0 && (
                  <button onClick={handleExportStory} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-500 transition-colors">
                      Export Story
                  </button>
              )}
              {videoSegments.length > 0 && (
                  <button onClick={resetGame} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-500 transition-colors">
                      Start Over
                  </button>
              )}
            </div>
        </header>

        <main ref={mainContentRef} className="flex-grow flex flex-col items-center p-4 md:p-8 overflow-y-auto">
            {gameState === GameState.SELECTING_API_KEY && <ApiKeySelector onKeySelected={checkApiKeyAndLoadGame} />}

            {gameState === GameState.START && (
                <div className="flex flex-col items-center w-full">
                  <PromptInput onSubmit={startNewGame} disabled={false} />
                  <div className="text-center mt-8 border-t border-slate-700 w-full max-w-3xl pt-8">
                      <p className="text-slate-400 mb-4">Or, continue a previous adventure:</p>
                      <label htmlFor="import-story-input" className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-400 transition-colors duration-300 cursor-pointer shadow-md">
                          Import Story
                      </label>
                      <input id="import-story-input" ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportStory} />
                  </div>
                </div>
            )}

            {errorMessage && (
                <div className="text-center p-8 bg-red-900/50 border border-red-700 rounded-lg max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-red-300 mb-2">An Error Occurred</h2>
                    <div className="text-red-400">{errorMessage}</div>
                    <button onClick={resetGame} className="mt-4 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg">
                        Try Again
                    </button>
                </div>
            )}
            
            <div className="w-full flex-grow flex flex-col items-center gap-12 py-4">
                {videoSegments.map((segment, index) => {
                    const isLastSegment = index === videoSegments.length - 1;
                    const isCurrentPlayer = segment.id === currentSegmentId;
                    return (
                        <div key={segment.id} className={`w-full transition-all duration-500 ${isCurrentPlayer ? 'max-w-5xl' : 'max-w-3xl opacity-70 hover:opacity-100'}`}>
                            <p className="text-center text-slate-400 mb-2 italic">
                                {index === 0 ? "You began with:" : "Then you chose:"} "{segment.prompt}"
                            </p>
                            <VideoPlayer 
                                videoSegment={segment}
                                onVideoEnd={handleVideoEnd}
                                isCurrent={isCurrentPlayer}
                                onClick={() => {
                                    setCurrentSegmentId(segment.id);
                                    setGameState(isLastSegment && !segment.selectedChoice && segment.choices ? GameState.CHOICES : GameState.REPLAY);
                                }}
                            />
                            { (isCurrentPlayer && segment.choices) && (
                                <div className="mt-4">
                                    <ChoiceOptions 
                                        choices={segment.choices}
                                        onChoiceSelect={handleChoiceSelected}
                                        disabled={!isLastSegment || gameState !== GameState.CHOICES}
                                        selectedChoice={segment.selectedChoice}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </main>
    </div>
  );
}