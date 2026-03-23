import { NextRequest, NextResponse } from 'next/server';

interface Track {
  id: string; title: string; thumbnail: string; duration: string; durationMs: number;
  source: 'youtube' | 'soundcloud'; sourceId: string; addedBy: string; addedByName: string;
  addedAt: number; likes?: number; likedBy?: string[];
}

interface MusicState {
  currentTrack: Track | null; queue: Track[]; isPlaying: boolean; currentTime: number;
  startTime: number; volume: number; djUserId: string | null; lastUpdate: number;
  heartEvent?: { timestamp: number; count: number } | null;
}

declare global { var musicState: MusicState | undefined; }

if (!globalThis.musicState) {
  globalThis.musicState = {
    currentTrack: null, queue: [], isPlaying: false, currentTime: 0,
    startTime: Date.now(), volume: 100, djUserId: null, lastUpdate: Date.now(), heartEvent: null,
  };
}

const getMusicState = (): MusicState => globalThis.musicState!;
const updateMusicState = (updates: Partial<MusicState>) => {
  if (globalThis.musicState) {
    globalThis.musicState = { ...globalThis.musicState, ...updates, lastUpdate: Date.now() };
  }
};

export async function GET() {
  const state = getMusicState();
  let currentProgress = state.currentTime;
  const now = Date.now();

  // Если играет - вычисляем текущую позицию
  if (state.isPlaying && state.currentTrack) {
    currentProgress = state.currentTime + (now - state.startTime) / 1000;
  }

  let heartEvent = state.heartEvent;
  if (heartEvent && now - heartEvent.timestamp > 3000) {
    heartEvent = null;
    updateMusicState({ heartEvent: null });
  }

  return NextResponse.json({
    success: true, state: {
      currentTrack: state.currentTrack,
      queue: state.queue,
      isPlaying: state.isPlaying,
      currentTime: currentProgress,
      volume: state.volume,
      djUserId: state.djUserId,
      lastUpdate: now, // Возвращаем текущее время для синхронизации
      heartEvent,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, userName, track, trackId, time, volume } = body;
    const state = getMusicState();

    switch (action) {
      case 'add_track':
        if (!track) return NextResponse.json({ success: false, error: 'No track' }, { status: 400 });
        const newTrack: Track = { ...track, addedBy: userId, addedByName: userName || 'Unknown', addedAt: Date.now(), likes: 0, likedBy: [] };
        if (!state.currentTrack) {
          updateMusicState({ currentTrack: newTrack, isPlaying: true, currentTime: 0, startTime: Date.now(), djUserId: userId });
        } else {
          updateMusicState({ queue: [...state.queue, newTrack] });
        }
        return NextResponse.json({ success: true, state: getMusicState() });

      case 'like_track':
        if (!state.currentTrack) return NextResponse.json({ success: false, error: 'No track' }, { status: 400 });
        const t = state.currentTrack;
        const alreadyLiked = t.likedBy?.includes(userId) || false;
        if (alreadyLiked) {
          t.likedBy = (t.likedBy || []).filter(id => id !== userId);
          t.likes = Math.max(0, (t.likes || 0) - 1);
        } else {
          t.likedBy = [...(t.likedBy || []), userId];
          t.likes = (t.likes || 0) + 1;
          updateMusicState({ heartEvent: { timestamp: Date.now(), count: 8 + Math.floor(Math.random() * 8) } });
        }
        updateMusicState({ currentTrack: t });
        return NextResponse.json({ success: true, state: getMusicState(), liked: !alreadyLiked, likes: t.likes });

      case 'play':
        // При возобновлении - обновляем startTime с текущим currentTime
        const playState = getMusicState();
        updateMusicState({
          isPlaying: true,
          startTime: Date.now(),
          currentTime: playState.currentTime, // Сохраняем текущую позицию
          djUserId: userId
        });
        console.log('▶️ Play: currentTime=', playState.currentTime);
        return NextResponse.json({ success: true, state: getMusicState() });

      case 'pause':
        // При паузе - вычисляем точную позицию
        let pausedTime = state.currentTime;
        if (state.isPlaying) {
          pausedTime = state.currentTime + (Date.now() - state.startTime) / 1000;
        }
        console.log('⏸️ Pause: pausedTime=', pausedTime);
        updateMusicState({
          isPlaying: false,
          currentTime: pausedTime,
          djUserId: userId
        });
        return NextResponse.json({ success: true, state: getMusicState() });

      case 'seek':
        if (typeof time === 'number') updateMusicState({ currentTime: time, startTime: Date.now(), djUserId: userId });
        return NextResponse.json({ success: true, state: getMusicState() });

      case 'next':
        if (state.queue.length > 0) {
          updateMusicState({ currentTrack: state.queue[0], queue: state.queue.slice(1), isPlaying: true, currentTime: 0, startTime: Date.now(), djUserId: userId });
        } else {
          updateMusicState({ currentTrack: null, isPlaying: false, currentTime: 0, djUserId: userId });
        }
        return NextResponse.json({ success: true, state: getMusicState() });

      case 'remove':
        if (trackId && state.currentTrack?.id === trackId) {
          if (state.queue.length > 0) {
            updateMusicState({ currentTrack: state.queue[0], queue: state.queue.slice(1), isPlaying: true, currentTime: 0, startTime: Date.now() });
          } else {
            updateMusicState({ currentTrack: null, isPlaying: false, currentTime: 0 });
          }
        }
        return NextResponse.json({ success: true, state: getMusicState() });

      case 'track_ended':
        if (state.queue.length > 0) {
          updateMusicState({ currentTrack: state.queue[0], queue: state.queue.slice(1), isPlaying: true, currentTime: 0, startTime: Date.now() });
        } else {
          updateMusicState({ currentTrack: null, isPlaying: false, currentTime: 0 });
        }
        return NextResponse.json({ success: true, state: getMusicState() });

      default:
        return NextResponse.json({ success: false, error: 'Unknown' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}