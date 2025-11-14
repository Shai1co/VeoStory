// Google Analytics 4 tracking utilities

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Track page views for SPA navigation
export const trackPageView = (pageTitle: string, pagePath: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_title: pageTitle,
      page_path: pagePath,
    });
  }
};

// Track custom events
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Track game state changes as page views
export const trackGameState = (gameState: string, additionalData?: Record<string, any>) => {
  const pageTitles: Record<string, string> = {
    'START': 'Start Screen',
    'IMAGE_PREVIEW': 'Image Preview',
    'GENERATING_IMAGE': 'Generating Image',
    'GENERATING_VIDEO': 'Generating Video',
    'PLAYING': 'Watching Video',
    'REPLAY': 'Replaying Video',
    'CHOICES': 'Making Choices',
    'GENERATING_CHOICES': 'Generating Choices',
    'EXPORTING': 'Exporting Story',
    'EXPORTING_VIDEO': 'Exporting Video',
    'IMPORTING': 'Importing Story',
    'ERROR': 'Error Screen',
  };

  const pageTitle = pageTitles[gameState] || gameState;
  trackPageView(pageTitle, `/${gameState.toLowerCase()}`);

  // Track additional events for key interactions
  if (additionalData) {
    trackEvent('game_state_change', {
      game_state: gameState,
      ...additionalData,
    });
  }
};

// Track user interactions
export const trackInteraction = (action: string, category: string, label?: string, value?: number) => {
  trackEvent('user_interaction', {
    action,
    category,
    label,
    value,
  });
};

// Track story creation events
export const trackStoryEvent = (eventType: 'start' | 'continue' | 'export' | 'import', details?: Record<string, any>) => {
  trackEvent('story_interaction', {
    event_type: eventType,
    ...details,
  });
};

// Track video generation events
export const trackVideoGeneration = (model: string, intent: string, success: boolean, duration?: number) => {
  trackEvent('video_generation', {
    model,
    intent,
    success,
    duration,
  });
};

// Track choice selection
export const trackChoiceSelection = (choiceIndex: number, totalChoices: number, segmentId: number) => {
  trackEvent('choice_selected', {
    choice_index: choiceIndex,
    total_choices: totalChoices,
    segment_id: segmentId,
  });
};
