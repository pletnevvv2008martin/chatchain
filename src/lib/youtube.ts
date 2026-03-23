// YouTube Helper Functions

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
}

// Extract video ID from various YouTube URL formats
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Get thumbnail URL for video
export function getThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// Format duration from ISO 8601 or seconds
export function formatDuration(duration: string | number): string {
  if (typeof duration === 'number') {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // ISO 8601 format (PT4M13S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return duration;
}

// Search videos using YouTube Data API (requires API key on backend)
// For now, we'll use a client-side approach with suggestions
export function searchYouTubeSuggestions(query: string): Promise<string[]> {
  return new Promise((resolve) => {
    // Use YouTube's suggest query
    const script = document.createElement('script');
    const callbackName = `yt_suggest_${Date.now()}`;

    (window as unknown as Record<string, unknown>)[callbackName] = (data: unknown) => {
      document.head.removeChild(script);
      delete (window as unknown as Record<string, unknown>)[callbackName];

      if (Array.isArray(data) && data[1]) {
        const suggestions = data[1].map((item: unknown[]) => item[0] as string);
        resolve(suggestions);
      } else {
        resolve([]);
      }
    };

    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&callback=${callbackName}`;
    document.head.appendChild(script);

    setTimeout(() => {
      if ((window as unknown as Record<string, unknown>)[callbackName]) {
        document.head.removeChild(script);
        delete (window as unknown as Record<string, unknown>)[callbackName];
        resolve([]);
      }
    }, 5000);
  });
}

// YouTube Player State
export type YouTubePlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued' | 'error';

export const YOUTUBE_PLAYER_STATES: Record<number, YouTubePlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued'
};
