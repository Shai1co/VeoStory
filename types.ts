export interface VideoSegment {
  id: number;
  videoUrl: string; // This will be a blob URL
  prompt: string;
  lastFrameDataUrl: string | null;
  choices?: string[];
  selectedChoice?: string;
}

// Type for storing in IndexedDB, which includes the raw video blob
export interface StoredVideoSegment {
  id: number;
  videoBlob: Blob;
  prompt: string;
  lastFrameDataUrl: string | null;
  choices?: string[];
  selectedChoice?: string;
}

// Type for serializing a segment for file export
export interface SerializableSegment {
  id: number;
  videoDataUrl: string; // The blob converted to a base64 data URL
  prompt: string;
  lastFrameDataUrl: string | null;
  choices?: string[];
  selectedChoice?: string;
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
  | 'replicate-svd'
  | 'replicate-animatediff'
  | 'replicate-hotshot'
  | 'replicate-hailuo-02'
  | 'replicate-seedance-lite'
  | 'replicate-seedance-pro-fast'
  | 'replicate-seedance-pro';

// Provider categories
export type VideoProvider = 'veo' | 'runway' | 'stable-diffusion' | 'replicate';

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
}

export enum GameState {
  START = 'START',
  SELECTING_API_KEY = 'SELECTING_API_KEY',
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
