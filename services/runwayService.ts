/**
 * Runway ML Gen-3/Gen-4 Video Generation Service
 * Supports text-to-video and image-to-video generation
 * Based on official Runway SDK patterns
 */

import { getApiKey } from '../utils/apiKeys';

// Correct model identifiers based on Runway API
type RunwayModel = 'gen3a_turbo' | 'gen3_alpha' | 'gen4_video';

interface RunwayTextToVideoRequest {
  model: RunwayModel;
  prompt?: string; // Text prompt (some APIs use 'prompt' instead of 'promptText')
  promptText?: string; // Alternative naming
  duration?: 5 | 10; // 5 or 10 seconds
  aspectRatio?: '16:9' | '9:16' | '1:1'; // Camel case
  ratio?: '16:9' | '9:16' | '1:1'; // Alternative naming
}

interface RunwayImageToVideoRequest {
  model: RunwayModel;
  promptImage?: string; // Image URL
  imageUrl?: string; // Alternative naming
  prompt?: string; // Optional text guidance
  promptText?: string; // Alternative naming
  duration?: 5 | 10;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  ratio?: '16:9' | '9:16' | '1:1';
}

interface RunwayTask {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'THROTTLED';
  output?: string[]; // Array of video URLs
  artifacts?: any[]; // Alternative response format
  failure?: string;
  failureCode?: string;
  progress?: number;
  createdAt?: string;
}

// Direct API calls (CORS allowed by Runway for browser requests)
const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

// Task types for Runway API
type RunwayTaskType = 'gen4_aleph' | 'gen3a_turbo' | 'gen3_alpha';

// API key is attached by Vite proxy in development. For production, calls should
// go through a backend that appends the Authorization header.

/**
 * Generate video using Runway ML Gen-3/Gen-4
 * Uses the actual Runway API format with task wrapper
 */
export async function generateRunwayVideo(
  prompt: string,
  imageData?: string,
  model: 'runway-gen-3-alpha' | 'runway-gen-4-turbo' = 'runway-gen-3-alpha'
): Promise<RunwayTask> {
  
  const apiKey = getApiKey('RUNWAY_API_KEY');
  if (!apiKey) {
    throw new Error('RUNWAY_API_KEY is not set. Please configure your API keys.');
  }
  
  // Map our model names to Runway's task types
  const taskType: RunwayTaskType = model === 'runway-gen-4-turbo' 
    ? 'gen4_aleph'    // Gen-4 (latest)
    : 'gen3a_turbo';  // Gen-3 Alpha Turbo
  
  // Runway API uses /gen4/video endpoint with task wrapper
  const endpoint = 'gen4/video';
  
  // Build request body with Runway's task structure
  const requestBody = {
    task: {
      taskType: taskType,
      options: {
        text_prompt: prompt,
        seed: Math.floor(Math.random() * 1000000),
        seconds: 5,  // 5 or 10 seconds
        width: 1280,
        height: 720,
        // If we had image URLs, we'd include: images: [url]
      }
    }
  };

  if (imageData) {
    console.warn('Runway image-to-video requires image URL upload. Currently using text-to-video only.');
    // Future: Upload imageData to cloud storage, get URL, add to requestBody.task.options.images
  }

  console.log('🎬 Runway API Request:', {
    endpoint: `${RUNWAY_API_BASE}/${endpoint}`,
    taskType,
    body: requestBody
  });

  const response = await fetch(`${RUNWAY_API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(requestBody)
  });

  console.log('📡 Runway Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }

    console.error('❌ Runway API Error:', errorData);
    throw new Error(
      `Runway API error (${response.status}): ${errorData.message || errorData.error || response.statusText}\n` +
      `Details: ${JSON.stringify(errorData, null, 2)}`
    );
  }

  const task: RunwayTask = await response.json();
  console.log('✅ Runway Task Created:', task.id);
  
  return task;
}

/**
 * Poll Runway task until completion
 */
export async function pollRunwayOperation(task: RunwayTask): Promise<RunwayTask> {
  const apiKey = getApiKey('RUNWAY_API_KEY');
  if (!apiKey) {
    throw new Error('RUNWAY_API_KEY is not set. Please configure your API keys.');
  }

  let attempts = 0;
  let currentTask = task;

  console.log('⏳ Polling Runway task:', currentTask.id);

  while (attempts < MAX_POLL_ATTEMPTS) {
    // Check if task is complete
    if (currentTask.status === 'SUCCEEDED') {
      console.log('✅ Runway task succeeded!');
      return currentTask;
    }

    if (currentTask.status === 'FAILED') {
      const error = currentTask.failure || currentTask.failureCode || 'Unknown error';
      console.error('❌ Runway task failed:', error);
      throw new Error(`Runway video generation failed: ${error}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    // Poll for status - try common endpoint patterns
    const pollEndpoint = `${RUNWAY_API_BASE}/tasks/${currentTask.id}`;
    
    console.log(`🔄 Polling (attempt ${attempts + 1}/${MAX_POLL_ATTEMPTS}):`, pollEndpoint);
    
    const response = await fetch(pollEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Poll failed:', response.status, response.statusText);
      throw new Error(`Failed to poll Runway task: ${response.status} ${response.statusText}`);
    }

    currentTask = await response.json();
    
    if (currentTask.progress !== undefined) {
      console.log(`📊 Progress: ${Math.round(currentTask.progress * 100)}%`);
    }
    
    attempts++;
  }

  throw new Error('Runway video generation timed out after 10 minutes');
}

/**
 * Fetch video blob from Runway URL
 */
export async function fetchRunwayVideoBlob(videoUrl: string): Promise<Blob> {
  const response = await fetch(videoUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Runway video: ${response.statusText}`);
  }

  return await response.blob();
}

