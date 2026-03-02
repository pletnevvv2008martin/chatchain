'use client';

import { useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES: Record<string, { icon: string; emojis: string[] }> = {
  smileys: {
    icon: '😊',
    emojis: ['😊', '😂', '🤣', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐']
  },
  gestures: {
    icon: '👋',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '👀', '👁️']
  },
  hearts: {
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '❤️‍🔥', '❤️‍🩹', '💌', '💍', '💐', '🌹', '🥀', '🌷', '🌸', '💮', '🏵️']
  },
  animals: {
    icon: '🐱',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜']
  },
  food: {
    icon: '🍕',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕']
  },
  activities: {
    icon: '⚽',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️']
  },
  objects: {
    icon: '💡',
    emojis: ['💡', '🔦', '🏮', '📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎬', '📺', '📻', '🎙️', '🎚️', '🎛️', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🪘']
  },
  symbols: {
    icon: '🔥',
    emojis: ['💯', '❤️', '🔥', '✨', '⭐', '🌟', '💫', '🎉', '🎊', '👋', '✅', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '🔃', '⚡', '💥', '💢', '💦', '💨', '🔔', '🔕', '📢', '📣', '💬', '💭', '👑', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉']
  },
};

const CATEGORY_KEYS = Object.keys(EMOJI_CATEGORIES);

const getRecent = (): string[] => {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('recentEmoji') || '[]'); } catch { return []; }
};

const saveRecent = (emoji: string) => {
  const recent = getRecent();
  localStorage.setItem('recentEmoji', JSON.stringify([emoji, ...recent.filter(e => e !== emoji)].slice(0, 16)));
};

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [active, setActive] = useState('smileys');
  const [recent, setRecent] = useState<string[]>(() => getRecent());
  const [search, setSearch] = useState('');

  const handleSelect = (emoji: string) => {
    saveRecent(emoji);
    setRecent(getRecent());
    onSelect(emoji);
  };

  const allEmojis = Object.values(EMOJI_CATEGORIES).flatMap(c => c.emojis);
  const filtered = search ? allEmojis.filter((e, i, arr) => arr.indexOf(e) === i) : EMOJI_CATEGORIES[active]?.emojis || [];

  return (
    <div className="emoji-picker-backdrop" onClick={onClose}>
      <div className="emoji-picker-container" onClick={e => e.stopPropagation()}>
        <div className="emoji-header">
          <span className="emoji-title">😊 Эмодзи</span>
          <button className="emoji-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="emoji-search-row">
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {!search && recent.length > 0 && (
          <div className="emoji-recent-row">
            <div className="emoji-recent-label">🕐 Недавние</div>
            <div className="emoji-recent-grid">
              {recent.slice(0, 12).map((e, i) => (
                <button key={i} className="emoji-btn-compact" onClick={() => handleSelect(e)}>{e}</button>
              ))}
            </div>
          </div>
        )}

        <div className="emoji-cats">
          {CATEGORY_KEYS.map(key => (
            <button
              key={key}
              className={`emoji-cat ${active === key ? 'active' : ''}`}
              onClick={() => { setActive(key); setSearch(''); }}
            >
              {EMOJI_CATEGORIES[key].icon}
            </button>
          ))}
        </div>

        <div className="emoji-grid-compact">
          {filtered.map((emoji, i) => (
            <button key={i} className="emoji-btn-compact" onClick={() => handleSelect(emoji)}>{emoji}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
