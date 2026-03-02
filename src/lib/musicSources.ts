// Music Sources Helper Functions
// Handles auto-detection and extraction from various music platforms

export type MusicSource = 'youtube' | 'soundcloud' | 'vk' | 'yandex' | 'unknown';

export interface DetectedSource {
  source: MusicSource;
  sourceId: string | null;
  searchQuery: string | null;
  originalUrl: string;
}

// Detect music source from URL
export function detectMusicSource(url: string): DetectedSource {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        source: 'youtube',
        sourceId: match[1],
        searchQuery: null,
        originalUrl: url,
      };
    }
  }

  // SoundCloud patterns
  const soundcloudPatterns = [
    /soundcloud\.com\/[\w-]+\/[\w-]+/,
  ];

  for (const pattern of soundcloudPatterns) {
    if (pattern.test(url)) {
      return {
        source: 'soundcloud',
        sourceId: url,
        searchQuery: null,
        originalUrl: url,
      };
    }
  }

  // VK Music patterns
  const vkPatterns = [
    /vk\.com\/audio(-?\d+)_(\d+)/,
    /vk\.com\/music\/album\/(-?\d+)_(\d+)/,
    /vkmusic\.org\/track\/(\d+)/,
  ];

  for (const pattern of vkPatterns) {
    const match = url.match(pattern);
    if (match) {
      // VK doesn't have embed API, we'll search on YouTube
      return {
        source: 'vk',
        sourceId: match[0],
        searchQuery: `VK music ${match[0]}`,
        originalUrl: url,
      };
    }
  }

  // Yandex Music patterns
  const yandexPatterns = [
    /music\.yandex\.(ru|com)\/album\/(\d+)\/track\/(\d+)/,
    /music\.yandex\.(ru|com)\/track\/(\d+)/,
    /music\.yandex\.(ru|com)\/album\/(\d+)/,
  ];

  for (const pattern of yandexPatterns) {
    const match = url.match(pattern);
    if (match) {
      // Yandex doesn't have embed API, we'll search on YouTube
      return {
        source: 'yandex',
        sourceId: match[0],
        searchQuery: `Yandex music ${match[0]}`,
        originalUrl: url,
      };
    }
  }

  // Check if it's a search query or unknown URL
  if (!url.includes('.') || url.startsWith('http://localhost')) {
    return {
      source: 'unknown',
      sourceId: null,
      searchQuery: url,
      originalUrl: url,
    };
  }

  return {
    source: 'unknown',
    sourceId: null,
    searchQuery: url,
    originalUrl: url,
  };
}

// Extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Check if URL is a valid music URL
export function isValidMusicUrl(url: string): boolean {
  const source = detectMusicSource(url);
  return source.source !== 'unknown' || source.searchQuery !== null;
}

// Get source display name
export function getSourceDisplayName(source: MusicSource): string {
  const names: Record<MusicSource, string> = {
    youtube: 'YouTube',
    soundcloud: 'SoundCloud',
    vk: 'VK Music',
    yandex: 'Yandex Music',
    unknown: 'Unknown',
  };
  return names[source];
}

// Get source icon
export function getSourceIcon(source: MusicSource): string {
  const icons: Record<MusicSource, string> = {
    youtube: '▶️',
    soundcloud: '🔊',
    vk: '🎵',
    yandex: '🎵',
    unknown: '🎵',
  };
  return icons[source];
}
