import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  VideoSegment,
  StoredVideoSegment,
  SerializableSegment,
  ExportedStoryFile,
  GenerationQueueTask,
  GenerationIntent,
  VideoModel,
} from './types';
import useGenerationQueue from './hooks/useGenerationQueue';
import { generateChoices } from './services/veoService';
import { enhancePrompt } from './services/promptEnhancementService';
import { VideoGenerationResponse, getProviderErrorMessage } from './services/videoGenerationService';
import { extractVideoLastFrame } from './utils/canvas';
import { initDB, saveSegment, loadSegments, clearHistory } from './utils/db';
import { blobToBase64, base64ToBlob } from './utils/file';
import { combineVideos } from './utils/video';
import { useKeyboardShortcuts } from './utils/useKeyboardShortcuts';
import PromptInput from './components/PromptInput';
import SegmentDisplay from './components/SegmentDisplay';
import LoadingIndicator from './components/LoadingIndicator';
import StoryTimeline from './components/StoryTimeline';
import ConfirmationBanner from './components/ConfirmationBanner';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import WelcomeTooltip from './components/WelcomeTooltip';
import JumpToLatest from './components/JumpToLatest';
import ModelSelector from './components/ModelSelector';
import StoryModelControls from './components/StoryModelControls';
import GenerationStatusBanner from './components/GenerationStatusBanner';
import { StylePreset } from './config/stylePresets';
import { buildPrompt } from './utils/prompt';
import { fetchDistinctChoices } from './utils/choiceGeneration';

const SCROLL_TO_BOTTOM_DELAY_MS = 100;
const CHOICE_REGEN_LOADING_TITLE = 'Discovering Alternate Paths...';
const CHOICE_REGENERATION_FAILURE_MESSAGE = 'Could not find fresh choices. Please try again.';
const CHOICE_REGENERATION_MISSING_FRAME_MESSAGE = 'Unable to regenerate choices because the reference frame is unavailable.';

