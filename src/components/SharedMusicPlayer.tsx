'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SharedTrack {
  id: string; title: string; thumbnail: string; source: 'youtube'; sourceId: string;
  addedBy: string; addedByName: string; addedAt: number; likes?: number; likedBy?: string[];
}

interface MusicState {
  currentTrack: SharedTrack | null; queue: SharedTrack[]; isPlaying: boolean;
  currentTime: number; djUserId: string | null; lastUpdate: number;
  heartEvent?: { timestamp: number; count: number } | null;
}

interface SharedMusicPlayerProps { currentUserId: string; currentUserName: string; mode?: 'full' | 'mobile'; }

interface YTPlayer {
  playVideo: () => void; pauseVideo: () => void; seekTo: (s: number, a?: boolean) => void;
  getDuration: () => number; getCurrentTime: () => number; getPlayerState: () => number; destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (id: string, config: {
        height: string; width: string; videoId: string; playerVars?: Record<string, number>;
        events?: { onReady?: (e: { target: YTPlayer }) => void; onStateChange?: (e: { data: number; target: YTPlayer }) => void; };
      }) => YTPlayer;
      PlayerState: Record<string, number>;
    };
  }
}

let globalPlayer: YTPlayer | null = null;
const ADMIN_IDS = ['user-1'];
const ADMIN_NAMES = ['Гость_8000'];

