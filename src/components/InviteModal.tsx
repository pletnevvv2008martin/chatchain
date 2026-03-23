'use client';

import { useLanguage } from '@/lib/LanguageContext';

interface User {
  id: string;
  nickname: string;
  status: 'guest' | 'participant' | 'king' | 'legend';
}

interface InviteModalProps {
  isOpen: boolean;
  roomName: string;
  users: User[];
  onClose: () => void;
  onInvite: (userId: string) => void;
}

export default function InviteModal({ isOpen, roomName, users, onClose, onInvite }: InviteModalProps) {
  const { t } = useLanguage();

  const getStatusText = (status: string) => {
    switch (status) {
      case 'guest': return t('guest');
      case 'participant': return t('participant');
      case 'king': return t('king');
      case 'legend': return t('legend');
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📨 {t('inviteToRoom')}</h3>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            {t('inviteUsersTo')} <strong>{roomName}</strong>
          </p>

          <div className="users-list">
            {users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="user-list-item">
                  <div className="user-list-info">
                    <span className="user-list-name">{user.nickname}</span>
                    <span className={`user-list-status status-${user.status}`}>
                      {user.status === 'guest' && `👤 ${getStatusText(user.status)}`}
                      {user.status === 'participant' && `⭐ ${getStatusText(user.status)}`}
                      {user.status === 'king' && `👑 ${getStatusText(user.status)}`}
                      {user.status === 'legend' && `🏆 ${getStatusText(user.status)}`}
                    </span>
                  </div>
                  <button
                    className="invite-btn"
                    onClick={() => onInvite(user.id)}
                  >
                    {t('inviteBtn')}
                  </button>
                </div>
              ))
            ) : (
              <p className="no-users">{t('noUsersToInvite')}</p>
            )}
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>{t('close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
