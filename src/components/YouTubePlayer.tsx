'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { extractVideoId, getThumbnail, YouTubeVideo, YOUTUBE_PLAYER_STATES } from '@/lib/youtube';

interface YouTubePlayerProps {
  videoId?: string;
  onStateChange?: (state: 'playing' | 'paused' | 'ended' | 'error') => void;
  onReady?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  volume?: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string;
          width: string;
          videoId: string;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            disablekb?: number;
            fs?: number;
            modestbranding?: number;
            rel?: number;
            showinfo?: number;
          };
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  getVideoData: () => { video_id: string; title: string };
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
}

export function useYouTubePlayer() {
  const playerRef = useRef<YTPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const updateProgress = useCallback(() => {
    if (playerRef.current) {
      setCurrentTime(playerRef.current.getCurrentTime());
      setDuration(playerRef.current.getDuration());
    }
  }, []);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  const setPlayerVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol);
    setVolume(vol);
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  }, [isMuted]);

  return {
    playerRef,
    isReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    setIsReady,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    updateProgress,
    play,
    pause,
    seek,
    setPlayerVolume,
    toggleMute
  };
}

interface YouTubePlayerComponentProps {
  videoId: string | null;
  playerRef: React.MutableRefObject<YTPlayer | null>;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onReady?: () => void;
}

export function YouTubePlayerComponent({
  videoId,
  playerRef,
  isReady,
  setIsReady,
  setIsPlaying,
  onProgress,
  onEnded,
  onReady
}: YouTubePlayerComponentProps) {
  const playerId = 'youtube-player';
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(playerId, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: () => {
            setIsReady(true);
            onReady?.();
          },
          onStateChange: (event) => {
            const state = YOUTUBE_PLAYER_STATES[event.data];
            setIsPlaying(state === 'playing');

            if (state === 'playing') {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
              progressIntervalRef.current = setInterval(() => {
                if (playerRef.current && onProgress) {
                  onProgress(
                    playerRef.current.getCurrentTime(),
                    playerRef.current.getDuration()
                  );
                }
              }, 1000);
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
            }

            if (state === 'ended') {
              onEnded?.();
            }
          },
          onError: (event) => {
            console.error('YouTube Player Error:', event.data);
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT);
          initPlayer();
        }
      }, 100);

      return () => clearInterval(checkYT);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [videoId, playerRef, setIsReady, setIsPlaying, onProgress, onEnded, onReady]);

  return <div id={playerId} className="hidden" />;
}

export function VideoSearchInput({
  onVideoSelect,
  placeholder = "Вставьте ссылку YouTube или введите название..."
}: {
  onVideoSelect: (video: YouTubeVideo) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Check if it's a YouTube URL
    const videoId = extractVideoId(value);
    if (videoId) {
      setSuggestions([]);
      setShowSuggestions(false);
      onVideoSelect({
        id: videoId,
        title: 'Загрузка...',
        thumbnail: getThumbnail(videoId),
        duration: '',
        channel: ''
      });
      setInput('');
      return;
    }

    // Get suggestions
    if (value.length > 2) {
      // For simplicity, we'll just show the input as a search suggestion
      // In production, you'd use YouTube Data API
      setSuggestions([`Найти: ${value}`]);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = () => {
    if (input.trim()) {
      // For demo, we'll use a search URL approach
      // In production, you'd use YouTube Data API
      const searchQuery = encodeURIComponent(input);
      window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
    }
  };

  return (
    <div className="relative flex-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-full text-sm font-medium hover:bg-[var(--accent-secondary)] transition-colors"
        >
          🔍
        </button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg shadow-lg z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              onClick={() => {
                setInput(suggestion);
                setShowSuggestions(false);
                handleSearch();
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default YouTubePlayerComponent;
