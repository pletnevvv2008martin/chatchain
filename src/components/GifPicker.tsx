'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface GifItem {
  id: string;
  url: string;
  thumb: string;
  title: string;
  proxyThumb?: string;
}

const CATEGORIES = [
  { id: 'trending', name: '🔥 Тренды', action: 'trending' },
  { id: 'reactions', name: '👍 Реакции', action: 'search', query: 'reactions' },
  { id: 'funny', name: '😂 Смешные', action: 'search', query: 'funny' },
  { id: 'love', name: '❤️ Любовь', action: 'search', query: 'love' },
  { id: 'celebrate', name: '🎉 Праздник', action: 'search', query: 'celebrate' },
  { id: 'animals', name: '🐱 Животные', action: 'search', query: 'animals' },
  { id: 'cool', name: '😎 Круто', action: 'search', query: 'cool' },
  { id: 'memes', name: '🤪 Мемы', action: 'search', query: 'memes' },
];

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState('trending');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const loadGifs = useCallback(async (categoryId: string) => {
    setLoading(true);
    setImageErrors(new Set());
    
    try {
      const category = CATEGORIES.find(c => c.id === categoryId);
      if (!category) return;

      let url = `/api/gif?action=${category.action}`;
      if (category.query) {
        url += `&query=${encodeURIComponent(category.query)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setGifs(data.data);
      }
    } catch (error) {
      console.error('Failed to load GIFs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGifs(activeCategory);
  }, [activeCategory, loadGifs]);

  const handleSend = (url: string) => {
    if (!url) return;
    onSelect(url);
    onClose();
  };

  const handleSendCustomUrl = () => {
    if (!customUrl.trim()) return;
    
    let url = customUrl.trim();
    
    // Конвертация GIPHY ссылок
    if (url.includes('giphy.com/gifs/')) {
      const parts = url.split('/gifs/')[1]?.split('-');
      const id = parts?.pop();
      if (id) {
        url = `https://media.giphy.com/media/${id}/giphy.gif`;
      }
    }
    
    // Конвертация GIPHY страниц в прямые ссылки
    if (url.includes('giphy.com/') && !url.includes('media.giphy.com')) {
      const match = url.match(/giphy\.com\/gifs\/[^-]+-([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        url = `https://media.giphy.com/media/${match[1]}/giphy.gif`;
      }
    }
    
    // Tenor ссылки
    if (url.includes('tenor.com/view/')) {
      // Tenor требует API, но можно попробовать прямую ссылку
      const tenorId = url.split('-').pop()?.replace(/\D/g, '');
      if (tenorId) {
        // Используем прокси для Tenor
        url = `https://media.tenor.com/${tenorId}/ACcS3IJDq5EAAAAd/tenor.gif`;
      }
    }
    
    // Imgur GIFV -> GIF
    if (url.includes('imgur.com') && url.endsWith('.gifv')) {
      url = url.replace('.gifv', '.gif');
    }
    
    // Imgur ссылки без расширения
    if (url.includes('imgur.com/') && !url.match(/\.(gif|png|jpg|jpeg|webp)$/i)) {
      url = url + '.gif';
    }

    handleSend(url);
  };

  const handleImageError = (gifId: string, thumb: string, proxyThumb?: string) => {
    const img = document.querySelector(`img[data-id="${gifId}"]`) as HTMLImageElement;
    
    if (img) {
      const currentSrc = img.src;
      
      // Если ещё не пробовали прокси
      if (proxyThumb && !currentSrc.includes('/api/gif-proxy')) {
        img.src = proxyThumb;
        return;
      }
      
      // Если прокси тоже не сработал - пробуем оригинальный URL
      if (currentSrc.includes('/api/gif-proxy') && thumb) {
        img.src = thumb;
        return;
      }
    }
    
    // Помечаем как ошибку
    setImageErrors(prev => new Set(prev).add(gifId));
  };

  return (
    <>
      <div className="gif-overlay-mobile" onClick={onClose} />
      
      <div className="gif-picker-compact" onClick={e => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="gif-header-compact">
          <span className="gif-title-compact">🎬 GIF</span>
          <div className="gif-header-actions-compact">
            <button
              className="gif-refresh-btn"
              onClick={() => loadGifs(activeCategory)}
              title="Обновить"
            >
              <RefreshCw size={14} />
            </button>
            <button
              className="gif-giphy-btn-compact"
              onClick={() => window.open('https://giphy.com', '_blank')}
              title="Открыть GIPHY"
            >
              <ExternalLink size={14} />
            </button>
            <button className="gif-close-compact" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Вставка ссылки */}
        <div className="gif-url-input-row">
          <input
            type="text"
            placeholder="Вставьте ссылку (GIPHY, Tenor, Imgur...)"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customUrl.trim()) {
                handleSendCustomUrl();
              }
            }}
          />
          {customUrl.trim() && (
            <button className="gif-send-url-btn-small" onClick={handleSendCustomUrl}>
              ➤
            </button>
          )}
        </div>

        {/* Категории */}
        <div className="gif-categories-scroll">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`gif-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="gif-content-area">
          {loading ? (
            <div className="gif-loading-state">
              <Loader2 className="gif-spinner" size={32} />
              <span>Загрузка GIF...</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="gif-empty-state">
              <span>GIF не найдены</span>
              <button className="gif-retry-btn" onClick={() => loadGifs(activeCategory)}>
                Обновить
              </button>
            </div>
          ) : (
            <div className="gif-grid-compact-new">
              {gifs.map((gif) => {
                const hasError = imageErrors.has(gif.id);
                
                return (
                  <div
                    key={gif.id}
                    className={`gif-item-compact ${hasError ? 'gif-error' : ''}`}
                    onClick={() => handleSend(gif.url)}
                    title={gif.title}
                  >
                    {!hasError ? (
                      <img
                        data-id={gif.id}
                        src={gif.thumb}
                        alt={gif.title}
                        loading="lazy"
                        onError={() => handleImageError(gif.id, gif.thumb, gif.proxyThumb)}
                      />
                    ) : (
                      <div className="gif-error-placeholder">
                        <span>🖼️</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="gif-hint-compact">
          Нажмите на GIF или вставьте ссылку
        </div>
      </div>
    </>
  );
}
