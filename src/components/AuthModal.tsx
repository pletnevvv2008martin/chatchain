'use client';

import { useState } from 'react';

interface AuthModalProps {
  onSuccess: (user: { id: string; nickname: string; email?: string; role?: string; xp?: number; points?: number }) => void;
  onClose?: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    setError('');

    if (!nickname.trim()) {
      setError('Введите никнейм');
      return false;
    }

    if (nickname.length < 3 || nickname.length > 20) {
      setError('Никнейм от 3 до 20 символов');
      return false;
    }

    if (!/^[a-zA-Z0-9_а-яА-Я]+$/.test(nickname)) {
      setError('Только буквы, цифры и _');
      return false;
    }

    if (mode === 'register') {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Неверный формат email');
        return false;
      }

      if (!password) {
        setError('Введите пароль');
        return false;
      }

      if (password.length < 6) {
        setError('Пароль минимум 6 символов');
        return false;
      }

      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          nickname: nickname.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.user);
      } else {
        setError(data.error || 'Ошибка');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    const guestName = `Гость_${Math.floor(Math.random() * 10000)}`;
    onSuccess({
      id: `guest-${Date.now()}`,
      nickname: guestName,
    });
  };

  return (
    <div className="auth-backdrop">
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose || handleGuest}>✕</button>

        <div className="auth-header">
          <div className="auth-logo">💬</div>
          <h2 className="auth-title">ChatChain</h2>
          <p className="auth-subtitle">Общайся свободно</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Регистрация
          </button>
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Вход
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Никнейм</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Ваше имя"
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label>Email <span>(необязательно)</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          )}

          <div className="auth-field">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label>Подтвердите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '⏳ Загрузка...' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>

        <div className="auth-divider">
          <span>или</span>
        </div>

        <div className="auth-socials">
          <button className="auth-social google" type="button" disabled>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button className="auth-social vk" type="button" disabled>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#4A76A8">
              <path d="M15.68 13.34c.37-.5.66-.93.88-1.3.73-1.18 1.1-2.08 1.1-2.7 0-.3-.1-.54-.28-.7-.18-.17-.43-.25-.76-.25h-2.76c-.35 0-.61.1-.78.28-.16.19-.3.5-.4.93-.24 1.02-.6 1.97-1.08 2.84-.16.3-.3.52-.43.68-.12.15-.22.22-.29.22-.07 0-.14-.04-.18-.12-.05-.08-.07-.22-.07-.42V9.13c0-.42-.06-.7-.19-.84-.13-.14-.38-.21-.75-.21H7.84c-.32 0-.56.06-.73.19-.16.12-.25.28-.25.47 0 .24.15.42.45.53.22.08.38.18.47.32.1.13.15.35.15.65v2.6c0 .54-.06.92-.18 1.13-.12.2-.27.31-.44.31-.1 0-.21-.03-.33-.1-.12-.06-.24-.16-.36-.28-.12-.12-.25-.28-.38-.47-.13-.2-.26-.42-.4-.68-.4-.7-.77-1.54-1.1-2.52-.09-.27-.2-.47-.32-.58-.12-.11-.3-.17-.54-.17H1.7c-.36 0-.6.09-.7.27-.1.18-.1.42 0 .72.47 1.27.98 2.42 1.54 3.46.55 1.04 1.13 1.92 1.72 2.64.6.73 1.2 1.3 1.82 1.73.62.43 1.23.64 1.84.64h1.42c.38 0 .65-.1.82-.32.17-.22.25-.53.25-.95v-.72c0-.28.03-.5.1-.65.06-.16.16-.24.3-.24.12 0 .26.07.42.2.16.13.34.32.54.57.2.24.42.53.66.85.24.33.5.64.8.94.3.3.62.54.97.73.35.2.73.29 1.13.29h2.46c.37 0 .65-.08.83-.24.18-.16.27-.37.27-.63 0-.15-.03-.3-.08-.44-.05-.14-.12-.27-.22-.38-.1-.12-.2-.22-.32-.32-.12-.1-.24-.2-.36-.28-.26-.18-.49-.35-.7-.52-.2-.17-.39-.35-.55-.53-.17-.18-.3-.36-.4-.54-.1-.18-.16-.36-.16-.54 0-.22.07-.43.2-.64.13-.2.32-.46.56-.76z"/>
            </svg>
            VK
          </button>
        </div>

        {!onClose && (
          <button className="auth-guest" onClick={handleGuest}>
            Продолжить как гость
          </button>
        )}

        <p className="auth-terms">
          Регистрируясь, вы соглашаетесь с<br/>
          <a href="#" onClick={e => e.preventDefault()}>Условиями использования</a>
        </p>
      </div>
    </div>
  );
}
