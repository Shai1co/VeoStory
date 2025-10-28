import React, { useRef, useEffect } from 'react';
import { VideoSegment } from '../types';

interface VideoPlayerProps {
  videoSegment: VideoSegment;
  onVideoEnd: (videoElement: HTMLVideoElement) => void;
  isCurrent: boolean;
  onClick: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoSegment, onVideoEnd, isCurrent, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isCurrent) {
      const handleEnded = () => onVideoEnd(videoElement);
      videoElement.addEventListener('ended', handleEnded);
      videoElement.loop = false;
      // Attempt to play the video
      videoElement.play().catch(error => {
        console.warn("Video autoplay was prevented:", error);
        // Autoplay might be blocked, user might need to interact first.
      });

      return () => {
        videoElement.removeEventListener('ended', handleEnded);
      };
    } else {
      // For non-current videos, loop them silently like a GIF
      videoElement.loop = true;
      videoElement.play().catch(()=>{}); // Ignore errors for background loops
    }
  }, [videoSegment.videoUrl, onVideoEnd, isCurrent]);

  return (
    <div 
      className={`aspect-video w-full rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ${!isCurrent ? 'cursor-pointer' : ''}`}
      onClick={!isCurrent ? onClick : undefined}
    >
      <video
        ref={videoRef}
        key={videoSegment.videoUrl}
        src={videoSegment.videoUrl}
        controls={isCurrent}
        muted={!isCurrent}
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default VideoPlayer;
