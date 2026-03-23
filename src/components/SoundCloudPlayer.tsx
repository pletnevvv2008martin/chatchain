'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  extractSoundCloudId,
  formatSoundCloudDuration,
  SoundCloudWidget,
  SoundCloudTrack
} from '@/lib/soundcloud';

interface SoundCloudPlayerProps {
  trackUrl?: string;
  onStateChange?: (state: 'playing' | 'paused' | 'ended') => void;
  onReady?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
}

export function useSoundCloudPlayer() {
  const widgetRef = useRef<SoundCloudWidget | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<SoundCloudTrack | null>(null);

  useEffect(() => {
    // Load SoundCloud Widget API
    if (typeof window !== 'undefined' && !window.SC) {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const initWidget = useCallback((iframe: HTMLIFrameElement) => {
    if (!window.SC) {
      const checkSC = setInterval(() => {
        if (window.SC) {
          clearInterval(checkSC);
          widgetRef.current = new window.SC.Widget(iframe);
          setupBindings();
        }
      }, 100);
    } else {
      widgetRef.current = new window.SC.Widget(iframe);
      setupBindings();
    }
  }, []);

  const setupBindings = useCallback(() => {
    if (!widgetRef.current) return;

    widgetRef.current.bind('ready', () => {
      setIsReady(true);
      widgetRef.current?.getDuration((dur: number) => {
        setDuration(dur / 1000); // Convert to seconds
      });
    });

    widgetRef.current.bind('play', () => {
      setIsPlaying(true);
    });

    widgetRef.current.bind('pause', () => {
      setIsPlaying(false);
    });

    widgetRef.current.bind('finish', () => {
      setIsPlaying(false);
    });

    widgetRef.current.bind('playProgress', (data: { currentPosition: number }) => {
      setCurrentTime(data.currentPosition / 1000); // Convert to seconds
    });
  }, []);

  const loadTrack = useCallback((url: string) => {
    if (widgetRef.current) {
      widgetRef.current.load(url, {
        auto_play: false,
        show_artwork: true,
        visual: true,
        buying: false,
        sharing: false,
        download: false,
      });
    }
  }, []);

  const play = useCallback(() => {
    widgetRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    widgetRef.current?.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    widgetRef.current?.seekTo(seconds * 1000);
  }, []);

  const setVolume = useCallback((volume: number) => {
    // SoundCloud volume is 0-100
    widgetRef.current?.setVolume(volume);
  }, []);

  return {
    widgetRef,
    iframeRef,
    isReady,
    isPlaying,
    currentTime,
    duration,
    currentTrack,
    initWidget,
    loadTrack,
    play,
    pause,
    seek,
    setVolume,
    setCurrentTrack,
  };
}

interface SoundCloudPlayerComponentProps {
  trackUrl: string | null;
  widgetRef: React.MutableRefObject<SoundCloudWidget | null>;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onReady?: () => void;
  onTrackInfo?: (track: SoundCloudTrack) => void;
}

export function SoundCloudPlayerComponent({
  trackUrl,
  widgetRef,
  iframeRef,
  setIsPlaying,
  onProgress,
  onEnded,
  onReady,
  onTrackInfo,
}: SoundCloudPlayerComponentProps) {
  useEffect(() => {
    if (!trackUrl || !iframeRef.current) return;

    // Load SoundCloud API if not loaded
    const loadAPI = () => {
      return new Promise<void>((resolve) => {
        if (window.SC) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    loadAPI().then(() => {
      if (!iframeRef.current) return;

      // Create widget
      widgetRef.current = new window.SC.Widget(iframeRef.current);

      // Bind events
      widgetRef.current.bind('ready', () => {
        onReady?.();
        widgetRef.current?.getDuration((dur: number) => {
          onProgress?.(0, dur / 1000);
        });
        widgetRef.current?.getCurrentSound((sound: SoundCloudTrack | null) => {
          if (sound) onTrackInfo?.(sound);
        });
      });

      widgetRef.current.bind('play', () => {
        setIsPlaying(true);
      });

      widgetRef.current.bind('pause', () => {
        setIsPlaying(false);
      });

      widgetRef.current.bind('finish', () => {
        setIsPlaying(false);
        onEnded?.();
      });

      widgetRef.current.bind('playProgress', (data: { currentPosition: number }) => {
        widgetRef.current?.getDuration((dur: number) => {
          onProgress?.(data.currentPosition / 1000, dur / 1000);
        });
      });

      // Load track
      widgetRef.current.load(trackUrl, {
        auto_play: false,
        show_artwork: false,
        visual: false,
        buying: false,
        sharing: false,
        download: false,
      });
    });
  }, [trackUrl, widgetRef, iframeRef, setIsPlaying, onProgress, onEnded, onReady, onTrackInfo]);

  return (
    <iframe
      ref={iframeRef}
      id="soundcloud-widget"
      style={{ display: 'none' }}
      width="0"
      height="0"
      scrolling="no"
      frameBorder="no"
      allow="autoplay"
      src="https://w.soundcloud.com/player/?url=https://soundcloud.com&auto_play=false&show_artwork=false"
    />
  );
}

export function SoundCloudSearchInput({
  onTrackSelect,
  placeholder = "Вставьте ссылку SoundCloud..."
}: {
  onTrackSelect: (track: SoundCloudTrack & { url: string }) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trackUrl = extractSoundCloudId(input);
    if (!trackUrl) {
      alert('Неверная ссылка SoundCloud');
      return;
    }

    setIsLoading(true);

    // We'll create a basic track object
    // Real info will be loaded by the player
    onTrackSelect({
      id: Date.now().toString(),
      title: 'Загрузка трека...',
      thumbnail: '',
      duration: 0,
      permalink_url: trackUrl,
      user: { username: '' },
      url: trackUrl,
    });

    setInput('');
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-secondary)]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '⏳' : '🎵'}
        </button>
      </div>
    </form>
  );
}

export default SoundCloudPlayerComponent;
