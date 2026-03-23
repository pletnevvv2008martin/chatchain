'use client';

import { Room, User } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageContext';

interface RoomsSidebarProps {
  rooms: Room[];
  currentRoomId: string;
  user: User;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export default function RoomsSidebar({
  rooms,
  currentRoomId,
  user,
  onJoinRoom,
  onCreateRoom,
}: RoomsSidebarProps) {
  const { t } = useLanguage();
  const lobbies = rooms.filter(r => r.isLobby).sort((a, b) => (a.lobbyNumber || 0) - (b.lobbyNumber || 0));
  const privateRooms = rooms.filter(r => !r.isLobby);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'guest': return t('guest');
      case 'participant': return t('participant');
      case 'king': return t('king');
      case 'legend': return t('legend');
      default: return status;
    }
  };

  return (
    <div className="rooms-sidebar">
      <div className="rooms-header">
        <h3>💬 {t('rooms')}</h3>
        <button className="create-room-btn" onClick={onCreateRoom}>
          ➕ {t('create')}
        </button>
      </div>

      <div className="rooms-section">
        <h4 className="rooms-section-title">🌐 {t('publicChats')}</h4>
        <div className="rooms-list">
          {lobbies.map((lobby) => (
            <div
              key={lobby.id}
              className={`room-item ${currentRoomId === lobby.id ? 'active' : ''}`}
              onClick={() => onJoinRoom(lobby.id)}
            >
              <div className="room-icon">🌐</div>
              <div className="room-info">
                <span className="room-name">{t('publicChat')} #{lobby.lobbyNumber || 1}</span>
                <span className="room-users">{lobby.users.length}/100</span>
              </div>
              {currentRoomId === lobby.id && <span className="active-indicator">●</span>}
            </div>
          ))}
        </div>
      </div>

      {privateRooms.length > 0 && (
        <div className="rooms-section">
          <h4 className="rooms-section-title">🔒 {t('privateRooms')}</h4>
          <div className="rooms-list">
            {privateRooms.map((room) => (
              <div
                key={room.id}
                className={`room-item ${currentRoomId === room.id ? 'active' : ''}`}
                onClick={() => onJoinRoom(room.id)}
              >
                <div className="room-icon">{room.password ? '🔐' : '🔓'}</div>
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-users">{room.users.length}/{room.maxUsers}</span>
                </div>
                {currentRoomId === room.id && <span className="active-indicator">●</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="user-card">
        <div className="user-avatar">
          {user.status === 'legend' && <span className="status-badge legend">🏆</span>}
          {user.status === 'king' && <span className="status-badge king">👑</span>}
          {user.status === 'participant' && <span className="status-badge participant">⭐</span>}
        </div>
        <div className="user-details">
          <span className="user-name">{user.nickname}</span>
          <span className="user-status">{getStatusText(user.status)}</span>
        </div>
        <div className="user-points">
          💎 {user.points}
        </div>
      </div>
    </div>
  );
}
