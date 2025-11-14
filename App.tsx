import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  VideoSegment,
  StoredVideoSegment,
  SerializableSegment,
  SerializableGeneration,
  ExportedStoryFile,
  GenerationQueueTask,
  GenerationIntent,
  VideoModel,
  ImageModel,
  LLMModel,
} from './types';
import useGenerationQueue from './hooks/useGenerationQueue';
import { generateChoices } from './services/veoService';
import { enhancePrompt } from './services/promptEnhancementService';
import { VideoGenerationResponse, getProviderErrorMessage } from './services/videoGenerationService';
import { extractVideoLastFrame } from './utils/canvas';
import { initDB, saveSegment, loadSegments, clearHistory, addGenerationToSegment, setActiveGeneration, deleteGeneration } from './utils/db';
import { blobToBase64, base64ToBlob } from './utils/file';
import { combineVideos, combineVideosWithChoiceOverlays } from './utils/video';
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
import ImageModelSelector from './components/ImageModelSelector';
import LLMModelSelector from './components/LLMModelSelector';
import ImagePreview from './components/ImagePreview';
import StoryModelControls from './components/StoryModelControls';
import GenerationStatusBanner from './components/GenerationStatusBanner';
import ExportOptionsDialog, { ExportResolution } from './components/ExportOptionsDialog';
import ApiKeysDialog from './components/ApiKeysDialog';
import { StylePreset } from './config/stylePresets';
import { NarrativeType, getDefaultNarrativeType, getNarrativeTypeById, NARRATIVE_TYPES } from './config/narrativeTypes';
import { buildPrompt } from './utils/prompt';
import { fetchDistinctChoices } from './utils/choiceGeneration';
import { buildStoryContext, categorizeChoice } from './utils/storyContextBuilder';
import { getReferenceFrameFromPreviousChoice } from './utils/referenceFrame';
import { hasRequiredApiKeys } from './utils/apiKeys';
import { trackGameState, trackStoryEvent, trackChoiceSelection, trackVideoGeneration } from './utils/analytics';
import { DEFAULT_LLM_MODEL } from './config/llmModelMetadata';

