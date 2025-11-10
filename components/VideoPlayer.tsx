import React, { useRef, useEffect, useState } from 'react';
import { VideoSegment } from '../types';

interface VideoPlayerProps {
  videoSegment: VideoSegment;
  onVideoEnd: (videoElement: HTMLVideoElement) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  isCurrent: boolean;
  onClick: () => void;
  segmentIndex?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoSegment, onVideoEnd, onProgress, isCurrent, onClick, segmentIndex = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isCurrent) {
      const handleEnded = () => onVideoEnd(videoElement);
      const handleTimeUpdate = () => {
        if (onProgress) {
          onProgress(videoElement.currentTime, videoElement.duration);
        }
      };
      
      videoElement.addEventListener('ended', handleEnded);
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.loop = false;
      // Attempt to play the video
      videoElement.play().catch(error => {
        console.warn("Video autoplay was prevented:", error);
        // Autoplay might be blocked, user might need to interact first.
      });

      return () => {
        videoElement.removeEventListener('ended', handleEnded);
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      };
    } else {
      // For non-current videos, loop them silently like a GIF
      videoElement.loop = true;
      videoElement.play().catch(()=>{}); // Ignore errors for background loops
    }
  }, [videoSegment.videoUrl, onVideoEnd, onProgress, isCurrent]);

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`aspect-video w-full rounded-xl overflow-hidden shadow-2xl smooth-transition-slow ${
        !isCurrent ? 'cursor-pointer' : ''
      } ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      onClick={!isCurrent ? onClick : undefined}
      onMouseEnter={() => !isCurrent && setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          key={videoSegment.videoUrl}
          src={videoSegment.videoUrl}
          controls={isCurrent}
          muted={!isCurrent}
          playsInline
          className="w-full h-full object-cover smooth-transition"
        />
        
        {/* Hover overlay for non-current videos */}
        {!isCurrent && showOverlay && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center smooth-transition fade-in">
            <div className="text-center p-4 scale-in">
              <div className="text-white text-lg font-semibold mb-2">
                Segment {segmentIndex + 1}
              </div>
              <div className="text-slate-300 text-sm mb-4 max-w-md">
                {videoSegment.prompt}
              </div>
              <div className="text-sky-400 text-sm font-medium">
                Click to replay
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
