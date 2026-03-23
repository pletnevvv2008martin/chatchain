'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { YouTubeVideo, formatDuration, getThumbnail } from '@/lib/youtube';
import {
  YouTubePlayerComponent,
  useYouTubePlayer,
  VideoSearchInput
} from './YouTubePlayer';

interface Track extends YouTubeVideo {
  addedBy: string;
  addedAt: number;
}

interface MusicPlayerProps {
  currentUserId: string;
  isPremium?: boolean;
  onPointsDeduct?: (points: number) => void;
}

export function MusicPlayer({ currentUserId, isPremium = false, onPointsDeduct }: MusicPlayerProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queueType, setQueueType] = useState<'free' | 'paid'>('free');
  const [showQueue, setShowQueue] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const {
    playerRef,
    isReady,
    isPlaying,
    volume,
    isMuted,
    setIsReady,
    setIsPlaying,
    play,
    pause,
    seek,
    setPlayerVolume,
    toggleMute
  } = useYouTubePlayer();

  const handleProgress = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  const handleTrackEnd = useCallback(() => {
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1];
      setCurrentTrack(nextTrack);
      setTracks(prev => prev.filter(t => t.id !== currentTrack?.id));
    } else {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  }, [tracks, currentTrack, setIsPlaying]);

  const handleVideoSelect = useCallback((video: YouTubeVideo) => {
    const track: Track = {
      ...video,
      addedBy: currentUserId,
      addedAt: Date.now()
    };

    if (!currentTrack) {
      setCurrentTrack(track);
    } else {
      setTracks(prev => [...prev, track]);
    }
  }, [currentTrack, currentUserId]);

  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setTracks(prev => prev.filter(t => t.id !== track.id));
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const addToPremiumQueue = useCallback((video: YouTubeVideo) => {
    if (!isPremium && onPointsDeduct) {
      onPointsDeduct(10); // 10 points for premium queue
    }
    const track: Track = {
      ...video,
      addedBy: currentUserId,
      addedAt: Date.now()
    };
    setTracks(prev => [track, ...prev]); // Add to front for premium
  }, [currentUserId, isPremium, onPointsDeduct]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="music-player">
      {/* Hidden YouTube Player */}
      <YouTubePlayerComponent
        videoId={currentTrack?.id || null}
        playerRef={playerRef}
        isReady={isReady}
        setIsReady={setIsReady}
        setIsPlaying={setIsPlaying}
        onProgress={handleProgress}
        onEnded={handleTrackEnd}
      />

      {/* Main Player UI */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-light)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">🎵 Музыка</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setQueueType('free')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                queueType === 'free'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}
            >
              Бесплатно
            </button>
            <button
              onClick={() => setQueueType('paid')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                queueType === 'paid'
                  ? 'bg-gradient-to-r from-[var(--accent-love)] to-purple-500 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}
            >
              💎 Премиум
            </button>
          </div>
        </div>

        {/* Search Input */}
        <VideoSearchInput
          onVideoSelect={queueType === 'paid' ? addToPremiumQueue : handleVideoSelect}
          placeholder={queueType === 'paid'
            ? "💎 Добавить в приоритет (10 баллов)..."
            : "Вставьте ссылку YouTube..."
          }
        />

        {/* Current Track */}
        {currentTrack && (
          <div className="mt-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div
                className="h-1 bg-[var(--border-light)] rounded-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seek(percent * duration);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={() => seek(Math.max(0, currentTime - 10))}
                className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ⏪
              </button>
              <button
                onClick={isPlaying ? pause : play}
                className="w-12 h-12 flex items-center justify-center bg-[var(--accent-primary)] text-white rounded-full hover:bg-[var(--accent-secondary)] transition-colors"
              >
                {isPlaying ? '⏸' : '▶️'}
              </button>
              <button
                onClick={() => seek(Math.min(duration, currentTime + 10))}
                className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ⏩
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={toggleMute} className="text-[var(--text-secondary)]">
                {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setPlayerVolume(parseInt(e.target.value));
                }}
                className="flex-1 h-1 accent-[var(--accent-primary)]"
              />
              <span className="text-xs text-[var(--text-muted)] w-8">{volume}%</span>
            </div>
          </div>
        )}

        {/* Queue Toggle */}
        {tracks.length > 0 && (
          <>
            <button
              onClick={() => setShowQueue(!showQueue)}
              className="w-full mt-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              📋 Очередь ({tracks.length} треков) {showQueue ? '▲' : '▼'}
            </button>

            {/* Queue List */}
            {showQueue && (
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {tracks.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-lg"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {track.title}
                      </p>
                    </div>
                    <button
                      onClick={() => playTrack(track)}
                      className="w-8 h-8 flex items-center justify-center text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={() => removeTrack(track.id)}
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
            <p className="text-3xl mb-2">🎵</p>
            <p className="text-sm">Вставьте ссылку на YouTube</p>
            <p className="text-xs mt-1">или найдите музыку через поиск</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