export function SharedMusicPlayer({ currentUserId, currentUserName, mode = 'full' }: SharedMusicPlayerProps) {
  const [serverState, setServerState] = useState<MusicState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [playerReady, setPlayerReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch(`/api/moderation?action=check_status&userId=${currentUserId}`);
        const data = await res.json();
        setIsAdmin(data.role === 'admin');
      } catch { setIsAdmin(ADMIN_IDS.includes(currentUserId)); }
    };
    checkAdmin();
  }, [currentUserId]);

  const isDj = isAdmin || serverState?.djUserId === currentUserId || serverState?.currentTrack?.addedBy === currentUserId;

  useEffect(() => {
    if (typeof window === 'undefined' || window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }, []);

  const syncWithServer = useCallback(async () => {
    try {
      const response = await fetch('/api/music');
      const data = await response.json();
      if (data.success) setServerState(data.state);
    } catch {}
  }, []);

  useEffect(() => {
    syncWithServer();
    syncIntervalRef.current = setInterval(syncWithServer, 2000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [syncWithServer]);

  const sendAction = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: currentUserId, userName: currentUserName, ...data }),
      });
      setTimeout(syncWithServer, 100);
    } catch {}
  }, [currentUserId, currentUserName, syncWithServer]);

  useEffect(() => {
    if (!serverState?.currentTrack) return;
    const videoId = serverState.currentTrack.sourceId;
    if (currentVideoIdRef.current === videoId && playerRef.current) return;
    currentVideoIdRef.current = videoId;

    const initPlayer = () => {
      if (globalPlayer) { try { globalPlayer.destroy(); } catch {} globalPlayer = null; }
      const container = document.getElementById('yt-player-hidden');
      if (!container) return;
      const newId = `yt-hidden-${Date.now()}`;
      container.innerHTML = `<div id="${newId}" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;"></div>`;
      try {
        const player = new window.YT.Player(newId, {
          height: '1', width: '1', videoId,
          playerVars: { autoplay: 0, controls: 0 },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
              globalPlayer = event.target;
              setPlayerReady(true);
              if (serverState.currentTime > 0) event.target.seekTo(serverState.currentTime, true);
              if (serverState.isPlaying) event.target.playVideo();
              if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
              timeIntervalRef.current = setInterval(() => {
                if (playerRef.current) {
                  setLocalTime(playerRef.current.getCurrentTime());
                  setDuration(playerRef.current.getDuration());
                }
              }, 1000);
            },
            onStateChange: (event) => { if (event.data === 0) sendAction('track_ended'); },
          },
        });
      } catch {}
    };

    if (window.YT?.Player) initPlayer();
    else {
      const check = setInterval(() => { if (window.YT?.Player) { clearInterval(check); initPlayer(); } }, 100);
    }
    return () => { if (timeIntervalRef.current) clearInterval(timeIntervalRef.current); };
  }, [serverState?.currentTrack?.id, sendAction, serverState?.currentTime, serverState?.isPlaying]);

  useEffect(() => {
    if (!playerRef.current || !playerReady) return;
    if (serverState?.isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [serverState?.isPlaying, playerReady]);

  const handleAddTrack = useCallback(async () => {
    if (!inputValue.trim()) return;
    const match = inputValue.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) { alert('Введите ссылку YouTube'); return; }
    const videoId = match[1];
    setIsLoading(true);
    try {
      let title = 'YouTube Video';
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (res.ok) { const data = await res.json(); title = data.title || title; }
      } catch {}
      await sendAction('add_track', {
        track: {
          id: `yt-${videoId}-${Date.now()}`, title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          source: 'youtube', sourceId: videoId, addedBy: currentUserId, addedByName: currentUserName, addedAt: Date.now(),
        }
      });
      setInputValue('');
    } finally { setIsLoading(false); }
  }, [inputValue, currentUserId, currentUserName, sendAction]);

  const handlePlayPause = useCallback(() => {
    if (!isDj) return;
    sendAction(serverState?.isPlaying ? 'pause' : 'play');
  }, [serverState?.isPlaying, sendAction, isDj]);

  const handleNext = useCallback(() => {
    if (!isDj) return;
    sendAction('next');
  }, [sendAction, isDj]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration === 0 || !isDj) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const time = ((e.clientX - rect.left) / rect.width) * duration;
    playerRef.current.seekTo(time, true);
    sendAction('seek', { time });
    setLocalTime(time);
  }, [duration, sendAction, isDj]);

  useEffect(() => {
    if (serverState?.currentTrack) {
      const track = serverState.currentTrack;
      setLiked(track.likedBy?.includes(currentUserId) || false);
      setLikesCount(track.likes || 0);
    }
  }, [serverState?.currentTrack, currentUserId]);

  const handleLike = useCallback(async () => {
    if (isLiking || !serverState?.currentTrack) return;
    setIsLiking(true);
    try {
      const res = await fetch('/api/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like_track', userId: currentUserId }),
      });
      const data = await res.json();
      if (data.success) { setLiked(data.liked); setLikesCount(data.likes); }
    } finally { setIsLiking(false); }
  }, [currentUserId, isLiking, serverState?.currentTrack]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const progress = duration > 0 ? (localTime / duration) * 100 : 0;

  if (mode === 'mobile' && isMinimized && serverState?.currentTrack) {
    return (
      <div className="music-bar" onClick={() => setIsMinimized(false)}>
        <img src={serverState.currentTrack.thumbnail} alt="" className="music-bar-thumb" />
        <div className="music-bar-info">
          <div className="music-bar-title">{serverState.currentTrack.title}</div>
          <div className="music-bar-artist">YouTube • {serverState.currentTrack.addedByName}</div>
        </div>
        <button className={`music-bar-btn ${!isDj ? 'disabled' : ''}`} onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} disabled={!isDj}>
          {serverState.isPlaying ? '⏸' : '▶'}
        </button>
        <div className="music-bar-progress" style={{ width: `${progress}%` }} />
      </div>
    );
  }

  return (
    <div className={`music-player-spotify ${mode === 'mobile' ? 'mobile-spotify' : ''}`}>
      <div id="yt-player-hidden" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      {mode === 'mobile' && <button className="spotify-close" onClick={() => setIsMinimized(true)}>✕</button>}
      
      <div className="spotify-artwork">
        {serverState?.currentTrack ? (
          <img src={serverState.currentTrack.thumbnail} alt={serverState.currentTrack.title} className={`spotify-cover ${serverState.isPlaying ? 'playing' : ''}`} />
        ) : (
          <div className="spotify-cover-empty"><span>🎵</span></div>
        )}
        {serverState?.isPlaying && (
          <div className="spotify-playing-indicator">
            <div className="playing-bars">{[1,2,3,4].map(i => <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
          </div>
        )}
      </div>

      <div className="spotify-info">
        <h3 className="spotify-title">{serverState?.currentTrack?.title || 'Нет воспроизведения'}</h3>
        <p className="spotify-artist">
          {serverState?.currentTrack ? (
            <><span className="spotify-source">YouTube</span><span className="spotify-dot">•</span><span>Добавил: {serverState.currentTrack.addedByName}</span></>
          ) : 'Добавьте музыку'}
        </p>
      </div>

      <div className="spotify-progress">
        <span className="spotify-time">{formatTime(localTime)}</span>
        <div className={`spotify-progress-bar ${!isDj ? 'disabled' : ''}`} onClick={handleSeek} title={isDj ? 'Перемотка' : 'Только DJ'}>
          <div className="spotify-progress-fill" style={{ width: `${progress}%` }} />
          <div className="spotify-progress-thumb" style={{ left: `${progress}%` }} />
        </div>
        <span className="spotify-time">{formatTime(duration)}</span>
      </div>

      {serverState?.currentTrack && (
        <div className="spotify-likes">
          <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={handleLike} disabled={isLiking}>
            <span className="like-heart">{liked ? '❤️' : '🤍'}</span>
          </button>
          <span className="likes-count">{likesCount}</span>
        </div>
      )}

      <div className="spotify-controls">
        <button className="spotify-btn secondary" onClick={() => setShowQueue(!showQueue)} title="Очередь">📋</button>
        <button className={`spotify-btn primary ${!isDj ? 'disabled' : ''}`} onClick={handlePlayPause} title={isDj ? 'Play/Pause' : 'Только DJ'}>
          {serverState?.isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <button className={`spotify-btn secondary ${!isDj ? 'disabled' : ''}`} onClick={handleNext} title={isDj ? 'Следующий' : 'Только DJ'}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 18l8.5-6L6 6v12zm8.5-6v6h2V6h-2v6z" /></svg>
        </button>
      </div>

      {showQueue && (
        <div className="spotify-queue">
          <div className="queue-header-spotify"><h4>Очередь</h4><button onClick={() => setShowQueue(false)}>✕</button></div>
          {serverState?.queue && serverState.queue.length > 0 ? (
            <div className="queue-list-spotify">
              {serverState.queue.map((track, i) => (
                <div key={track.id} className="queue-item-spotify">
                  <span className="queue-num-spotify">{i + 1}</span>
                  <img src={track.thumbnail} alt="" className="queue-thumb-spotify" />
                  <div className="queue-info-spotify">
                    <span className="queue-title-spotify">{track.title}</span>
                    <span className="queue-added-spotify">{track.addedByName}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="queue-empty-spotify">Очередь пуста</div>}
        </div>
      )}

      <div className="spotify-add">
        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()} placeholder="Вставьте ссылку YouTube..." className="spotify-input" />
        <button className="spotify-add-btn" onClick={handleAddTrack} disabled={isLoading}>{isLoading ? '⏳' : '+'}</button>
      </div>

      {serverState?.currentTrack && (
        <div className="spotify-dj">
          <span className="dj-avatar">🎧</span>
          <span>DJ: <strong>{serverState.currentTrack.addedByName}</strong></span>
          {serverState.djUserId === currentUserId && <span className="dj-crown">👑</span>}
          {isAdmin && <span className="admin-badge-music" title="Админ">🛡️ Админ</span>}
        </div>
      )}
    </div>
  );
}

export default SharedMusicPlayer;
