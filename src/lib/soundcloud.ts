// SoundCloud Helper Functions

export interface SoundCloudTrack {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // in milliseconds
  permalink_url: string;
  user: {
    username: string;
  };
}

// Extract track ID from SoundCloud URL
export function extractSoundCloudId(url: string): string | null {
  const patterns = [
    /soundcloud\.com\/[\w-]+\/[\w-]+/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(url)) {
      return url;
    }
  }
  return null;
}

// Format duration from milliseconds
export function formatSoundCloudDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get artwork URL with size
export function getArtworkUrl(url: string | null | undefined, size: 'mini' | 'small' | 'large' = 'small'): string {
  if (!url) {
    return '/default-album.png';
  }
  return url.replace('-large', `-${size === 'mini' ? 'mini' : size === 'large' ? 't500x500' : 'large'}`);
}

// SoundCloud Widget API states
export type SoundCloudPlayerState = 'unstarted' | 'playing' | 'paused' | 'ended' | 'buffering';

export const SOUNDCLOUD_EVENTS = {
  PLAY: 'SC.Widget.Events.PLAY',
  PAUSE: 'SC.Widget.Events.PAUSE',
  FINISH: 'SC.Widget.Events.FINISH',
  READY: 'SC.Widget.Events.READY',
  PROGRESS: 'SC.Widget.Events.PLAY_PROGRESS',
  LOAD_PROGRESS: 'SC.Widget.Events.LOAD_PROGRESS',
};

// SoundCloud Widget API
declare global {
  interface Window {
    SC: {
      Widget: new (iframe: HTMLIFrameElement | string) => SoundCloudWidget;
    };
  }
}

export interface SoundCloudWidget {
  bind: (event: string, callback: (data?: unknown) => void) => void;
  unbind: (event: string) => void;
  load: (url: string, options?: Record<string, unknown>) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (ms: number) => void;
  setVolume: (volume: number) => void;
  getVolume: (callback: (volume: number) => void) => void;
  getDuration: (callback: (duration: number) => void) => void;
  getCurrentSound: (callback: (sound: SoundCloudTrack | null) => void) => void;
  getCurrentSoundIndex: (callback: (index: number) => void) => void;
  getSounds: (callback: (sounds: SoundCloudTrack[]) => void) => void;
  skip: (index: number) => void;
  isPaused: (callback: (paused: boolean) => void) => void;
  getPosition: (callback: (position: number) => void) => void;
}
