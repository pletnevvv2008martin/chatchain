'use client';

import { useState } from 'react';
import { X, Gift, Heart, Star, Crown, Sparkles } from 'lucide-react';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  toUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  fromUser: {
    id: string;
    name: string;
    hp: number;
  };
  onGiftSent: (gift: any) => void;
}

// Суммы для быстрого выбора
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

// Эмодзи подарков
const GIFT_EMOJIS = ['🎁', '💝', '🌸', '💎', '👑', '⭐', '🌹', '🍫', '🏆', '💖'];

export default function GiftModal({ isOpen, onClose, toUser, fromUser, onGiftSent }: GiftModalProps) {
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(GIFT_EMOJIS[0]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const finalAmount = customAmount ? parseInt(customAmount) : amount;

  const handleSend = async () => {
    if (finalAmount < 10) {
      setError('Минимальный подарок: 10 HP');
      return;
    }

    if (finalAmount > fromUser.hp) {
      setError(`Недостаточно HP. У вас: ${fromUser.hp} HP`);
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_gift',
          fromId: fromUser.id,
          fromName: fromUser.name,
          toId: toUser.id,
          toName: toUser.name,
          amount: finalAmount,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        onGiftSent(data);
        onClose();
      }
    } catch (e) {
      setError('Ошибка отправки подарка');
    } finally {
      setIsSending(false);
    }
  };

  // Комиссия
  const commission = Math.floor(finalAmount * 0.05);
  const receivedAmount = finalAmount - commission;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="gift-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="gift-header">
          <div className="gift-icon-wrapper">
            <Gift size={32} />
          </div>
          <h2>Подарок для {toUser.name}</h2>
        </div>

        {/* Выбор эмодзи */}
        <div className="gift-emojis">
          {GIFT_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`}
              onClick={() => setSelectedEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Быстрый выбор суммы */}
        <div className="gift-amount-section">
          <label>Сумма HP:</label>
          <div className="quick-amounts">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                className={`quick-amount-btn ${amount === amt && !customAmount ? 'selected' : ''} ${fromUser.hp < amt ? 'disabled' : ''}`}
                onClick={() => { setAmount(amt); setCustomAmount(''); }}
                disabled={fromUser.hp < amt}
              >
                {amt} HP
              </button>
            ))}
          </div>

          {/* Своя сумма */}
          <div className="custom-amount">
            <input
              type="number"
              placeholder="Своя сумма"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              min={10}
              max={fromUser.hp}
            />
            <span className="hp-label">HP</span>
          </div>
        </div>

        {/* Сообщение */}
        <div className="gift-message-section">
          <label>Сообщение (необязательно):</label>
          <textarea
            placeholder="Напишите пожелание..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <span className="char-count">{message.length}/200</span>
        </div>

        {/* Информация о подарке */}
        <div className="gift-info">
          <div className="info-row">
            <span>Вы отправляете:</span>
            <span className="highlight">❤️ {finalAmount} HP</span>
          </div>
          <div className="info-row">
            <span>Получит {toUser.name}:</span>
            <span className="highlight green">❤️ {receivedAmount} HP</span>
          </div>
          <div className="info-row small">
            <span>Комиссия:</span>
            <span>{commission} HP (5%)</span>
          </div>
        </div>

        {/* Баланс */}
        <div className="balance-info">
          <span>Ваш баланс: </span>
          <span className="balance-value">❤️ {fromUser.hp} HP</span>
        </div>

        {/* Ошибка */}
        {error && <div className="gift-error">{error}</div>}

        {/* Кнопки */}
        <div className="gift-actions">
          <button className="cancel-btn" onClick={onClose}>
            Отмена
          </button>
          <button
            className="send-gift-btn"
            onClick={handleSend}
            disabled={isSending || finalAmount < 10 || finalAmount > fromUser.hp}
          >
            {isSending ? (
              'Отправка...'
            ) : (
              <>
                {selectedEmoji} Подарить {finalAmount} HP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
