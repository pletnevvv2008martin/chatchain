'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

interface PasswordModalProps {
  isOpen: boolean;
  roomName: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
  error?: string;
}

export default function PasswordModal({ isOpen, roomName, onClose, onSubmit, error }: PasswordModalProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSubmit(password);
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔐 {t('enterRoom')}</h3>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            <strong>{roomName}</strong> {t('roomProtected')}
          </p>

          <div className="form-group">
            <label>{t('enterPassword')}</label>
            <input
              type="password"
              placeholder={`${t('password')}...`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>{t('cancel')}</button>
            <button className="submit-btn" onClick={handleSubmit}>{t('enterBtn')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
