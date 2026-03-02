'use client';

import { useState, useEffect, useCallback } from 'react';

interface ModUser {
  id: string; name: string; status: 'online' | 'offline' | 'banned' | 'muted';
  role: 'user' | 'moderator' | 'admin'; lastSeen: number; warnings: number; joinTime: number;
}

interface ModAction {
  id: string; type: string; userId: string; userName: string; modId: string;
  modName: string; reason: string; timestamp: number; duration?: string;
}

interface MusicState {
  currentTrack: { id: string; title: string; addedByName: string; addedBy: string } | null;
  isPlaying: boolean; queue: { id: string; title: string; addedByName: string }[];
}

interface AdminPanelProps {
  currentUserId: string; currentUserRole: 'user' | 'moderator' | 'admin'; onClose: () => void;
}

export default function AdminPanel({ currentUserId, currentUserRole, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'actions' | 'music' | 'settings'>('users');
  const [users, setUsers] = useState<ModUser[]>([]);
  const [actions, setActions] = useState<ModAction[]>([]);
  const [musicState, setMusicState] = useState<MusicState | null>(null);
  const [selectedUser, setSelectedUser] = useState<ModUser | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = currentUserRole === 'admin';
  const isModerator = currentUserRole === 'moderator' || isAdmin;

  const loadData = useCallback(async () => {
    try {
      const usersRes = await fetch('/api/moderation?action=get_users');
      const usersData = await usersRes.json();
      if (usersData.success) setUsers(usersData.users);

      const logsRes = await fetch('/api/moderation?action=get_logs');
      const logsData = await logsRes.json();
      if (logsData.success) setActions(logsData.logs);

      const musicRes = await fetch('/api/music');
      const musicData = await musicRes.json();
      if (musicData.success) setMusicState(musicData.state);
    } catch {}
  }, []);

  useEffect(() => { loadData(); const i = setInterval(loadData, 3000); return () => clearInterval(i); }, [loadData]);

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const performAction = async (type: string, user: ModUser, reason?: string) => {
    if (!reason && (type === 'ban' || type === 'mute')) { alert('Укажите причину'); return; }
    setIsLoading(true);
    try {
      await fetch('/api/moderation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type, targetUserId: user.id, targetUserName: user.name, modId: currentUserId, modName: 'Admin', reason: reason || '', duration: banDuration }),
      });
      await loadData();
      setSelectedUser(null); setActionReason('');
    } finally { setIsLoading(false); }
  };

  const changeRole = async (userId: string, newRole: 'user' | 'moderator') => {
    setIsLoading(true);
    try {
      await fetch('/api/moderation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_role', targetUserId: userId, modId: currentUserId, modName: 'Admin', newRole }),
      });
      await loadData();
    } finally { setIsLoading(false); }
  };

  const musicAction = async (action: string, data?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      await fetch('/api/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: currentUserId, userName: 'Admin', ...data }),
      });
      await loadData();
    } finally { setIsLoading(false); }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const getStatusColor = (s: string) => ({ online: '#22c55e', offline: '#6b7280', banned: '#ef4444', muted: '#f59e0b' }[s] || '#6b7280');
  const getRoleBadge = (r: string) => ({ admin: { text: 'Админ', color: '#ec4899' }, moderator: { text: 'Модер', color: '#8b5cf6' }, user: { text: 'Пользователь', color: '#6b7280' } }[r]);

  if (!isModerator) {
    return (
      <div className="admin-panel-overlay" onClick={onClose}>
        <div className="admin-panel" onClick={e => e.stopPropagation()}>
          <div className="admin-header"><h2>🔒 Доступ запрещен</h2><button className="admin-close" onClick={onClose}>✕</button></div>
          <div className="admin-no-access"><p>У вас нет прав для доступа к этой панели</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        <div className="admin-header">
          <h2>🛡️ Панель управления</h2>
          <div className="admin-role-badge" style={{ background: getRoleBadge(currentUserRole)?.color }}>{getRoleBadge(currentUserRole)?.text}</div>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Пользователи</button>
          <button className={`admin-tab ${activeTab === 'music' ? 'active' : ''}`} onClick={() => setActiveTab('music')}>🎵 Музыка</button>
          <button className={`admin-tab ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>📋 Логи</button>
        </div>
        <div className="admin-search">
          <input type="text" placeholder="🔍 Поиск..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="admin-content">
          {activeTab === 'users' && (
            <div className="admin-users-list">
              {filteredUsers.length === 0 ? <div className="admin-empty"><p>👥 Пусто</p></div> : filteredUsers.map(user => (
                <div key={user.id} className="admin-user-card">
                  <div className="admin-user-info">
                    <div className="admin-user-avatar" style={{ borderColor: getStatusColor(user.status) }}>{user.name[0].toUpperCase()}</div>
                    <div className="admin-user-details">
                      <span className="admin-user-name">{user.name}</span>
                      <div className="admin-user-meta">
                        <span className="admin-user-status" style={{ color: getStatusColor(user.status) }}>
                          {user.status === 'online' ? '🟢' : user.status === 'banned' ? '🔴 Забанен' : user.status === 'muted' ? '🟡 Заглушен' : '⚫'}
                        </span>
                        {user.warnings > 0 && <span className="admin-warnings">⚠️ {user.warnings}</span>}
                      </div>
                    </div>
                    <span className="admin-role-label" style={{ background: getRoleBadge(user.role)?.color }}>{getRoleBadge(user.role)?.text}</span>
                  </div>
                  {user.role !== 'admin' && (
                    <div className="admin-user-actions">
                      {user.status !== 'banned' && <button className="admin-action-btn ban" onClick={() => setSelectedUser(user)} title="Бан">🚫</button>}
                      {user.status === 'banned' && <button className="admin-action-btn unban" onClick={() => performAction('unban', user, 'Разбан')} title="Разбан">✅</button>}
                      {user.status !== 'muted' && user.status !== 'banned' && <button className="admin-action-btn mute" onClick={() => performAction('mute', user, 'Нарушение')} title="Мут">🔇</button>}
                      {user.status === 'muted' && <button className="admin-action-btn unmute" onClick={() => performAction('unmute', user, 'Размут')} title="Размут">🔊</button>}
                      <button className="admin-action-btn warn" onClick={() => performAction('warn', user, 'Предупреждение')} title="Пред">⚠️</button>
                      {isAdmin && user.role === 'user' && <button className="admin-action-btn mod" onClick={() => changeRole(user.id, 'moderator')} title="Модератор">🛡️</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {activeTab === 'music' && (
            <div className="admin-music-panel">
              <h3>🎵 Управление музыкой</h3>
              {musicState?.currentTrack ? (
                <div className="admin-current-track">
                  <h4>{musicState.currentTrack.title}</h4>
                  <p>🎧 DJ: {musicState.currentTrack.addedByName}</p>
                  <div className="admin-track-controls">
                    <button className="admin-music-btn" onClick={() => musicAction(musicState.isPlaying ? 'pause' : 'play')}>{musicState.isPlaying ? '⏸ Пауза' : '▶️ Играть'}</button>
                    <button className="admin-music-btn danger" onClick={() => musicAction('next')}>⏭️ Следующий</button>
                  </div>
                </div>
              ) : <div className="admin-no-track"><p>🔇 Ничего не играет</p></div>}
            </div>
          )}
          {activeTab === 'actions' && (
            <div className="admin-logs">
              {actions.length === 0 ? <div className="admin-empty"><p>📋 Пусто</p></div> : actions.map(a => (
                <div key={a.id} className="admin-log-item">
                  <span className="admin-log-icon">{a.type === 'ban' ? '🚫' : a.type === 'mute' ? '🔇' : a.type === 'warn' ? '⚠️' : '📋'}</span>
                  <div className="admin-log-content">
                    <div className="admin-log-main"><strong>{a.modName}</strong> → <strong>{a.userName}</strong></div>
                    {a.reason && <div className="admin-log-reason">{a.reason}</div>}
                    <div className="admin-log-time">{formatDate(a.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedUser && (
          <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
              <h3>🚫 Забанить {selectedUser.name}?</h3>
              <div className="admin-modal-field">
                <label>Причина:</label>
                <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Причина..." rows={3} />
              </div>
              <div className="admin-modal-field">
                <label>Срок:</label>
                <select value={banDuration} onChange={e => setBanDuration(e.target.value)}>
                  <option value="1h">1 час</option><option value="24h">24 часа</option>
                  <option value="7d">7 дней</option><option value="permanent">Навсегда</option>
                </select>
              </div>
              <div className="admin-modal-actions">
                <button className="admin-modal-cancel" onClick={() => setSelectedUser(null)}>Отмена</button>
                <button className="admin-modal-confirm" onClick={() => performAction('ban', selectedUser, actionReason)} disabled={isLoading || !actionReason.trim()}>🚫 Забанить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