const SCROLL_TO_BOTTOM_DELAY_MS = 300;
const SCROLL_TO_BOTTOM_RETRY_DELAY_MS = 600; // Additional scroll after a longer delay to ensure it works
const CHOICE_REGEN_LOADING_TITLE = 'Discovering Alternate Paths...';
const CHOICE_REGENERATION_FAILURE_MESSAGE = 'Could not find fresh choices. Please try again.';
const CHOICE_REGENERATION_MISSING_FRAME_MESSAGE = 'Unable to regenerate choices because the reference frame is unavailable.';
const CUSTOM_PROMPT_EMPTY_MESSAGE = 'Please enter a prompt before continuing.';
const LLM_MODEL_STORAGE_KEY = 'veo-llm-model-preference';

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
  
  // Image preview state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [initialStylePreset, setInitialStylePreset] = useState<StylePreset | null>(null);
  const [isRetryingImage, setIsRetryingImage] = useState(false);
  
  const toggleCustomPrompt = useCallback(() => {
    if (gameState !== GameState.CHOICES) {
      return;
    }
    setChoiceRegenerationError(null);
    setIsCustomPromptOpen((prev) => !prev);
  }, [gameState]);

  const handleCustomPromptChange = useCallback((value: string) => {
    setCustomPromptValue(value);
    if (choiceRegenerationError) {
      setChoiceRegenerationError(null);
    }
  }, [choiceRegenerationError]);

  // UI state
  const [isTimelineSidebarOpen, setIsTimelineSidebarOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<{message: string; action: () => void} | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showApiKeysDialog, setShowApiKeysDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<VideoModel>(() => {
    const saved = localStorage.getItem('veo-model-preference');
    return (saved as VideoModel) || 'veo-3.1-fast-generate-preview';
  });
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>(() => {
    const saved = localStorage.getItem('veo-image-model-preference');
    return (saved as ImageModel) || 'gemini-imagen-3';
  });
  const [selectedLlmModel, setSelectedLlmModel] = useState<LLMModel>(() => {
    const saved = localStorage.getItem(LLM_MODEL_STORAGE_KEY);
    return (saved as LLMModel) || DEFAULT_LLM_MODEL;
  });
  const [selectedNarrativeType, setSelectedNarrativeType] = useState<NarrativeType>(() => {
    const saved = localStorage.getItem('veo-narrative-type-preference');
    if (saved) {
      const type = getNarrativeTypeById(saved);
      if (type) return type;
    }
    return getDefaultNarrativeType();
  });
  const [isGlobalMuted, setIsGlobalMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('veo-global-mute');
    return saved === 'true';
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

  // Save image model preference to localStorage
  useEffect(() => {
    localStorage.setItem('veo-image-model-preference', selectedImageModel);
  }, [selectedImageModel]);

  useEffect(() => {
    localStorage.setItem(LLM_MODEL_STORAGE_KEY, selectedLlmModel);
  }, [selectedLlmModel]);

  // Save narrative type preference to localStorage
  useEffect(() => {
    localStorage.setItem('veo-narrative-type-preference', selectedNarrativeType.id);
  }, [selectedNarrativeType]);

  // Save mute preference to localStorage
  useEffect(() => {
    localStorage.setItem('veo-global-mute', isGlobalMuted.toString());
  }, [isGlobalMuted]);

  const toggleGlobalMute = useCallback(() => {
    setIsGlobalMuted(prev => !prev);
  }, []);

  const loadGameFromDB = useCallback(async () => {
    await initDB();
    const storedSegments = await loadSegments();
    if (storedSegments.length > 0) {
        const loadedSegments = storedSegments.map(s => {
          // Convert generations with blob URLs
          const generationsWithUrls = s.generations?.map(gen => ({
            ...gen,
            // Keep the blob as-is, we'll create URLs in the component as needed
          }));

          return {
            ...s,
            videoUrl: URL.createObjectURL(s.videoBlob),
            generations: generationsWithUrls,
          };
        });
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
    // Check if required API keys are configured
    if (!hasRequiredApiKeys()) {
      setShowApiKeysDialog(true);
      setGameState(GameState.START);
      return;
    }
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

  // Track game state changes for analytics
  useEffect(() => {
    trackGameState(gameState, {
      segment_count: videoSegments.length,
      current_segment: currentSegmentId,
      has_choices: choices.length > 0,
    });
  }, [gameState, videoSegments.length, currentSegmentId, choices.length]);

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

  // Cycle through narrative types
  const cycleNarrativeType = useCallback(() => {
    if (gameState === GameState.START) return; // Don't cycle on start screen
    
    const currentIndex = NARRATIVE_TYPES.findIndex(t => t.id === selectedNarrativeType.id);
    const nextIndex = (currentIndex + 1) % NARRATIVE_TYPES.length;
    setSelectedNarrativeType(NARRATIVE_TYPES[nextIndex]);
  }, [selectedNarrativeType, gameState]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 's',
      description: 'Toggle story timeline',
      action: () => setIsTimelineSidebarOpen(prev => !prev),
    },
    {
      key: 'm',
      description: 'Toggle global mute',
      action: toggleGlobalMute,
    },
    {
      key: 'n',
      description: 'Cycle narrative type',
      action: cycleNarrativeType,
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

      // Track successful video generation
      trackVideoGeneration(task.model, task.intent, true);

      // Check if this is a regeneration of an existing segment
      const existingSegmentIndex = videoSegments.findIndex(seg => seg.id === task.segmentId);
      const isRegeneration = existingSegmentIndex !== -1;

      if (isRegeneration) {
        // Add as a new generation to existing segment
        const generationId = await addGenerationToSegment(
          task.segmentId,
          videoBlob,
          null, // Last frame will be extracted later if needed
          task.model
        );
        
        // Reload from DB to get updated segment
        await loadGameFromDB();
        setLoadingTitle('');
        setGameState(GameState.PLAYING);
      } else {
        // Create new segment with initial generation
        const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const storedSegment: StoredVideoSegment = {
          id: task.segmentId,
          prompt: task.prompt,
          videoBlob,
          lastFrameDataUrl: null,
          narrativeType: task.narrativeType,
          generations: [{
            generationId,
            videoBlob,
            lastFrameDataUrl: null,
            createdAt: Date.now(),
            model: task.model,
          }],
          activeGenerationId: generationId,
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
          narrativeType: storedSegment.narrativeType,
          generations: [{
            generationId,
            videoBlob,
            lastFrameDataUrl: null,
            createdAt: Date.now(),
            model: task.model,
          }],
          activeGenerationId: generationId,
        };

        setVideoSegments((prev) => [...prev, newSegment]);
        setCurrentSegmentId(storedSegment.id);
        setLoadingTitle('');
        setGameState(GameState.PLAYING);
        
        // Scroll to bottom with multiple attempts to ensure the new video is visible
        setTimeout(scrollToBottom, SCROLL_TO_BOTTOM_DELAY_MS);
        setTimeout(scrollToBottom, SCROLL_TO_BOTTOM_RETRY_DELAY_MS);
      }
    },
    [scrollToBottom, videoSegments, loadGameFromDB],
  );

  const handleGenerationTaskError = useCallback(
    async (task: GenerationQueueTask, error: Error) => {
      console.error('Video generation task failed:', task, error);

      // Track failed video generation
      trackVideoGeneration(task.model, task.intent, false);

      const message = getProviderErrorMessage(task.model, error);
      setErrorMessage(message);
      setGameState(GameState.ERROR);
      
      // If this was a continuation task, clear the selectedChoice from the previous segment
      // so the user can select a choice again after fixing the error
      if (task.intent === 'continuation') {
        const storedSegments = await loadSegments();
        // Find the segment that has a selectedChoice but no next segment was created
        const segmentWithFailedChoice = storedSegments.find(seg => 
          seg.selectedChoice && !storedSegments.some(s => s.id > seg.id)
        );
        
        if (segmentWithFailedChoice) {
          // Clear the selectedChoice so user can try again
          const clearedSegment: StoredVideoSegment = {
            ...segmentWithFailedChoice,
            selectedChoice: undefined,
          };
          await saveSegment(clearedSegment);
          
          // Update the in-memory state as well
          setVideoSegments(prev => prev.map(seg => 
            seg.id === segmentWithFailedChoice.id 
              ? { ...seg, selectedChoice: undefined }
              : seg
          ));
        }
      }
    },
    [],
  );

  const {
    tasks: generationTasks,
    enqueueTask,
    cancelTask: cancelGenerationTaskInternal,
    retryTask: retryGenerationTask,
    activeTask: activeGenerationTask,
    pendingCount: pendingGenerationCount,
  } = useGenerationQueue({
    onTaskSuccess: handleGenerationTaskSuccess,
    onTaskError: handleGenerationTaskError,
  });

  // Wrap cancelTask to also restore choice selection when cancelling a failed generation
  const cancelGenerationTask = useCallback(async (taskId: string) => {
    const task = generationTasks.find(t => t.id === taskId);
    const wasCancelled = await cancelGenerationTaskInternal(taskId);
    
    // If we cancelled a continuation task, clear the selectedChoice from the previous segment
    if (wasCancelled && task?.intent === 'continuation') {
      const storedSegments = await loadSegments();
      const segmentWithFailedChoice = storedSegments.find(seg => 
        seg.selectedChoice && !storedSegments.some(s => s.id > seg.id)
      );
      
      if (segmentWithFailedChoice) {
        const clearedSegment: StoredVideoSegment = {
          ...segmentWithFailedChoice,
          selectedChoice: undefined,
        };
        await saveSegment(clearedSegment);
        
        setVideoSegments(prev => prev.map(seg => 
          seg.id === segmentWithFailedChoice.id 
            ? { ...seg, selectedChoice: undefined }
            : seg
        ));
        
        // Restore choices and game state so user can select again
        if (segmentWithFailedChoice.choices) {
          setChoices(segmentWithFailedChoice.choices);
          setCurrentSegmentId(segmentWithFailedChoice.id);
          setGameState(GameState.CHOICES);
          setErrorMessage(null);
        }
      }
    }
    
    return wasCancelled;
  }, [cancelGenerationTaskInternal, generationTasks]);

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
    async (prompt: string, intent: GenerationIntent, lastFrame?: string | null, narrativeType?: string) => {
      console.log('🎮 [DEBUG] App: queueVideoGeneration called');
      console.log('🎮 [DEBUG] App: Intent:', intent);
      console.log('🎮 [DEBUG] App: Has last frame:', !!lastFrame);
      console.log('🎮 [DEBUG] App: Narrative type:', narrativeType);

      try {
        const segmentId = getNextSegmentId();
        console.log('🎮 [DEBUG] App: Generated segment ID:', segmentId);

        const taskInput = {
          segmentId,
          prompt,
          model: selectedModel,
          imageData: lastFrame ?? null,
          imageModel: selectedImageModel,
          intent,
          narrativeType,
        };

        console.log('🎮 [DEBUG] App: Task input:', {
          segmentId,
          promptLength: prompt.length,
          model: selectedModel,
          hasImageData: !!lastFrame,
          imageModel: selectedImageModel,
          intent,
          narrativeType
        });

        console.log('🎮 [DEBUG] App: Calling enqueueTask...');
        await enqueueTask(taskInput);
        console.log('✅ [DEBUG] App: Task enqueued successfully');
      } catch (error) {
        console.error('❌ [DEBUG] App: Failed to enqueue task:', error);
        handleError(error, 'while queueing video generation');
      }
    },
    [enqueueTask, getNextSegmentId, selectedModel, selectedImageModel],
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

  const generateInitialImage = async (prompt: string, stylePreset: StylePreset | null, narrativeType: NarrativeType) => {
    console.log('🎮 [DEBUG] App: Starting initial image generation');
    console.log('🎮 [DEBUG] App: Original prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    console.log('🎮 [DEBUG] App: Style preset:', stylePreset?.name || 'none');
    console.log('🎮 [DEBUG] App: Narrative type:', narrativeType.id);
    console.log('🎮 [DEBUG] App: Selected image model:', selectedImageModel);
    console.log('🎮 [DEBUG] App: Selected LLM model:', selectedLlmModel);

    try {
      console.log('🎮 [DEBUG] App: Setting game state to GENERATING_IMAGE');
      setGameState(GameState.GENERATING_IMAGE);
      setLoadingTitle('Enhancing Your Prompt...');

      // Clear any previous game state
      console.log('🎮 [DEBUG] App: Clearing previous game state');
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
        console.log('🎮 [DEBUG] App: Cancelling existing generation tasks:', generationTasks.length);
        await Promise.all(generationTasks.map(task => cancelGenerationTask(task.id)));
      }
      
      // Build prompt with style preset
      console.log('🎮 [DEBUG] App: Building styled prompt...');
      const styledPrompt = buildPrompt(prompt, stylePreset);
      console.log('🎮 [DEBUG] App: Styled prompt length:', styledPrompt.length);
      
      // Enhance the prompt to make it more game-like and adventurous, with narrative type
      console.log('🎮 [DEBUG] App: Enhancing prompt...');
      const enhancedPrompt = await enhancePrompt(styledPrompt, { isInitial: true, narrativeType, llmModel: selectedLlmModel });
      console.log('🎮 [DEBUG] App: Enhanced prompt length:', enhancedPrompt.length);
      
      setLoadingTitle('Generating Your Scene Image...');
      
      // Generate the initial image based on selected image model
      console.log('🎮 [DEBUG] App: Importing replicateService.generateImageForPreview...');
      const { generateImageForPreview } = await import('./services/replicateService');
      console.log('🎮 [DEBUG] App: Calling generateImageForPreview...');
      const imageDataUrl = await generateImageForPreview(enhancedPrompt, selectedImageModel);
      console.log('🎮 [DEBUG] App: Image generation completed, data URL length:', imageDataUrl.length);
      
      // Store for later use and show preview
      console.log('🎮 [DEBUG] App: Setting preview image and state');
      setPreviewImageUrl(imageDataUrl);
      setInitialPrompt(enhancedPrompt);
      setInitialStylePreset(stylePreset);
      setGameState(GameState.IMAGE_PREVIEW);
      console.log('✅ [DEBUG] App: Initial image generation completed successfully');
      
    } catch (error) {
      console.error('❌ [DEBUG] App: Initial image generation failed:', error);
      handleError(error, 'during image generation');
    }
  };

  const startNewGame = async (prompt: string, stylePreset: StylePreset | null, narrativeType: NarrativeType) => {
    // Store the narrative type for this session
    setSelectedNarrativeType(narrativeType);

    // Track story creation
    trackStoryEvent('start', {
      narrative_type: narrativeType.id,
      has_style_preset: !!stylePreset,
      model: selectedModel,
      image_model: selectedImageModel,
      llm_model: selectedLlmModel,
    });

    await generateInitialImage(prompt, stylePreset, narrativeType);
  };

  const handleAcceptImage = useCallback(async () => {
    console.log('🎮 [DEBUG] App: handleAcceptImage called');
    console.log('🎮 [DEBUG] App: Preview image available:', !!previewImageUrl);
    console.log('🎮 [DEBUG] App: Initial prompt available:', !!initialPrompt);

    if (!previewImageUrl || !initialPrompt) {
      console.warn('⚠️ [DEBUG] App: Missing preview image or initial prompt, returning early');
      return;
    }
    
    try {
      console.log('🎮 [DEBUG] App: Setting game state to GENERATING_VIDEO');
      setGameState(GameState.GENERATING_VIDEO);
      setLoadingTitle('Crafting Your First Scene...');
      
      // Start generating the first video with the approved image
      console.log('🎮 [DEBUG] App: Calling queueVideoGeneration...');
      await queueVideoGeneration(initialPrompt, 'initial', previewImageUrl, selectedNarrativeType.id);
      console.log('✅ [DEBUG] App: Video generation queued successfully');
    } catch (error) {
      console.error('❌ [DEBUG] App: Video generation queue failed:', error);
      handleError(error, 'during video generation');
    }
  }, [previewImageUrl, initialPrompt, queueVideoGeneration, selectedNarrativeType]);

  const handleRetryImage = useCallback(async () => {
    if (!initialPrompt || !initialStylePreset) return;
    
    setIsRetryingImage(true);
    try {
      // Revoke the old image URL to free memory
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
      
      // Regenerate the image
      await generateInitialImage(initialPrompt, initialStylePreset, selectedNarrativeType);
    } catch (error) {
      handleError(error, 'during image retry');
    } finally {
      setIsRetryingImage(false);
    }
  }, [initialPrompt, initialStylePreset, previewImageUrl, selectedNarrativeType]);

  const handleDiscardImage = useCallback(() => {
    // Revoke the image URL to free memory
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    
    // Clear preview state and return to start
    setPreviewImageUrl(null);
    setInitialPrompt('');
    setInitialStylePreset(null);
    setGameState(GameState.START);
  }, [previewImageUrl]);
  
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
        // Build rich story context for prefetch
        const storyCtx = buildStoryContext(videoSegments, selectedNarrativeType.id);
        const recentChoiceTypes = videoSegments
          .slice(-3)
          .flatMap(s => s.choices || [])
          .map(categorizeChoice);
        
      const newChoices = await generateChoices(storyCtx.fullNarrative, undefined, {
          progressionHints: storyCtx.progressionHints,
          recentChoiceTypes,
          storyPhase: storyCtx.storyArcPhase,
          narrativeType: selectedNarrativeType,
        llmModel: selectedLlmModel,
        });
        
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
  }, [videoSegments, currentSegmentId, isPrefetchingChoices, preloadedChoices, selectedNarrativeType, selectedLlmModel]);

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
        
        // Build rich story context
        const storyCtx = buildStoryContext(videoSegments, selectedNarrativeType.id);
        const recentChoiceTypes = videoSegments
          .slice(-3)
          .flatMap(s => s.choices || [])
          .map(categorizeChoice);
        
        newChoices = await generateChoices(storyCtx.fullNarrative, lastFrameDataUrl, {
          progressionHints: storyCtx.progressionHints,
          recentChoiceTypes,
          storyPhase: storyCtx.storyArcPhase,
          narrativeType: selectedNarrativeType,
          llmModel: selectedLlmModel,
        });
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
  }, [videoSegments, currentSegmentId, preloadedChoices, selectedNarrativeType, selectedLlmModel]);

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
      // Build rich story context
      const storyCtx = buildStoryContext(videoSegments, selectedNarrativeType.id);
      const recentChoiceTypes = videoSegments
        .slice(-3)
        .flatMap(s => s.choices || [])
        .map(categorizeChoice);
      
      const newChoices = await fetchDistinctChoices({
        storyContext: storyCtx.fullNarrative,
        lastFrameDataUrl: activeSegment.lastFrameDataUrl,
        previousChoices: activeSegment.choices,
        progressionHints: storyCtx.progressionHints,
        recentChoiceTypes,
        storyPhase: storyCtx.storyArcPhase,
        narrativeType: selectedNarrativeType,
        llmModel: selectedLlmModel,
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
    selectedNarrativeType,
    selectedLlmModel,
  ]);

  const handleChoiceSelected = async (choice: string) => {
    const lastSegment = videoSegments[videoSegments.length - 1];
    if (lastSegment && lastSegment.lastFrameDataUrl) {
      try {
        // Track choice selection
        const choiceIndex = lastSegment.choices?.indexOf(choice) ?? -1;
        trackChoiceSelection(choiceIndex, lastSegment.choices?.length ?? 0, lastSegment.id);

        setChoices([]);
        setChoiceRegenerationError(null);
        // Clear prefetch state for next video
        setPreloadedChoices(null);
        setIsPrefetchingChoices(false);
        setIsCustomPromptOpen(false);
        setCustomPromptValue('');

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
          previousContext: storyContext,
          narrativeType: selectedNarrativeType,
          llmModel: selectedLlmModel,
        });

        setLoadingTitle('Bringing Your Choice to Life...');
        await queueVideoGeneration(enhancedChoice, 'continuation', lastSegment.lastFrameDataUrl, selectedNarrativeType.id);
      } catch (error) {
        handleError(error, 'during choice selection');
      }
    } else {
      handleError(new Error("Could not find the last frame to continue the story."), 'on choice selection');
    }
  };

  const handleCustomPromptSubmit = async () => {
    if (gameState !== GameState.CHOICES) {
      return;
    }

    const trimmedPrompt = customPromptValue.trim();
    if (!trimmedPrompt) {
      setChoiceRegenerationError(CUSTOM_PROMPT_EMPTY_MESSAGE);
      return;
    }

    const lastSegment = videoSegments[videoSegments.length - 1];
    if (!lastSegment || lastSegment.id !== currentSegmentId || lastSegment.selectedChoice) {
      return;
    }

    setChoiceRegenerationError(null);
    await handleChoiceSelected(trimmedPrompt);
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

    // Track story export
    trackStoryEvent('export', {
      segment_count: segmentsToExport.length,
      export_type: 'story'
    });

    setLoadingTitle("Exporting your story...");
    setGameState(GameState.EXPORTING);

    try {
      const serializableSegments: SerializableSegment[] = await Promise.all(
        segmentsToExport.map(async (segment) => {
          // Convert all generations to serializable format
          const serializableGenerations = segment.generations
            ? await Promise.all(
                segment.generations.map(async (gen) => ({
                  generationId: gen.generationId,
                  videoDataUrl: await blobToBase64(gen.videoBlob),
                  lastFrameDataUrl: gen.lastFrameDataUrl,
                  createdAt: gen.createdAt,
                  model: gen.model,
                }))
              )
            : undefined;

          return {
            id: segment.id,
            prompt: segment.prompt,
            lastFrameDataUrl: segment.lastFrameDataUrl,
            choices: segment.choices,
            selectedChoice: segment.selectedChoice,
            narrativeType: segment.narrativeType,
            videoDataUrl: await blobToBase64(segment.videoBlob),
            generations: serializableGenerations,
            activeGenerationId: segment.activeGenerationId,
          };
        })
      );
      
      const exportData: ExportedStoryFile = { version: 2, segments: serializableSegments };
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

        // Show export options dialog
        setShowExportOptions(true);
    }

    const handleExportWithOverlays = async (resolution: ExportResolution) => {
        setShowExportOptions(false);
        const segmentsToExport = await loadSegments();
        
        setLoadingTitle("Creating movie with choice overlays...");
        setGameState(GameState.EXPORTING_VIDEO);
        
        try {
            const combinedVideoBlob = await combineVideosWithChoiceOverlays(segmentsToExport, resolution);

            const url = URL.createObjectURL(combinedVideoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `veo-visual-novel-movie-with-choices-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Delay revocation to avoid cancelling the download on some browsers
            setTimeout(() => URL.revokeObjectURL(url), 1000);

        } catch (error) {
            handleError(error, "during video export with overlays");
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

    const handleExportSimple = async (resolution: ExportResolution) => {
        setShowExportOptions(false);
        const segmentsToExport = await loadSegments();
        
        setLoadingTitle("Stitching your movie together...");
        setGameState(GameState.EXPORTING_VIDEO);
        
        try {
            const videoBlobs = segmentsToExport.map(s => s.videoBlob);
            const combinedVideoBlob = await combineVideos(videoBlobs, resolution);

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

        // Track story import
        trackStoryEvent('import', {
          segment_count: data.segments.length,
          import_version: data.version
        });

        await clearHistory();
        videoSegments.forEach(segment => URL.revokeObjectURL(segment.videoUrl));
        setVideoSegments([]);
        
        const importedSegments: StoredVideoSegment[] = data.segments.map(s => {
          // Handle version 1 (old format without generations)
          if (data.version === 1 || !s.generations) {
            const videoBlob = base64ToBlob(s.videoDataUrl);
            const generationId = `gen-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            return {
              ...s,
              videoBlob,
              generations: [{
                generationId,
                videoBlob,
                lastFrameDataUrl: s.lastFrameDataUrl,
                createdAt: Date.now(),
                model: undefined,
              }],
              activeGenerationId: generationId,
            };
          }
          
          // Handle version 2 (new format with generations)
          const generations = s.generations!.map(gen => ({
            generationId: gen.generationId,
            videoBlob: base64ToBlob(gen.videoDataUrl),
            lastFrameDataUrl: gen.lastFrameDataUrl,
            createdAt: gen.createdAt,
            model: gen.model,
          }));
          
          // Find active generation or use the first one
          const activeGen = generations.find(g => g.generationId === s.activeGenerationId) || generations[0];
          
          return {
            ...s,
            videoBlob: activeGen.videoBlob,
            lastFrameDataUrl: activeGen.lastFrameDataUrl,
            generations,
            activeGenerationId: activeGen.generationId,
          };
        });
        
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

  // Video generation management handlers
  const handleRegenerateVideo = useCallback(async (segmentId: number) => {
    const segment = videoSegments.find(s => s.id === segmentId);
    if (!segment) return;

    const {
      frameDataUrl: previousChoiceFrame,
      segmentId: referenceSegmentId,
    } = getReferenceFrameFromPreviousChoice(videoSegments, segmentId);
    const fallbackFrame = segment.lastFrameDataUrl ?? null;
    const imageData = previousChoiceFrame ?? fallbackFrame;

    if (!imageData) {
      console.warn('⚠️ No reference frame available for regeneration; proceeding without image context.');
    } else if (!previousChoiceFrame && fallbackFrame) {
      console.warn('⚠️ Previous choice frame missing; falling back to current segment frame.');
    } else if (referenceSegmentId !== null) {
      console.log(`🔁 Using reference frame from segment ${referenceSegmentId} for regeneration.`);
    }

    // Create a new generation task for this segment
    await enqueueTask({
      segmentId: segment.id,
      prompt: segment.prompt,
      model: selectedModel,
      imageData,
      intent: 'continuation', // Use continuation since we have context
      narrativeType: segment.narrativeType,
    });
    
    setLoadingTitle(`Regenerating video for segment ${videoSegments.indexOf(segment) + 1}...`);
  }, [videoSegments, selectedModel, enqueueTask]);

  const handleSelectGeneration = useCallback(async (segmentId: number, generationId: string) => {
    try {
      await setActiveGeneration(segmentId, generationId);
      await loadGameFromDB();
      console.log(`Switched to generation ${generationId} for segment ${segmentId}`);
    } catch (error) {
      console.error('Failed to switch generation:', error);
      handleError(error, 'switching video generation');
    }
  }, [loadGameFromDB]);

  const handleDeleteGeneration = useCallback(async (segmentId: number, generationId: string) => {
    try {
      await deleteGeneration(segmentId, generationId);
      await loadGameFromDB();
      console.log(`Deleted generation ${generationId} from segment ${segmentId}`);
    } catch (error) {
      console.error('Failed to delete generation:', error);
      handleError(error, 'deleting video generation');
    }
  }, [loadGameFromDB]);

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
        {gameState === GameState.GENERATING_IMAGE && <LoadingIndicator title={loadingTitle} variant="simple" />}
        {gameState === GameState.GENERATING_VIDEO && <LoadingIndicator title={loadingTitle} variant="video" model={selectedModel} />}
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

        {/* Export Options Dialog */}
        {showExportOptions && (
          <ExportOptionsDialog
            onExportWithOverlays={handleExportWithOverlays}
            onExportSimple={handleExportSimple}
            onCancel={() => setShowExportOptions(false)}
          />
        )}

        {/* API Keys Configuration Dialog */}
        <ApiKeysDialog
          isOpen={showApiKeysDialog}
          onClose={() => setShowApiKeysDialog(false)}
          onSave={() => {
            // Reload game after API keys are configured
            checkApiKeyAndLoadGame();
          }}
          canClose={hasRequiredApiKeys()}
        />

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
              {/* Narrative type indicator badge (only show when story is active) */}
              {gameState !== GameState.START && (
                <button
                  onClick={cycleNarrativeType}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-900/50 border border-indigo-600 rounded-full text-indigo-300 hover:bg-indigo-800/50 transition-colors cursor-pointer"
                  title={`${selectedNarrativeType.description} (Press 'n' to cycle)`}
                >
                  <span>{selectedNarrativeType.icon}</span>
                  <span>{selectedNarrativeType.name}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {gameState !== GameState.START && (
                <StoryModelControls
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  selectedLlmModel={selectedLlmModel}
                  onLlmModelChange={setSelectedLlmModel}
                  selectedImageModel={selectedImageModel}
                  onImageModelChange={setSelectedImageModel}
                  pendingGenerationCount={pendingGenerationCount}
                  disabled={
                    gameState === GameState.EXPORTING ||
                    gameState === GameState.EXPORTING_VIDEO ||
                    gameState === GameState.IMPORTING
                  }
                />
              )}
              {/* Global Mute Toggle Button */}
              <button
                onClick={toggleGlobalMute}
                className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
                title={isGlobalMuted ? "Unmute Videos (m)" : "Mute Videos (m)"}
              >
                {isGlobalMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              {/* API Keys Settings Button */}
              <button
                onClick={() => setShowApiKeysDialog(true)}
                className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
                title="Configure API Keys"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </button>
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
                  <PromptInput onSubmit={startNewGame} disabled={false} llmModel={selectedLlmModel} />
                  
                  <div className="w-full max-w-3xl mx-auto mt-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg space-y-6">
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      disabled={false}
                    />

                    <div className="border-t border-slate-700 pt-6">
                      <LLMModelSelector
                        selectedModel={selectedLlmModel}
                        onModelChange={setSelectedLlmModel}
                        disabled={false}
                      />
                    </div>
                    
                    <div className="border-t border-slate-700 pt-6">
                      <ImageModelSelector
                        selectedModel={selectedImageModel}
                        onModelChange={setSelectedImageModel}
                        disabled={false}
                      />
                    </div>
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

            {gameState === GameState.IMAGE_PREVIEW && previewImageUrl && (
                <ImagePreview
                  imageUrl={previewImageUrl}
                  prompt={initialPrompt}
                  isRetrying={isRetryingImage}
                  onAccept={handleAcceptImage}
                  onRetry={handleRetryImage}
                  onDiscard={handleDiscardImage}
                />
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
                    const canRegenerateForSegment =
                        isCurrentSegment &&
                        isLastSegment &&
                        gameState === GameState.CHOICES &&
                        !segment.selectedChoice;
                    const isGeneratingChoicesForSegment =
                        isCurrentSegment && gameState === GameState.GENERATING_CHOICES;
                    const isCustomPromptSubmitting =
                        isCurrentSegment && gameState === GameState.GENERATING_VIDEO;
                    const isRegeneratingVideo = generationTasks.some(
                      task => task.segmentId === segment.id && task.status === 'running'
                    );
                    
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
                            onRegenerateChoices={canRegenerateForSegment ? handleRegenerateChoices : undefined}
                            canRegenerateChoices={canRegenerateForSegment}
                            isRegeneratingChoices={gameState === GameState.GENERATING_CHOICES}
                            regenerationError={choiceRegenerationError}
                            isChoiceLoading={isGeneratingChoicesForSegment}
                            choiceLoadingTitle={loadingTitle}
                            isCustomPromptOpen={canRegenerateForSegment ? isCustomPromptOpen : false}
                            onCustomPromptToggle={canRegenerateForSegment ? toggleCustomPrompt : undefined}
                            customPromptValue={customPromptValue}
                            onCustomPromptChange={canRegenerateForSegment ? handleCustomPromptChange : undefined}
                            onCustomPromptSubmit={canRegenerateForSegment ? handleCustomPromptSubmit : undefined}
                            isCustomPromptSubmitting={isCustomPromptSubmitting}
                            isGlobalMuted={isGlobalMuted}
                            onRegenerateVideo={() => handleRegenerateVideo(segment.id)}
                            onSelectGeneration={(genId) => handleSelectGeneration(segment.id, genId)}
                            onDeleteGeneration={(genId) => handleDeleteGeneration(segment.id, genId)}
                            isRegeneratingVideo={isRegeneratingVideo}
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