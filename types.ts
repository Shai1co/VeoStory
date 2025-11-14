// Represents a single generated video variant
export interface VideoGeneration {
  generationId: string; // Unique ID for this generation attempt
  videoBlob: Blob;
  lastFrameDataUrl: string | null;
  createdAt: number; // Timestamp
  model?: string; // Which model was used
}

export interface VideoSegment {
  id: number;
  videoUrl: string; // This will be a blob URL (for the active generation)
  prompt: string;
  lastFrameDataUrl: string | null;
  choices?: string[];
  selectedChoice?: string;
  narrativeType?: string;
  // New fields for multi-generation support
  generations?: VideoGeneration[]; // All generated variants (with blob URLs instead of blobs)
  activeGenerationId?: string; // Which generation is currently active
}

// Type for storing in IndexedDB, which includes the raw video blob
export interface StoredVideoSegment {
  id: number;
  videoBlob: Blob; // The active generation's blob (for backward compatibility)
  prompt: string;
  lastFrameDataUrl: string | null; // Last frame of active generation
  choices?: string[];
  selectedChoice?: string;
  narrativeType?: string;
  // New fields for multi-generation support
  generations?: VideoGeneration[]; // All generated variants with their blobs
  activeGenerationId?: string; // Which generation is currently active
}

export type GenerationIntent = 'initial' | 'continuation';

export type GenerationTaskStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface GenerationQueueTask {
  id: string;
  segmentId: number;
  prompt: string;
  model: VideoModel;
  imageData?: string | null;
  imageModel?: ImageModel; // Which model to use for text-to-image generation
  intent: GenerationIntent;
  status: GenerationTaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  narrativeType?: string;
}

// Type for a generation in serialized format
export interface SerializableGeneration {
  generationId: string;
  videoDataUrl: string; // The blob converted to a base64 data URL
  lastFrameDataUrl: string | null;
  createdAt: number;
  model?: string;
}

// Type for serializing a segment for file export
export interface SerializableSegment {
  id: number;
  videoDataUrl: string; // The active generation's blob converted to a base64 data URL
  prompt: string;
  lastFrameDataUrl: string | null;
  choices?: string[];
  selectedChoice?: string;
  narrativeType?: string;
  // Multi-generation support
  generations?: SerializableGeneration[];
  activeGenerationId?: string;
}

// Type for the overall export file structure
export interface ExportedStoryFile {
    version: number;
    segments: SerializableSegment[];
}

// Video generation model types
export type VideoModel = 
  | 'veo-3.1-fast-generate-preview'
  | 'veo-3.1-generate-preview'
  | 'runway-gen-3-alpha'
  | 'runway-gen-4-turbo'
  | 'stable-video-diffusion-img2vid'
  | 'replicate-wan-2.5-i2v'
  | 'replicate-wan-2.5-i2v-fast'
  | 'replicate-veo-3.1'
  | 'replicate-veo-3.1-fast'
  | 'replicate-veo-3'
  | 'replicate-veo-3-fast';

// Image generation model types (for text-to-image before animating)
export type ImageModel =
  | 'flux-schnell'
  | 'gemini-imagen-3';

// Language model types (Gemini versions)
export type LLMModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-flash-latest'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite';

export type LLMProvider = 'gemini';

// Provider categories
export type VideoProvider = 'veo' | 'runway' | 'stable-diffusion' | 'replicate';

// Image provider categories
export type ImageProvider = 'replicate' | 'gemini';

// Image model metadata for UI display
export interface ImageModelMetadata {
  id: ImageModel;
  provider: ImageProvider;
  name: string;
  description: string;
  icon: string;
  speed: string;
  quality: string;
  costLevel: number;
  requiresApiKey?: string;
}

// Model metadata for UI display and configuration
export interface VideoModelMetadata {
  id: VideoModel;
  provider: VideoProvider;
  name: string;
  description: string;
  icon: string;
  speed: string;
  quality: string;
  costLevel: number; // 1-3, 1 = cheapest
  features: string[];
  limitations?: string[];
  requiresApiKey?: string; // Environment variable name for API key
  estimatedSeconds?: number; // Estimated generation time in seconds for ETA calculation
}

// LLM metadata for UI display
export interface LLMModelMetadata {
  id: LLMModel;
  provider: LLMProvider;
  name: string;
  description: string;
  icon: string;
  latency: string;
  costLevel: number;
  strengths: string[];
  recommendedUse: string;
}

export enum GameState {
  START = 'START',
  SELECTING_API_KEY = 'SELECTING_API_KEY',
  GENERATING_IMAGE = 'GENERATING_IMAGE', // Generating initial reference image
  IMAGE_PREVIEW = 'IMAGE_PREVIEW', // Showing generated image for approval
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  GENERATING_CHOICES = 'GENERATING_CHOICES',
  PLAYING = 'PLAYING', // Actively playing the latest video
  CHOICES = 'CHOICES', // Actively choosing for the latest video
  REPLAY = 'REPLAY', // Replaying a historical segment
  ERROR = 'ERROR',
  EXPORTING = 'EXPORTING',
  IMPORTING = 'IMPORTING',
  EXPORTING_VIDEO = 'EXPORTING_VIDEO',
}

// FIX: Replaced inline object type for `window.aistudio` with a named interface `AIStudio`.
// The error message "Property 'aistudio' must be of type 'AIStudio'" indicates
// another global declaration expects this named type, causing a conflict with the inline definition.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // FIX: Removed the `readonly` modifier to resolve the "All declarations of 'aistudio' must have identical modifiers" error.
    // This error indicates another declaration of 'aistudio' exists without the `readonly` modifier.
    aistudio: AIStudio;
    FFmpeg: any;
  }
}