export default function App() {
  const [gameState, setGameState] = useState(GameState.START);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<number | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const [loadingTitle, setLoadingTitle] = useState('');
  
  // Background choice prefetching state
  const [preloadedChoices, setPreloadedChoices] = useState<{ segmentId: number; choices: string[] } | null>(null);
  const [isPrefetchingChoices, setIsPrefetchingChoices] = useState(false);
  const [choiceRegenerationError, setChoiceRegenerationError] = useState<string | null>(null);
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const [customPromptValue, setCustomPromptValue] = useState('');
  
  // UI state
  const [isTimelineSidebarOpen, setIsTimelineSidebarOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<{message: string; action: () => void} | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [selectedModel, setSelectedModel] = useState<VideoModel>(() => {
    const saved = localStorage.getItem('veo-model-preference');
    return (saved as VideoModel) || 'veo-3.1-fast-generate-preview';
  });
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const segmentIdRef = useRef<number>(Date.now());

  const getNextSegmentId = useCallback(() => {
    segmentIdRef.current += 1;
    return segmentIdRef.current;
  }, []);

  // Save model preference to localStorage
  useEffect(() => {
    localStorage.setItem('veo-model-preference', selectedModel);
  }, [selectedModel]);

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
        segmentIdRef.current = lastSegment.id;

        if (lastSegment.choices && !lastSegment.selectedChoice) {
            setGameState(GameState.CHOICES);
            setChoices(lastSegment.choices);
        } else {
            setGameState(GameState.REPLAY);
        }
    } else {
        setGameState(GameState.START);
        segmentIdRef.current = Date.now();
    }
  }, []);

  const checkApiKeyAndLoadGame = useCallback(async () => {
    // Always assume API key is available via environment variable
    await loadGameFromDB();
  }, [loadGameFromDB]);


  useEffect(() => {
    checkApiKeyAndLoadGame();

    // Check if user has seen welcome tooltip
    const hasSeenWelcome = localStorage.getItem('veo-visual-novel-welcome-seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }

    return () => {
        // Cleanup blob URLs on unmount to prevent memory leaks
        videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial mount

  // Scroll detection for "Jump to Latest" button
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = mainContentRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;
      setShowJumpToLatest(!isNearBottom && videoSegments.length > 1);
    };

    const contentEl = mainContentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', handleScroll);
      return () => contentEl.removeEventListener('scroll', handleScroll);
    }
  }, [videoSegments.length]);

  const scrollToBottom = useCallback(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
    }
  }, []);

  const jumpToSegment = useCallback((segmentId: number) => {
    const segment = videoSegments.find(s => s.id === segmentId);
    if (segment) {
      const index = videoSegments.indexOf(segment);
      const isLastSegment = index === videoSegments.length - 1;
      setCurrentSegmentId(segmentId);
      setGameState(isLastSegment && !segment.selectedChoice && segment.choices ? GameState.CHOICES : GameState.REPLAY);
    }
  }, [videoSegments]);

  const navigateSegments = useCallback((direction: 'up' | 'down') => {
    const currentIndex = videoSegments.findIndex(s => s.id === currentSegmentId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < videoSegments.length) {
      jumpToSegment(videoSegments[newIndex].id);
    }
  }, [videoSegments, currentSegmentId, jumpToSegment]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 's',
      description: 'Toggle story timeline',
      action: () => setIsTimelineSidebarOpen(prev => !prev),
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowKeyboardHelp(true),
    },
    {
      key: 'Escape',
      description: 'Close dialogs',
      action: () => {
        setShowKeyboardHelp(false);
        setShowConfirmation(null);
      },
    },
    {
      key: 'ArrowUp',
      description: 'Previous segment',
      action: () => navigateSegments('up'),
    },
    {
      key: 'ArrowDown',
      description: 'Next segment',
      action: () => navigateSegments('down'),
    },
    {
      key: '1',
      description: 'Select first choice',
      action: () => {
        if (gameState === GameState.CHOICES && choices.length >= 1) {
          handleChoiceSelected(choices[0]);
        }
      },
    },
    {
      key: '2',
      description: 'Select second choice',
      action: () => {
        if (gameState === GameState.CHOICES && choices.length >= 2) {
          handleChoiceSelected(choices[1]);
        }
      },
    },
    {
      key: '3',
      description: 'Select third choice',
      action: () => {
        if (gameState === GameState.CHOICES && choices.length >= 3) {
          handleChoiceSelected(choices[2]);
        }
      },
    },
  ], !showConfirmation && !showKeyboardHelp && !showWelcome);

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
      setErrorMessage("API Key is invalid or missing. Please check your .env.local file.");
      setGameState(GameState.ERROR);

    } else if (message.includes("FFmpeg") || message.includes("window.FFmpeg")) {
      setErrorMessage(
        <>
          Video export failed due to FFmpeg loading issues. This may be due to:
          <ul className="mt-2 list-disc list-inside text-sm space-y-1">
            <li>Network connectivity problems</li>
            <li>Browser security restrictions</li>
            <li>Ad blockers blocking the FFmpeg script</li>
          </ul>
          <div className="mt-4 text-sm">
            Try refreshing the page or disabling ad blockers, then try again.
          </div>
        </>
      );
      setGameState(GameState.ERROR);
    } else {
      setErrorMessage(`Error: ${message}`);
      setGameState(GameState.ERROR);
    }
  };

  const handleGenerationTaskSuccess = useCallback(
    async (task: GenerationQueueTask, response: VideoGenerationResponse) => {
      const { videoBlob } = response;
      const storedSegment: StoredVideoSegment = {
        id: task.segmentId,
        prompt: task.prompt,
        videoBlob,
        lastFrameDataUrl: null,
      };

      await saveSegment(storedSegment);

      const videoUrl = URL.createObjectURL(videoBlob);
      const newSegment: VideoSegment = {
        id: storedSegment.id,
        prompt: storedSegment.prompt,
        videoUrl,
        lastFrameDataUrl: storedSegment.lastFrameDataUrl,
        choices: storedSegment.choices,
        selectedChoice: storedSegment.selectedChoice,
      };

      setVideoSegments((prev) => [...prev, newSegment]);
      setCurrentSegmentId(storedSegment.id);
      setLoadingTitle('');
      setGameState(GameState.PLAYING);
      setTimeout(scrollToBottom, SCROLL_TO_BOTTOM_DELAY_MS);
    },
    [scrollToBottom],
  );

  const handleGenerationTaskError = useCallback(
    async (task: GenerationQueueTask, error: Error) => {
      console.error('Video generation task failed:', task, error);
      const message = getProviderErrorMessage(task.model, error);
      setErrorMessage(message);
      setGameState(GameState.ERROR);
    },
    [],
  );

  const {
    tasks: generationTasks,
    enqueueTask,
    cancelTask: cancelGenerationTask,
    retryTask: retryGenerationTask,
    activeTask: activeGenerationTask,
    pendingCount: pendingGenerationCount,
  } = useGenerationQueue({
    onTaskSuccess: handleGenerationTaskSuccess,
    onTaskError: handleGenerationTaskError,
  });

  useEffect(() => {
    if (generationTasks.length === 0) {
      return;
    }
    const maxTaskSegmentId = Math.max(...generationTasks.map((task) => task.segmentId));
    if (maxTaskSegmentId > segmentIdRef.current) {
      segmentIdRef.current = maxTaskSegmentId;
    }
  }, [generationTasks]);

  const queueVideoGeneration = useCallback(
    async (prompt: string, intent: GenerationIntent, lastFrame?: string | null) => {
      try {
        const segmentId = getNextSegmentId();
        await enqueueTask({
          segmentId,
          prompt,
          model: selectedModel,
          imageData: lastFrame ?? null,
          intent,
        });
      } catch (error) {
        handleError(error, 'while queueing video generation');
      }
    },
    [enqueueTask, getNextSegmentId, selectedModel],
  );

  const focusLatestSegment = useCallback(() => {
    if (videoSegments.length === 0) {
      return;
    }
    const lastSegment = videoSegments[videoSegments.length - 1];
    setCurrentSegmentId(lastSegment.id);
    if (lastSegment.choices && !lastSegment.selectedChoice) {
      setGameState(GameState.CHOICES);
    } else {
      setGameState(GameState.REPLAY);
    }
    scrollToBottom();
  }, [videoSegments, scrollToBottom]);

  const startNewGame = async (prompt: string, stylePreset: StylePreset | null) => {
    try {
      // Set loading state immediately to show indicator and prevent more clicks
      setGameState(GameState.GENERATING_VIDEO);
      setLoadingTitle('Enhancing Your Prompt...');

      // Clear any previous game state
      await clearHistory();
      videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
      setVideoSegments([]);
      setChoices([]);
      setCurrentSegmentId(null);
      setErrorMessage(null);
      setPreloadedChoices(null);
      setIsPrefetchingChoices(false);
      segmentIdRef.current = Date.now();
      if (generationTasks.length > 0) {
        await Promise.all(generationTasks.map(task => cancelGenerationTask(task.id)));
      }
      
      // Build prompt with style preset
      const styledPrompt = buildPrompt(prompt, stylePreset);
      
      // Enhance the prompt to make it more game-like and adventurous
      const enhancedPrompt = await enhancePrompt(styledPrompt, { isInitial: true });
      
      setLoadingTitle('Crafting Your First Scene...');
      
      // Start generating the first video with enhanced prompt
      await queueVideoGeneration(enhancedPrompt, 'initial');
    } catch (error) {
      handleError(error, 'during prompt enhancement');
    }
  };
  
  // Background prefetch choices when video is near end (80% complete)
  const handleVideoProgress = useCallback(async (currentTime: number, duration: number) => {
    const lastSegment = videoSegments[videoSegments.length - 1];
    if (!lastSegment || lastSegment.id !== currentSegmentId) return;
    
    // If choices already exist or we're already prefetching, skip
    if (lastSegment.choices || isPrefetchingChoices || preloadedChoices) return;
    
    const PREFETCH_THRESHOLD = 0.8; // Start prefetching at 80% through video
    const progress = currentTime / duration;
    
    if (progress >= PREFETCH_THRESHOLD && !isNaN(progress)) {
      console.log('🔄 Background prefetching choices at', Math.round(progress * 100) + '%');
      setIsPrefetchingChoices(true);
      
      try {
        const storyContext = videoSegments.map(s => s.prompt).join(' Then, ');
        const newChoices = await generateChoices(storyContext);
        
        // Store preloaded choices
        setPreloadedChoices({ segmentId: lastSegment.id, choices: newChoices });
        console.log('✅ Choices preloaded successfully!');
      } catch (error) {
        console.error('❌ Failed to prefetch choices:', error);
        // Don't show error to user - will fall back to normal loading
      } finally {
        setIsPrefetchingChoices(false);
      }
    }
  }, [videoSegments, currentSegmentId, isPrefetchingChoices, preloadedChoices]);

  const handleVideoEnd = useCallback(async (videoElement: HTMLVideoElement) => {
    const lastSegment = videoSegments[videoSegments.length - 1];
    if (!lastSegment || lastSegment.id !== currentSegmentId) return;

    // If choices have already been generated for this segment, do nothing on subsequent video ends.
    if (lastSegment.choices && lastSegment.choices.length > 0) {
      return;
    }

    try {
      const lastFrameDataUrl = await extractVideoLastFrame(videoElement);
      let newChoices: string[];
      
      // Check if we have preloaded choices ready
      if (preloadedChoices && preloadedChoices.segmentId === lastSegment.id) {
        console.log('⚡ Using preloaded choices - instant display!');
        newChoices = preloadedChoices.choices;
        // No loading state needed - instant!
      } else {
        // Fallback: Generate choices now (with loading indicator)
        console.log('⏳ Choices not ready, generating now...');
        setGameState(GameState.GENERATING_CHOICES);
        setLoadingTitle("Imagining What's Next...");
        
        const storyContext = videoSegments.map(s => s.prompt).join(' Then, ');
        newChoices = await generateChoices(storyContext, lastFrameDataUrl);
      }
      
      const blob = await(await fetch(lastSegment.videoUrl)).blob();
      const segmentToUpdate: StoredVideoSegment = { ...lastSegment, videoBlob: blob, lastFrameDataUrl, choices: newChoices };
      await saveSegment(segmentToUpdate);

      setVideoSegments(prev => prev.map(seg => seg.id === lastSegment.id ? { ...seg, lastFrameDataUrl, choices: newChoices } : seg ));
      setChoices(newChoices);
      setGameState(GameState.CHOICES);
      setChoiceRegenerationError(null);
      setIsCustomPromptOpen(false);
      setCustomPromptValue('');
      
      // Clear preloaded choices after use
      setPreloadedChoices(null);
    } catch (error) {
      handleError(error, 'during video end processing');
    }
  }, [videoSegments, currentSegmentId, preloadedChoices]);

  const handleRegenerateChoices = useCallback(async () => {
    if (gameState !== GameState.CHOICES) {
      return;
    }

    const activeSegment = videoSegments.find(segment => segment.id === currentSegmentId);
    if (!activeSegment || !activeSegment.choices || activeSegment.choices.length === 0) {
      return;
    }
    if (activeSegment.selectedChoice) {
      return;
    }
    if (!activeSegment.lastFrameDataUrl) {
      setChoiceRegenerationError(CHOICE_REGENERATION_MISSING_FRAME_MESSAGE);
      return;
    }

    setChoiceRegenerationError(null);
    setGameState(GameState.GENERATING_CHOICES);
    setLoadingTitle(CHOICE_REGEN_LOADING_TITLE);

    try {
      const storyContext = videoSegments.map(segment => segment.prompt).join(' Then, ');
      const newChoices = await fetchDistinctChoices({
        storyContext,
        lastFrameDataUrl: activeSegment.lastFrameDataUrl,
        previousChoices: activeSegment.choices,
      });

      const blob = await (await fetch(activeSegment.videoUrl)).blob();
      const segmentToUpdate: StoredVideoSegment = {
        ...activeSegment,
        videoBlob: blob,
        choices: newChoices,
      };
      await saveSegment(segmentToUpdate);

      setVideoSegments(prev =>
        prev.map(segment => (segment.id === activeSegment.id ? { ...segment, choices: newChoices } : segment)),
      );
      setChoices(newChoices);
      setPreloadedChoices(null);
      setIsPrefetchingChoices(false);
      setChoiceRegenerationError(null);
      setGameState(GameState.CHOICES);
      setIsCustomPromptOpen(false);
      setCustomPromptValue('');
    } catch (error) {
      console.error('Failed to regenerate choices', error);
      setChoiceRegenerationError(CHOICE_REGENERATION_FAILURE_MESSAGE);
      setGameState(GameState.CHOICES);
    } finally {
      setLoadingTitle('');
    }
  }, [
    gameState,
    videoSegments,
    currentSegmentId,
    setVideoSegments,
    setChoices,
    setPreloadedChoices,
    setIsPrefetchingChoices,
    setChoiceRegenerationError,
    setGameState,
    setLoadingTitle,
  ]);

  const handleChoiceSelected = async (choice: string) => {
    const lastSegment = videoSegments[videoSegments.length - 1];
    if (lastSegment && lastSegment.lastFrameDataUrl) {
      try {
        setChoices([]);
        setChoiceRegenerationError(null);
        // Clear prefetch state for next video
        setPreloadedChoices(null);
        setIsPrefetchingChoices(false);
        
        const blob = await(await fetch(lastSegment.videoUrl)).blob();
        const segmentToUpdate: StoredVideoSegment = { ...lastSegment, videoBlob: blob, selectedChoice: choice };
        await saveSegment(segmentToUpdate);
        setVideoSegments(prev => prev.map(s => s.id === lastSegment.id ? {...s, selectedChoice: choice} : s));

        setGameState(GameState.GENERATING_VIDEO);
        setLoadingTitle('Enhancing Your Choice...');
        
        // Enhance the choice to make it more game-like and adventurous
        const storyContext = videoSegments.map(s => s.prompt).join(' Then, ');
        const enhancedChoice = await enhancePrompt(choice, { 
          isInitial: false, 
          previousContext: storyContext 
        });
        
        setLoadingTitle('Bringing Your Choice to Life...');
        await queueVideoGeneration(enhancedChoice, 'continuation', lastSegment.lastFrameDataUrl);
      } catch (error) {
        handleError(error, 'during choice selection');
      }
    } else {
      handleError(new Error("Could not find the last frame to continue the story."), 'on choice selection');
    }
  };

  const handleExportStory = async () => {
    const segmentsToExport = await loadSegments();
    if (segmentsToExport.length === 0) {
      setShowConfirmation({
        message: "There is no story to export.",
        action: () => setShowConfirmation(null)
      });
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
            setShowConfirmation({
                message: "You need at least two video segments to create a movie.",
                action: () => setShowConfirmation(null)
            });
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
            // Delay revocation to avoid cancelling the download on some browsers
            setTimeout(() => URL.revokeObjectURL(url), 1000);

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

  const resetGame = () => {
    setShowConfirmation({
      message: "Are you sure you want to start over? This will delete your current story.",
      action: async () => {
        setShowConfirmation(null);
        if (generationTasks.length > 0) {
          await Promise.all(generationTasks.map(task => cancelGenerationTask(task.id)));
        }
        await clearHistory();
        videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
        setVideoSegments([]);
        setChoices([]);
        setCurrentSegmentId(null);
        setErrorMessage(null);
        checkApiKeyAndLoadGame();
      }
    });
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col font-sans">
        {/* Loading Indicator */}
        {gameState === GameState.GENERATING_VIDEO && <LoadingIndicator title={loadingTitle} variant="video" />}
        {(
          gameState === GameState.EXPORTING ||
          gameState === GameState.IMPORTING ||
          gameState === GameState.EXPORTING_VIDEO
        ) && <LoadingIndicator title={loadingTitle} variant="simple" />}
        
        {/* Story Timeline Sidebar */}
        <StoryTimeline
          segments={videoSegments}
          currentSegmentId={currentSegmentId}
          onSegmentClick={jumpToSegment}
          isOpen={isTimelineSidebarOpen}
          onToggle={() => setIsTimelineSidebarOpen(!isTimelineSidebarOpen)}
        />

        {/* Confirmation Banner */}
        {showConfirmation && (
          <ConfirmationBanner
            message={showConfirmation.message}
            onConfirm={showConfirmation.action}
            onCancel={() => setShowConfirmation(null)}
            type="warning"
          />
        )}

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />

        {/* Welcome Tooltip */}
        {showWelcome && (
          <WelcomeTooltip
            onDismiss={() => {
              setShowWelcome(false);
              localStorage.setItem('veo-visual-novel-welcome-seen', 'true');
            }}
          />
        )}

        {/* Jump to Latest Button */}
        <JumpToLatest
          isVisible={showJumpToLatest}
          onClick={scrollToBottom}
        />
        
        <header className="w-full p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
                  Veo Visual Novel
              </h1>
              {/* Model indicator badge */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-800 border border-slate-600 rounded-full text-slate-300">
                {selectedModel.includes('fast') ? '⚡' : '✨'}
                {selectedModel.includes('fast') ? 'Fast' : 'Standard'}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {gameState !== GameState.START && (
                <StoryModelControls
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  pendingGenerationCount={pendingGenerationCount}
                  disabled={
                    gameState === GameState.EXPORTING ||
                    gameState === GameState.EXPORTING_VIDEO ||
                    gameState === GameState.IMPORTING
                  }
                />
              )}
              {/* Keyboard Shortcuts Help Button */}
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
                title="Keyboard Shortcuts (?)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
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

            {gameState === GameState.START && (
                <div className="flex flex-col items-center w-full">
                  <PromptInput onSubmit={startNewGame} disabled={false} />
                  
                  <div className="w-full max-w-3xl mx-auto mt-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      disabled={false}
                    />
                  </div>

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
                    const isCurrentSegment = segment.id === currentSegmentId;
                    return (
                        <SegmentDisplay
                            key={segment.id}
                            segment={segment}
                            index={index}
                            isCurrent={isCurrentSegment}
                            isLast={isLastSegment}
                            gameState={gameState}
                            onSegmentSelect={() => {
                                    setCurrentSegmentId(segment.id);
                                    setGameState(isLastSegment && !segment.selectedChoice && segment.choices ? GameState.CHOICES : GameState.REPLAY);
                                }}
                            onVideoEnd={handleVideoEnd}
                            onVideoProgress={isLastSegment ? handleVideoProgress : undefined}
                                        onChoiceSelect={handleChoiceSelected}
                            onRegenerateChoices={handleRegenerateChoices}
                            canRegenerateChoices={
                                isCurrentSegment &&
                                isLastSegment &&
                                gameState === GameState.CHOICES &&
                                !segment.selectedChoice
                            }
                            isRegeneratingChoices={gameState === GameState.GENERATING_CHOICES}
                            regenerationError={choiceRegenerationError}
                            isChoiceLoading={isCurrentSegment && gameState === GameState.GENERATING_CHOICES}
                            choiceLoadingTitle={loadingTitle}
                            isCustomPromptOpen={isCustomPromptOpen}
                            onCustomPromptToggle={() => setIsCustomPromptOpen(prev => !prev)}
                        />
                    )
                })}
            </div>
        </main>
        <GenerationStatusBanner
          tasks={generationTasks}
          activeTask={activeGenerationTask}
          onCancelTask={cancelGenerationTask}
          onRetryTask={retryGenerationTask}
          onReturnToStory={focusLatestSegment}
        />
    </div>
  );
}