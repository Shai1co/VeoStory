// services/placeholderImageService.ts
import { extractBase64 } from '../utils/video';

/**
 * Generate a simple placeholder image from text prompt
 * This creates a basic colored rectangle with text as a fallback
 */
export async function generatePlaceholderImage(
  prompt: string,
  options?: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    width?: number;
    height?: number;
  }
): Promise<string> {
  const { aspectRatio = '16:9', width = 640, height = 360 } = options || {};
  
  // Calculate dimensions based on aspect ratio
  let finalWidth = width;
  let finalHeight = height;
  
  if (aspectRatio === '16:9') {
    finalHeight = Math.round(finalWidth * 9 / 16);
  } else if (aspectRatio === '9:16') {
    finalHeight = Math.round(finalWidth * 16 / 9);
  } else if (aspectRatio === '1:1') {
    finalHeight = finalWidth;
  }

  console.log(`🎨 Creating placeholder image: ${finalWidth}x${finalHeight} for prompt: "${prompt}"`);

  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, finalWidth, finalHeight);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  // Fill background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // Add some geometric shapes for visual interest
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(finalWidth * 0.2, finalHeight * 0.3, finalWidth * 0.1, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(finalWidth * 0.8, finalHeight * 0.7, finalWidth * 0.15, 0, 2 * Math.PI);
  ctx.fill();

  // Add text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.min(finalWidth, finalHeight) * 0.05}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Split prompt into lines if too long
  const words = prompt.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > finalWidth * 0.8) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
      }
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  // Draw text lines
  const lineHeight = Math.min(finalWidth, finalHeight) * 0.06;
  const startY = finalHeight / 2 - (lines.length - 1) * lineHeight / 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, finalWidth / 2, startY + index * lineHeight);
  });

  // Add a subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, finalWidth - 2, finalHeight - 2);

  // Convert to data URL
  const dataURL = canvas.toDataURL('image/jpeg', 0.8);
  
  console.log('✅ Placeholder image created successfully');
  return dataURL;
}

/**
 * Check if we can create placeholder images (always true in browser)
 */
export function isPlaceholderImageAvailable(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}
