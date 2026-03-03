'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useRouter } from 'next/navigation';
import { 
  Gamepad2, Spade, Sun, Moon, Bell, Shield, PenLine, Link2, Users, Heart, 
  Swords, LogOut, Castle, ChevronDown, ChevronUp, X, Dices, Crown, Target, Crosshair
} from 'lucide-react';

// Админы по никнейму
const ADMIN_NAMES = ['Martin'];

// Все игры
const ALL_GAMES = [
  { id: 'chain', name: 'Цепь', icon: Link2, color: '#3b82f6', href: '/chain', description: 'Создавай цепочки слов' },
  { id: 'mafia', name: 'Мафия', icon: Users, color: '#8b5cf6', href: '/mafia', description: 'Классическая мафия' },
  { id: 'dating', name: 'Знакомства', icon: Heart, color: '#ec4899', href: '/dating', description: 'Найди свою пару' },
  { id: 'duel', name: 'Дуэли', icon: Swords, color: '#ef4444', href: '/duel', description: 'Сражайся с игроками' },
  { id: 'game', name: 'Казино', icon: Dices, color: '#f59e0b', href: '/game', description: 'Испытай удачу' },
  { id: 'poker', name: 'Покер', icon: Spade, color: '#22c55e', href: '/poker', description: 'Техасский холдем' },
  { id: 'fortress', name: 'Крепость', icon: Castle, color: '#06b6d4', href: '/fortress', description: 'Стратегия в реальном времени' },
  { id: 'surviv', name: 'Surviv.io', icon: Crosshair, color: '#dc2626', href: '/surviv', description: 'Battle Royale для зарегистрированных' },
];

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

  // Состояния для мобильной версии
  const [isMobile, setIsMobile] = useState(false);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [showGamesModal, setShowGamesModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setHeaderExpanded(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleGameClick = (href: string) => {
    setShowGamesModal(false);
    router.push(href);
  };

  return (
    <>
      <header className={`main-header ${isMobile && !headerExpanded ? 'header-collapsed' : ''}`}>
        {/* Первая строка: Логотип + Пользователь + Действия */}
        <div className="header-row-1">
          <div className="header-logo" onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }}>
            <h1>Chat<span>Chain</span></h1>
          </div>
          
          {/* Мобильная версия: кнопкаGames + сворачивание */}
          {isMobile && (
            <div className="header-mobile-actions">
              <button 
                className="games-menu-btn"
                onClick={() => setShowGamesModal(true)}
              >
                <Gamepad2 size={20} />
                <span className="games-badge">{ALL_GAMES.length}</span>
              </button>
              
              <div className="notification-btn mobile">
                <Bell size={16} />
                <span className="notification-badge">{onlineCount}</span>
              </div>
              
              <button 
                className="header-toggle-btn"
                onClick={() => setHeaderExpanded(!headerExpanded)}
              >
                {headerExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
          )}
          
          {/* Десктоп версия пользователя */}
          {!isMobile && (
            <>
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
            </>
          )}
        </div>

        {/* Вторая строка: Языки + Игры (только если развёрнута или десктоп) */}
        {(headerExpanded || !isMobile) && (
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
            
            {/* Десктоп: все игры в ряд */}
            {!isMobile && (
              <div className="header-games">
                {ALL_GAMES.map(game => {
                  const Icon = game.icon;
                  return (
                    <button 
                      key={game.id}
                      className={`game-icon-btn ${game.id}`} 
                      onClick={() => router.push(game.href)}
                      title={game.name}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Мобильная версия: кнопка игр + профиль и т.д. */}
            {isMobile && (
              <div className="header-mobile-row">
                <div className="header-user">
                  {isStaff && <span className="role-badge">{actualRole === 'admin' ? '👑' : '🛡️'}</span>}
                  <span className="user-name">{nickname || t('guest')}</span>
                </div>
                
                <div className="header-mobile-buttons">
                  {onRegisterClick && (
                    <button className="register-btn mobile" onClick={onRegisterClick}>
                      <PenLine size={16} />
                    </button>
                  )}
                  
                  {isStaff && (
                    <button className="admin-btn" onClick={() => router.push('/admin')} title="Админ-панель">
                      <Shield size={18} />
                    </button>
                  )}
                  
                  <button className="theme-btn" onClick={toggleTheme}>
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  
                  <button className="logout-btn" onClick={handleLogout} title="Выйти">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Модальное окно с играми */}
      {showGamesModal && (
        <div className="games-modal-overlay" onClick={() => setShowGamesModal(false)}>
          <div className="games-modal" onClick={e => e.stopPropagation()}>
            <div className="games-modal-header">
              <h2>🎮 Игры</h2>
              <button className="games-modal-close" onClick={() => setShowGamesModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="games-modal-grid">
              {ALL_GAMES.map(game => {
                const Icon = game.icon;
                return (
                  <div 
                    key={game.id}
                    className="game-card"
                    onClick={() => handleGameClick(game.href)}
                    style={{ '--game-color': game.color } as React.CSSProperties}
                  >
                    <div className="game-card-icon" style={{ background: `${game.color}20`, color: game.color }}>
                      <Icon size={32} />
                    </div>
                    <div className="game-card-info">
                      <span className="game-card-name">{game.name}</span>
                      <span className="game-card-desc">{game.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .main-header {
          background: var(--bg-secondary, #1a1a2e);
          border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.1));
          position: sticky;
          top: 0;
          z-index: 100;
          transition: all 0.3s ease;
        }

        .header-collapsed .header-row-2 {
          display: none;
        }

        .header-row-1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          gap: 12px;
        }

        .header-logo h1 {
          font-size: 20px;
          margin: 0;
          color: var(--text-primary, #fff);
        }

        .header-logo h1 span {
          color: var(--accent, #6366f1);
        }

        .header-user {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-badge {
          font-size: 14px;
        }

        .user-name {
          font-weight: 500;
          color: var(--text-primary, #fff);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-tertiary, #252540);
          color: var(--text-muted, #888);
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-btn:hover {
          background: var(--accent, #6366f1);
          color: white;
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .register-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 20px;
          background: var(--accent, #6366f1);
          color: white;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .register-btn:hover {
          background: var(--accent-dark, #4f46e5);
          transform: translateY(-1px);
        }

        .admin-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .theme-btn, .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg-tertiary, #252540);
          color: var(--text-muted, #888);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .theme-btn:hover, .logout-btn:hover {
          background: var(--bg-hover, #3a3a5a);
          color: var(--text-primary, #fff);
        }

        .header-row-2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-top: 1px solid var(--border-light, rgba(255,255,255,0.05));
          background: var(--bg-tertiary, #252540);
        }

        .header-languages {
          display: flex;
          gap: 4px;
        }

        .lang-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted, #888);
          font-weight: 500;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lang-btn.active {
          background: var(--accent, #6366f1);
          color: white;
        }

        .lang-btn:hover:not(.active) {
          background: var(--bg-hover, #3a3a5a);
        }

        .header-games {
          display: flex;
          gap: 8px;
        }

        .game-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .game-icon-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .game-icon-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .game-icon-btn.chain { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .game-icon-btn.chain:hover { background: #3b82f6; color: white; }
        
        .game-icon-btn.mafia { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
        .game-icon-btn.mafia:hover { background: #8b5cf6; color: white; }
        
        .game-icon-btn.dating { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
        .game-icon-btn.dating:hover { background: #ec4899; color: white; }
        
        .game-icon-btn.duel { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .game-icon-btn.duel:hover { background: #ef4444; color: white; }
        
        .game-icon-btn.casino { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .game-icon-btn.casino:hover { background: #f59e0b; color: white; }
        
        .game-icon-btn.poker { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .game-icon-btn.poker:hover { background: #22c55e; color: white; }
        
        .game-icon-btn.fortress { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
        .game-icon-btn.fortress:hover { background: #06b6d4; color: white; }
        
        .game-icon-btn.surviv { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
        .game-icon-btn.surviv:hover { background: #dc2626; color: white; }

        /* Мобильные стили */
        @media (max-width: 768px) {
          .header-row-1 {
            padding: 8px 12px;
          }

          .header-logo h1 {
            font-size: 18px;
          }

          .header-mobile-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .games-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 8px 12px;
            border-radius: 12px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
          }

          .games-menu-btn:hover {
            transform: scale(1.05);
          }

          .games-badge {
            background: rgba(255,255,255,0.3);
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 11px;
          }

          .header-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--bg-tertiary, #252540);
            color: var(--text-muted, #888);
            border: none;
            cursor: pointer;
            transition: all 0.2s;
          }

          .notification-btn.mobile {
            width: 32px;
            height: 32px;
          }

          .header-mobile-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }

          .header-mobile-buttons {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .register-btn.mobile {
            padding: 8px;
            border-radius: 8px;
          }

          .register-btn.mobile .register-text {
            display: none;
          }
        }

        /* Модальное окно игр */
        .games-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .games-modal {
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          max-height: 80vh;
          overflow: hidden;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .games-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.1));
        }

        .games-modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text-primary, #fff);
        }

        .games-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-tertiary, #252540);
          color: var(--text-muted, #888);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .games-modal-close:hover {
          background: #ef4444;
          color: white;
        }

        .games-modal-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 12px;
          padding: 16px;
          overflow-y: auto;
          max-height: calc(80vh - 70px);
        }

        .game-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--bg-tertiary, #252540);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .game-card:hover {
          background: var(--bg-hover, #3a3a5a);
          border-color: var(--game-color, #6366f1);
          transform: translateX(4px);
        }

        .game-card:active {
          transform: scale(0.98);
        }

        .game-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          flex-shrink: 0;
        }

        .game-card-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .game-card-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .game-card-desc {
          font-size: 13px;
          color: var(--text-muted, #888);
        }

        @media (min-width: 400px) {
          .games-modal-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .game-card {
            flex-direction: column;
            text-align: center;
            gap: 12px;
            padding: 20px 16px;
          }

          .game-card-info {
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
