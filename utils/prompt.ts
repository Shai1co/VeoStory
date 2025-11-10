/**
 * Prompt Building Utilities
 * Handles assembly of prompts with style presets and sanitization
 */

import { StylePreset } from '../config/stylePresets';

/**
 * Build a complete prompt from user text and style preset
 * Avoids duplication and handles trimming
 */
export function buildPrompt(
  userText: string,
  stylePreset?: StylePreset | null,
  modelMetadata?: any
): string {
  // Trim and clean user text
  const cleanedText = userText.trim();
  
  if (!cleanedText) {
    return '';
  }

  // If no style preset or 'none' preset, return as-is
  if (!stylePreset || !stylePreset.suffix) {
    return cleanedText;
  }

  // Check if the user text already contains the style suffix
  // to avoid duplication
  const lowerText = cleanedText.toLowerCase();
  const lowerSuffix = stylePreset.suffix.toLowerCase();
  
  if (lowerText.includes(lowerSuffix)) {
    return cleanedText;
  }

  // Append style suffix
  return `${cleanedText}${stylePreset.suffix}`;
}

/**
 * Extract the base prompt without style suffix
 * Useful for editing prompts
 */
export function stripStyleSuffix(
  prompt: string,
  stylePreset?: StylePreset | null
): string {
  if (!stylePreset || !stylePreset.suffix) {
    return prompt;
  }

  // Remove the suffix if present
  const suffix = stylePreset.suffix;
  if (prompt.endsWith(suffix)) {
    return prompt.slice(0, -suffix.length).trim();
  }

  return prompt;
}

/**
 * Sanitize prompt text for safe API usage
 * Removes excessive whitespace and special characters
 */
export function sanitizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, ' '); // Replace newlines with spaces
}

