'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, password: string) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) {
      alert(t('enterRoomName'));
      return;
    }
    onCreate(name.trim(), hasPassword ? password : '');
    setName('');
    setPassword('');
    setHasPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ {t('createRoom')}</h3>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>{t('roomName')}</label>
            <input
              type="text"
              placeholder={t('enterRoomName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
              />
              <span>{t('setPassword')}</span>
            </label>
          </div>

          {hasPassword && (
            <div className="form-group">
              <label>{t('password')}</label>
              <input
                type="password"
                placeholder={t('enterPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={20}
              />
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>{t('cancel')}</button>
            <button className="submit-btn" onClick={handleSubmit}>{t('create')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
