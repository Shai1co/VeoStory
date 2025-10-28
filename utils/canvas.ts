
export const extractVideoLastFrame = (videoElement: HTMLVideoElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext('2d');
    
    if (!context) {
      return reject(new Error('Failed to get canvas context.'));
    }

    // Seek to a point very close to the end to ensure the last frame is loaded
    videoElement.currentTime = videoElement.duration - 0.1;

    const onSeeked = () => {
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.currentTime = 0; // Reset for potential replay
      resolve(dataUrl);
    };

    videoElement.addEventListener('seeked', onSeeked, { once: true });
  });
};
