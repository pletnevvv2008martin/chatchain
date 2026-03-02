'use client';

import { useState } from 'react';

interface StickerPickerProps {
  onSelect: (sticker: string, name: string) => void;
  onClose: () => void;
}

// Настоящие стикеры с уникальным дизайном и градиентами
const STICKERS = {
  popular: [
    { emoji: '🔥', name: 'Огонь', gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' },
    { emoji: '💀', name: 'Жиза', gradient: 'linear-gradient(135deg, #2C3E50, #4CA1AF)' },
    { emoji: '😭', name: 'Плач', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { emoji: '🗿', name: 'Моай', gradient: 'linear-gradient(135deg, #434343, #000000)' },
    { emoji: '🤡', name: 'Клоун', gradient: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
    { emoji: '💅', name: 'Ногти', gradient: 'linear-gradient(135deg, #f953c6, #b91d73)' },
    { emoji: '👀', name: 'Глаза', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
    { emoji: '😎', name: 'Крутой', gradient: 'linear-gradient(135deg, #F37335, #FDC830)' },
  ],
  love: [
    { emoji: '❤️', name: 'Любовь', gradient: 'linear-gradient(135deg, #ff758c, #ff7eb3)' },
    { emoji: '💕', name: 'Сердца', gradient: 'linear-gradient(135deg, #ee9ca7, #ffdde1)' },
    { emoji: '💖', name: 'Блеск', gradient: 'linear-gradient(135deg, #ff6b6b, #feca57)' },
    { emoji: '🥰', name: 'Влюблён', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
    { emoji: '😍', name: 'Обожаю', gradient: 'linear-gradient(135deg, #ffecd2, #fcb69f)' },
    { emoji: '🫶', name: 'Сердце', gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)' },
    { emoji: '💘', name: 'Купидон', gradient: 'linear-gradient(135deg, #f5576c, #f093fb)' },
    { emoji: '🤟', name: 'Люблю', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  ],
  memes: [
    { emoji: '🤨', name: 'Хм', gradient: 'linear-gradient(135deg, #bdc3c7, #2c3e50)' },
    { emoji: '😐', name: 'Рили', gradient: 'linear-gradient(135deg, #606c88, #3f4c6b)' },
    { emoji: '🙄', name: 'Окей', gradient: 'linear-gradient(135deg, #485563, #29323c)' },
    { emoji: '🫠', name: 'Таяние', gradient: 'linear-gradient(135deg, #36d1dc, #5b86e5)' },
    { emoji: '😤', name: 'Злюсь', gradient: 'linear-gradient(135deg, #f857a6, #ff5858)' },
    { emoji: '🤡', name: 'Кринж', gradient: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
    { emoji: '😈', name: 'Дьявол', gradient: 'linear-gradient(135deg, #8E0E00, #1F1C18)' },
    { emoji: '🥴', name: 'Норм', gradient: 'linear-gradient(135deg, #ff9a9e, #fecfef)' },
  ],
  reactions: [
    { emoji: '👍', name: 'Лайк', gradient: 'linear-gradient(135deg, #00b09b, #96c93d)' },
    { emoji: '👎', name: 'Дизлайк', gradient: 'linear-gradient(135deg, #cb2d3e, #ef473a)' },
    { emoji: '🎉', name: 'Праздник', gradient: 'linear-gradient(135deg, #f7971e, #ffd200)' },
    { emoji: '👏', name: 'Браво', gradient: 'linear-gradient(135deg, #56ab2f, #a8e063)' },
    { emoji: '🤝', name: 'Договор', gradient: 'linear-gradient(135deg, #5C258D, #4389A2)' },
    { emoji: '💪', name: 'Сила', gradient: 'linear-gradient(135deg, #f12711, #f5af19)' },
    { emoji: '🙏', name: 'Спасибо', gradient: 'linear-gradient(135deg, #c94b4b, #4b134f)' },
    { emoji: '✨', name: 'Магия', gradient: 'linear-gradient(135deg, #f5af19, #f12711)' },
  ],
};

const CATEGORIES = [
  { id: 'popular', icon: '🔥', name: 'Популярные' },
  { id: 'love', icon: '❤️', name: 'Любовь' },
  { id: 'memes', icon: '🤡', name: 'Мемы' },
  { id: 'reactions', icon: '👍', name: 'Реакции' },
];

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState('popular');

  const stickers = STICKERS[activeCategory as keyof typeof STICKERS] || [];

  return (
    <div className="sticker-picker-backdrop" onClick={onClose}>
      <div className="sticker-picker-container" onClick={e => e.stopPropagation()}>
        <div className="sticker-picker-header">
          <span className="sticker-picker-title">🎨 Стикеры</span>
          <button className="sticker-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="sticker-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`sticker-cat ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
        
        <div className="sticker-grid">
          {stickers.map((sticker, i) => (
            <button
              key={i}
              className="sticker-item"
              onClick={() => {
                onSelect(JSON.stringify(sticker), sticker.name);
                onClose();
              }}
              title={sticker.name}
              style={{ background: sticker.gradient }}
            >
              <span className="sticker-emoji">{sticker.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
