'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  YouTubeVideo,
  getThumbnail as getYoutubeThumbnail,
  extractVideoId,
  YOUTUBE_PLAYER_STATES
} from '@/lib/youtube';
import {
  extractSoundCloudId,
  SoundCloudWidget
} from '@/lib/soundcloud';

// Unified Track type
export interface UnifiedTrack {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  durationMs: number;
  source: 'youtube' | 'soundcloud';
  sourceId: string;
  channel?: string;
  addedBy: string;
  addedAt: number;
}

interface UnifiedMusicPlayerProps {
  currentUserId: string;
  isPremium?: boolean;
  onPointsDeduct?: (points: number) => void;
}

// YouTube Player Types
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
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
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
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: Record<string, number>;
    };
    onYouTubeIframeAPIReady: () => void;
    SC: {
      Widget: new (iframe: HTMLIFrameElement | string) => SoundCloudWidget;
    };
  }
}

export function UnifiedMusicPlayer({ currentUserId, isPremium = false, onPointsDeduct }: UnifiedMusicPlayerProps) {
  // State
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<UnifiedTrack | null>(null);
  const [queueType, setQueueType] = useState<'free' | 'paid'>('free');
  const [source, setSource] = useState<'youtube' | 'soundcloud'>('youtube');
  const [showQueue, setShowQueue] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Refs
  const youtubePlayerRef = useRef<YTPlayer | null>(null);
  const soundcloudPlayerRef = useRef<SoundCloudWidget | null>(null);
  const soundcloudIframeRef = useRef<HTMLIFrameElement | null>(null);
  const youtubePlayerId = 'youtube-player-unified';
  const soundcloudPlayerId = 'soundcloud-player-unified';
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for callbacks to avoid dependency issues
  const tracksRef = useRef(tracks);
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Play track function (defined early)
  const playTrackRef = useRef<(track: UnifiedTrack) => void>(() => {});

  // Handle track end
  const handleTrackEnd = useCallback(() => {
    const currentIndex = tracksRef.current.findIndex(t => t.id === currentTrackRef.current?.id);
    if (currentIndex < tracksRef.current.length - 1) {
      const nextTrack = tracksRef.current[currentIndex + 1];
      playTrackRef.current(nextTrack);
      setTracks(prev => prev.filter(t => t.id !== currentTrackRef.current?.id));
    } else {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  }, []);

  // Initialize YouTube player
  const initYouTubePlayer = useCallback((videoId: string) => {
    const initPlayer = () => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
      }

      youtubePlayerRef.current = new window.YT.Player(youtubePlayerId, {
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
            console.log('YouTube ready');
          },
          onStateChange: (event) => {
            const state = YOUTUBE_PLAYER_STATES[event.data];
            setIsPlaying(state === 'playing');

            if (state === 'playing') {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
              progressIntervalRef.current = setInterval(() => {
                if (youtubePlayerRef.current) {
                  setCurrentTime(youtubePlayerRef.current.getCurrentTime());
                  setDuration(youtubePlayerRef.current.getDuration());
                }
              }, 1000);
            } else if (state === 'ended') {
              handleTrackEnd();
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
            }
          },
          onError: (e) => console.error('YouTube error:', e.data)
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
    }
  }, [handleTrackEnd]);

  // Play track implementation
  const playTrack = useCallback((track: UnifiedTrack) => {
    setCurrentTrack(track);
    setTracks(prev => prev.filter(t => t.id !== track.id));

    if (track.source === 'youtube') {
      initYouTubePlayer(track.sourceId);
      setTimeout(() => {
        youtubePlayerRef.current?.playVideo();
      }, 1000);
    } else if (track.source === 'soundcloud' && soundcloudPlayerRef.current) {
      soundcloudPlayerRef.current.load(track.sourceId, { auto_play: true });
    }

    setIsPlaying(true);
  }, [initYouTubePlayer]);

  // Update ref
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  // Load APIs
  useEffect(() => {
    // YouTube API
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(tag, firstScript);
    }

    // SoundCloud API
    if (typeof window !== 'undefined' && !window.SC) {
      const tag = document.createElement('script');
      tag.src = 'https://w.soundcloud.com/player/api.js';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(tag, firstScript);
    }
  }, []);

  // Initialize SoundCloud widget
  useEffect(() => {
    const initSoundCloud = () => {
      if (window.SC && soundcloudIframeRef.current) {
        soundcloudPlayerRef.current = new window.SC.Widget(soundcloudIframeRef.current);

        soundcloudPlayerRef.current.bind('ready', () => {
          console.log('SoundCloud ready');
        });

        soundcloudPlayerRef.current.bind('play', () => {
          setIsPlaying(true);
        });

        soundcloudPlayerRef.current.bind('pause', () => {
          setIsPlaying(false);
        });

        soundcloudPlayerRef.current.bind('finish', () => {
          handleTrackEnd();
        });

        soundcloudPlayerRef.current.bind('playProgress', (data: unknown) => {
          const progressData = data as { currentPosition: number };
          if (progressData?.currentPosition) {
            setCurrentTime(progressData.currentPosition / 1000);
          }
        });
      }
    };

    const checkSC = setInterval(() => {
      if (window.SC && soundcloudIframeRef.current) {
        clearInterval(checkSC);
        initSoundCloud();
      }
    }, 100);

    return () => clearInterval(checkSC);
  }, [handleTrackEnd]);

  // Controls
  const togglePlay = useCallback(() => {
    if (currentTrackRef.current?.source === 'youtube' && youtubePlayerRef.current) {
      if (isPlayingRef.current) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
    } else if (currentTrackRef.current?.source === 'soundcloud' && soundcloudPlayerRef.current) {
      soundcloudPlayerRef.current.toggle();
    }
    setIsPlaying(!isPlayingRef.current);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (currentTrackRef.current?.source === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    } else if (currentTrackRef.current?.source === 'soundcloud' && soundcloudPlayerRef.current) {
      soundcloudPlayerRef.current.seekTo(seconds * 1000);
      setCurrentTime(seconds);
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(newVolume);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (youtubePlayerRef.current) {
      if (isMuted) {
        youtubePlayerRef.current.unMute();
      } else {
        youtubePlayerRef.current.mute();
      }
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Add track from input
  const handleAddTrack = useCallback(() => {
    if (!inputValue.trim()) return;

    // Check YouTube
    const youtubeId = extractVideoId(inputValue);
    if (youtubeId) {
      const track: UnifiedTrack = {
        id: `yt-${youtubeId}-${Date.now()}`,
        title: 'Загрузка...',
        thumbnail: getYoutubeThumbnail(youtubeId),
        duration: '',
        durationMs: 0,
        source: 'youtube',
        sourceId: youtubeId,
        addedBy: currentUserId,
        addedAt: Date.now()
      };

      if (!currentTrackRef.current) {
        setCurrentTrack(track);
        initYouTubePlayer(youtubeId);
      } else {
        setTracks(prev => queueType === 'paid' ? [track, ...prev] : [...prev, track]);
        if (queueType === 'paid' && !isPremium && onPointsDeduct) {
          onPointsDeduct(10);
        }
      }

      setInputValue('');
      return;
    }

    // Check SoundCloud
    const soundcloudUrl = extractSoundCloudId(inputValue);
    if (soundcloudUrl) {
      const track: UnifiedTrack = {
        id: `sc-${Date.now()}`,
        title: 'SoundCloud трек',
        thumbnail: '/default-album.png',
        duration: '',
        durationMs: 0,
        source: 'soundcloud',
        sourceId: soundcloudUrl,
        addedBy: currentUserId,
        addedAt: Date.now()
      };

      if (!currentTrackRef.current) {
        setCurrentTrack(track);
        if (soundcloudPlayerRef.current) {
          soundcloudPlayerRef.current.load(soundcloudUrl, { auto_play: true });
        }
      } else {
        setTracks(prev => queueType === 'paid' ? [track, ...prev] : [...prev, track]);
        if (queueType === 'paid' && !isPremium && onPointsDeduct) {
          onPointsDeduct(10);
        }
      }

      setInputValue('');
      return;
    }

    // Search
    const searchQuery = encodeURIComponent(inputValue);
    if (source === 'youtube') {
      window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
    } else {
      window.open(`https://soundcloud.com/search?q=${searchQuery}`, '_blank');
    }
  }, [inputValue, queueType, isPremium, onPointsDeduct, currentUserId, initYouTubePlayer, source]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="unified-music-player">
      {/* Hidden players */}
      <div id={youtubePlayerId} style={{ display: 'none' }} />
      <iframe
        ref={soundcloudIframeRef}
        id={soundcloudPlayerId}
        src="https://w.soundcloud.com/player/?url=https://soundcloud.com/"
        style={{ display: 'none' }}
        allow="autoplay"
      />

      {/* Main UI */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-light)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Музыка</h3>

          {/* Source toggle */}
          <div className="flex gap-1 bg-[var(--bg-tertiary)] rounded-full p-1">
            <button
              onClick={() => setSource('youtube')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                source === 'youtube'
                  ? 'bg-red-500 text-white'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              YouTube
            </button>
            <button
              onClick={() => setSource('soundcloud')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                source === 'soundcloud'
                  ? 'bg-orange-500 text-white'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              SoundCloud
            </button>
          </div>
        </div>

        {/* Queue type toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setQueueType('free')}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              queueType === 'free'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
          >
            Бесплатно
          </button>
          <button
            onClick={() => setQueueType('paid')}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              queueType === 'paid'
                ? 'bg-gradient-to-r from-[var(--accent-love)] to-purple-500 text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
          >
            💎 Приоритет (10)
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
            placeholder={
              source === 'youtube'
                ? 'Вставьте ссылку YouTube...'
                : 'Вставьте ссылку SoundCloud...'
            }
            className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-full text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
          <button
            onClick={handleAddTrack}
            className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-full text-sm font-medium hover:bg-[var(--accent-secondary)] transition-colors"
          >
            ➕
          </button>
        </div>

        {/* Current Track */}
        {currentTrack && (
          <div className="mt-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><circle cx="50" cy="50" r="25" fill="%23555"/></svg>';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {currentTrack.title}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    currentTrack.source === 'youtube' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {currentTrack.source === 'youtube' ? 'YT' : 'SC'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div
                className="h-2 bg-[var(--border-light)] rounded-full cursor-pointer overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seekTo(percent * duration);
                }}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    currentTrack.source === 'youtube'
                      ? 'bg-gradient-to-r from-red-500 to-red-400'
                      : 'bg-gradient-to-r from-orange-500 to-orange-400'
                  }`}
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => seekTo(Math.max(0, currentTime - 10))}
                className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
              >
                ⏪
              </button>
              <button
                onClick={togglePlay}
                className={`w-14 h-14 flex items-center justify-center rounded-full text-white text-xl transition-colors ${
                  currentTrack.source === 'youtube'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
              </button>
              <button
                onClick={() => seekTo(Math.min(duration, currentTime + 10))}
                className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
              >
                ⏩
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={toggleMute} className="text-[var(--text-secondary)] text-lg">
                {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="flex-1 h-2 accent-[var(--accent-primary)] cursor-pointer"
              />
              <span className="text-xs text-[var(--text-muted)] w-8">{volume}%</span>
            </div>
          </div>
        )}

        {/* Queue */}
        {tracks.length > 0 && (
          <>
            <button
              onClick={() => setShowQueue(!showQueue)}
              className="w-full mt-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              📋 Очередь ({tracks.length} треков) {showQueue ? '▲' : '▼'}
            </button>

            {showQueue && (
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-lg"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><circle cx="50" cy="50" r="25" fill="%23555"/></svg>';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {track.title}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        track.source === 'youtube' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {track.source === 'youtube' ? 'YT' : 'SC'}
                      </span>
                    </div>
                    <button
                      onClick={() => playTrack(track)}
                      className="w-8 h-8 flex items-center justify-center text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <button
                      onClick={() => setTracks(prev => prev.filter(t => t.id !== track.id))}
                      className="w-8 h-8 flex items-center justify-center text-[var(--accent-danger)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!currentTrack && tracks.length === 0 && (
          <div className="mt-4 text-center py-6 text-[var(--text-muted)]">
            <div className="flex justify-center gap-3 mb-2">
              <span className="w-6 h-6 rounded-full bg-red-500"></span>
              <span className="w-6 h-6 rounded-full bg-orange-500"></span>
            </div>
            <p className="text-sm">Вставьте ссылку на музыку</p>
            <p className="text-xs mt-1">YouTube или SoundCloud</p>
          </div>
        )}

        {/* Help */}
        <div className="mt-3 text-xs text-[var(--text-muted)] text-center">
          <p>YouTube: youtube.com/watch?v=... или youtu.be/...</p>
          <p>SoundCloud: soundcloud.com/artist/track</p>
        </div>
      </div>
    </div>
  );
}

export default UnifiedMusicPlayer;
