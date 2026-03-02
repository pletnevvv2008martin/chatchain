'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useRouter } from 'next/navigation';
import { Gamepad2, Spade, Sun, Moon, Bell, Shield, PenLine, Link2, Users, Heart, Swords, LogOut, Castle } from 'lucide-react';

// Админы по никнейму
const ADMIN_NAMES = ['Martin'];

interface HeaderProps {
  nickname?: string;
  onlineCount?: number;
  userRole?: 'user' | 'moderator' | 'admin';
  onAdminClick?: () => void;
  currentUserId?: string;
  isRegistered?: boolean;
  onRegisterClick?: () => void;
  onLogoClick?: () => void;
  onLogout?: () => void;
}

export default function Header({
  nickname,
  onlineCount = 1,
  userRole = 'user',
  onAdminClick,
  isRegistered = false,
  onRegisterClick,
  onLogoClick,
  onLogout
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  
  // Проверяем роль с учётом локального списка админов
  const actualRole = (nickname && ADMIN_NAMES.includes(nickname)) ? 'admin' : userRole;
  const isStaff = actualRole === 'moderator' || actualRole === 'admin';

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') { document.body.classList.add('dark-theme'); return true; }
    }
    return false;
  });

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) { document.body.classList.add('dark-theme'); localStorage.setItem('theme', 'dark'); }
    else { document.body.classList.remove('dark-theme'); localStorage.setItem('theme', 'light'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('chatchain_user');
    localStorage.removeItem('chatchain_registered');
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="main-header">
      {/* Первая строка: Логотип + Пользователь + Действия */}
      <div className="header-row-1">
        <div className="header-logo" onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }}>
          <h1>Chat<span>Chain</span></h1>
        </div>
        
        <div className="header-user">
          {isStaff && <span className="role-badge">{actualRole === 'admin' ? '👑' : '🛡️'}</span>}
          <span className="user-name">{nickname || t('guest')}</span>
        </div>

        <div className="header-actions">
          <div className="notification-btn">
            <Bell size={18} />
            <span className="notification-badge">{onlineCount}</span>
          </div>
          
          {onRegisterClick && (
            <button className="register-btn" onClick={onRegisterClick}>
              <PenLine size={16} />
              <span className="register-text">{isRegistered ? 'Профиль' : 'Вход / Регистрация'}</span>
            </button>
          )}
          
          {isStaff && (
            <>
              <button className="admin-btn" onClick={() => router.push('/admin')} title="Админ-панель">
                <Shield size={18} />
              </button>
              {onAdminClick && (
                <button className="admin-btn quick" onClick={onAdminClick} title="Быстрая модерация">
                  ⚡
                </button>
              )}
            </>
          )}
          
          <button className="theme-btn" onClick={toggleTheme}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button className="logout-btn" onClick={handleLogout} title="Выйти">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Вторая строка: Языки + Игры */}
      <div className="header-row-2">
        <div className="header-languages">
          <button
            onClick={() => setLanguage('ru')}
            className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
          >
            RU
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
          >
            EN
          </button>
        </div>
        
        <div className="header-games">
          <button 
            className="game-icon-btn chain" 
            onClick={() => router.push('/chain')}
            title="Игра Цепь"
          >
            <Link2 size={20} />
          </button>
          <button 
            className="game-icon-btn mafia" 
            onClick={() => router.push('/mafia')}
            title="Мафия"
          >
            <Users size={20} />
          </button>
          <button 
            className="game-icon-btn dating" 
            onClick={() => router.push('/dating')}
            title="Знакомства"
          >
            <Heart size={20} />
          </button>
          <button
            className="game-icon-btn duel"
            onClick={() => router.push('/duel')}
            title="Дуэли"
          >
            <Swords size={20} />
          </button>
          <button
            className="game-icon-btn casino"
            onClick={() => router.push('/game')}
            title="Казино"
          >
            <Gamepad2 size={20} />
          </button>
          <button 
            className="game-icon-btn poker" 
            onClick={() => router.push('/poker')}
            title="Покер"
          >
            <Spade size={20} />
          </button>
          <button 
            className="game-icon-btn fortress" 
            onClick={() => router.push('/fortress')}
            title="Крепость"
          >
            <Castle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
