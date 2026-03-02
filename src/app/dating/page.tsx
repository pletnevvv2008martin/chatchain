'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import UnifiedMusicPlayer from '@/components/UnifiedMusicPlayer';
import {
  User,
  getUser,
  updateUser,
  DEMO_TRACKS,
  generateId,
  getStatusEmoji,
  getStatusColor,
} from '@/lib/store';

// Типы
interface DatingParticipant {
  id: string;
  nickname: string;
  gender: 'male' | 'female';
  age: number;
  avatar: string;
  status: 'guest' | 'participant' | 'king' | 'legend';
  points: number;
  answers: Record<number, string>;
  sympatiesSent: { toId: string; points: number }[];
  sympatiesReceived: number;
  finalChoices: string[];
}

interface DatingRoom {
  id: string;
  males: DatingParticipant[];
  females: DatingParticipant[];
  questions: Question[];
  currentQuestionIndex: number;
  phase: 'waiting' | 'questions' | 'final_choice' | 'results';
  answersCount: number;
}

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface Match {
  user1: string;
  user2: string;
  user1Name: string;
  user2Name: string;
  compatibility: number;
}

// Демо-участники
const DEMO_MALES: Omit<DatingParticipant, 'id' | 'answers' | 'sympatiesSent' | 'sympatiesReceived' | 'finalChoices'>[] = [
  { nickname: 'Алексей', gender: 'male', age: 28, avatar: '👨‍💼', status: 'participant', points: 150 },
  { nickname: 'Дмитрий', gender: 'male', age: 32, avatar: '👨‍🎤', status: 'king', points: 500 },
  { nickname: 'Сергей', gender: 'male', age: 25, avatar: '👨‍💻', status: 'guest', points: 100 },
  { nickname: 'Максим', gender: 'male', age: 30, avatar: '👨‍🎨', status: 'participant', points: 200 },
  { nickname: 'Андрей', gender: 'male', age: 27, avatar: '👨‍🔬', status: 'legend', points: 1000 },
];

const DEMO_FEMALES: Omit<DatingParticipant, 'id' | 'answers' | 'sympatiesSent' | 'sympatiesReceived' | 'finalChoices'>[] = [
  { nickname: 'Анна', gender: 'female', age: 26, avatar: '👩‍💼', status: 'participant', points: 180 },
  { nickname: 'Елена', gender: 'female', age: 24, avatar: '👩‍🎨', status: 'king', points: 400 },
  { nickname: 'Мария', gender: 'female', age: 29, avatar: '👩‍💻', status: 'guest', points: 120 },
  { nickname: 'Ольга', gender: 'female', age: 27, avatar: '👩‍🎤', status: 'participant', points: 250 },
  { nickname: 'Наталья', gender: 'female', age: 25, avatar: '👩‍🔬', status: 'legend', points: 800 },
];

const QUESTIONS: Question[] = [
  { id: 1, text: 'Какой ваш идеальный вечер пятницы?', options: ['Домашний уют', 'Ресторан', 'Клуб/Бар', 'Прогулка'] },
  { id: 2, text: 'Что для вас важнее в отношениях?', options: ['Доверие', 'Страсть', 'Понимание', 'Общие интересы'] },
  { id: 3, text: 'Как вы относитесь к путешествиям?', options: ['Обожаю!', 'Иногда', 'Редко', 'Не люблю'] },
  { id: 4, text: 'Ваше отношение к детям?', options: ['Хочу своих', 'Уже есть', 'Пока не готов', 'Не хочу'] },
  { id: 5, text: 'Какой стиль общения вам ближе?', options: ['Откровенный', 'Дипломатичный', 'Юмористический', 'Серьёзный'] },
  { id: 6, text: 'Что вас привлекает в человеке?', options: ['Интеллект', 'Чувство юмора', 'Внешность', 'Доброта'] },
  { id: 7, text: 'Ваше отношение к животным?', options: ['Обожаю!', 'Нейтрально', 'Есть питомец', 'Аллергия'] },
  { id: 8, text: 'Какой отдых предпочитаете?', options: ['Активный', 'Пляжный', 'Культурный', 'Домашний'] },
  { id: 9, text: 'Что для вас значит семья?', options: ['Всё', 'Много', 'Средне', 'Не важно'] },
  { id: 10, text: 'Готовы ли к переезду ради любви?', options: ['Да, легко', 'Возможно', 'Сложно', 'Нет'] },
];

export default function DatingPage() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      return getUser();
    }
    return null;
  });
  const [profile, setProfile] = useState<{ age: number; gender: 'male' | 'female'; bio: string } | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(true);

  // Состояние комнаты знакомств
  const [room, setRoom] = useState<DatingRoom | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<DatingParticipant | null>(null);

  // Выборы и симпатии
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sympathyTarget, setSympathyTarget] = useState<string | null>(null);
  const [sympathyAmount, setSympathyAmount] = useState(10);
  const [showSympathyModal, setShowSympathyModal] = useState(false);

  // Результаты
  const [matches, setMatches] = useState<Match[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [privateChats, setPrivateChats] = useState<{ partner: string; messages: { from: string; text: string; time: string }[] }[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Форма профиля
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bio, setBio] = useState('');

  // Создание участника
  const createParticipant = useCallback(() => {
    if (!user) return null;

    const participant: DatingParticipant = {
      id: user.id,
      nickname: user.nickname,
      gender: gender,
      age: parseInt(age) || 25,
      avatar: gender === 'male' ? '👨' : '👩',
      status: user.status,
      points: user.points,
      answers: {},
      sympatiesSent: [],
      sympatiesReceived: 0,
      finalChoices: [],
    };

    return participant;
  }, [user, gender, age]);

  // Создание комнаты
  const createRoom = useCallback(() => {
    const participant = createParticipant();
    if (!participant) return;

    // Формируем участников (4 демо + игрок)
    const males: DatingParticipant[] = [];
    const females: DatingParticipant[] = [];

    // Добавляем игрока
    if (participant.gender === 'male') {
      males.push(participant);
    } else {
      females.push(participant);
    }

    // Добавляем демо-участников до 5 каждого пола
    const neededMales = 5 - males.length;
    const neededFemales = 5 - females.length;

    for (let i = 0; i < neededMales; i++) {
      const demo = DEMO_MALES[i];
      males.push({
        ...demo,
        id: generateId(),
        answers: {},
        sympatiesSent: [],
        sympatiesReceived: 0,
        finalChoices: [],
      });
    }

    for (let i = 0; i < neededFemales; i++) {
      const demo = DEMO_FEMALES[i];
      females.push({
        ...demo,
        id: generateId(),
        answers: {},
        sympatiesSent: [],
        sympatiesReceived: 0,
        finalChoices: [],
      });
    }

    const newRoom: DatingRoom = {
      id: generateId(),
      males,
      females,
      questions: QUESTIONS,
      currentQuestionIndex: 0,
      phase: 'questions',
      answersCount: 0,
    };

    setRoom(newRoom);
    setCurrentParticipant(participant);
    setProfile({ age: parseInt(age), gender, bio });
    setShowProfileForm(false);
  }, [createParticipant, age, gender, bio]);

  // Симуляция ответов других участников
  useEffect(() => {
    if (!room || room.phase !== 'questions') return;

    const timer = setTimeout(() => {
      // Симулируем ответы других участников
      setRoom(prev => {
        if (!prev) return prev;

        const allParticipants = [...prev.males, ...prev.females];
        const currentQuestion = prev.questions[prev.currentQuestionIndex];

        if (!currentQuestion) return prev;

        const updatedMales = prev.males.map(p => {
          if (p.id === currentParticipant?.id) return p;
          if (!p.answers[prev.currentQuestionIndex]) {
            const randomAnswer = currentQuestion.options[Math.floor(Math.random() * currentQuestion.options.length)];
            return { ...p, answers: { ...p.answers, [prev.currentQuestionIndex]: randomAnswer } };
          }
          return p;
        });

        const updatedFemales = prev.females.map(p => {
          if (p.id === currentParticipant?.id) return p;
          if (!p.answers[prev.currentQuestionIndex]) {
            const randomAnswer = currentQuestion.options[Math.floor(Math.random() * currentQuestion.options.length)];
            return { ...p, answers: { ...p.answers, [prev.currentQuestionIndex]: randomAnswer } };
          }
          return p;
        });

        return { ...prev, males: updatedMales, females: updatedFemales };
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [room?.currentQuestionIndex, room?.phase, currentParticipant?.id]);

  // Ответ на вопрос
  const answerQuestion = () => {
    if (!selectedAnswer || !room || !currentParticipant) return;

    setRoom(prev => {
      if (!prev) return prev;

      const updatedMales = prev.males.map(p =>
        p.id === currentParticipant.id
          ? { ...p, answers: { ...p.answers, [prev.currentQuestionIndex]: selectedAnswer } }
          : p
      );

      const updatedFemales = prev.females.map(p =>
        p.id === currentParticipant.id
          ? { ...p, answers: { ...p.answers, [prev.currentQuestionIndex]: selectedAnswer } }
          : p
      );

      const nextIndex = prev.currentQuestionIndex + 1;

      if (nextIndex >= prev.questions.length) {
        return { ...prev, males: updatedMales, females: updatedFemales, phase: 'final_choice' };
      }

      return { ...prev, males: updatedMales, females: updatedFemales, currentQuestionIndex: nextIndex };
    });

    setSelectedAnswer(null);
  };

  // Отправка симпатии поинтами
  const sendSympathy = () => {
    if (!sympathyTarget || !currentParticipant || !user) return;
    if (sympathyAmount > currentParticipant.points) {
      alert('Недостаточно поинтов!');
      return;
    }

    setRoom(prev => {
      if (!prev) return prev;

      const updatedMales = prev.males.map(p => {
        if (p.id === currentParticipant.id) {
          return { ...p, sympatiesSent: [...p.sympatiesSent, { toId: sympathyTarget, points: sympathyAmount }] };
        }
        if (p.id === sympathyTarget) {
          return { ...p, sympatiesReceived: p.sympatiesReceived + sympathyAmount };
        }
        return p;
      });

      const updatedFemales = prev.females.map(p => {
        if (p.id === currentParticipant.id) {
          return { ...p, sympatiesSent: [...p.sympatiesSent, { toId: sympathyTarget, points: sympathyAmount }] };
        }
        if (p.id === sympathyTarget) {
          return { ...p, sympatiesReceived: p.sympatiesReceived + sympathyAmount };
        }
        return p;
      });

      return { ...prev, males: updatedMales, females: updatedFemales };
    });

    // Обновляем поинты пользователя
    const newPoints = currentParticipant.points - sympathyAmount;
    setCurrentParticipant(prev => prev ? { ...prev, points: newPoints } : null);
    updateUser({ points: newPoints });

    setShowSympathyModal(false);
    setSympathyTarget(null);
    setSympathyAmount(10);
  };

  // Финальный выбор
  const [finalChoices, setFinalChoices] = useState<string[]>([]);

  const toggleFinalChoice = (participantId: string) => {
    setFinalChoices(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, participantId];
    });
  };

  const confirmFinalChoices = () => {
    if (finalChoices.length === 0) return;

    setRoom(prev => {
      if (!prev) return prev;

      const updatedMales = prev.males.map(p =>
        p.id === currentParticipant?.id ? { ...p, finalChoices } : p
      );

      const updatedFemales = prev.females.map(p =>
        p.id === currentParticipant?.id ? { ...p, finalChoices } : p
      );

      return { ...prev, males: updatedMales, females: updatedFemales, phase: 'results' };
    });

    // Симулируем выборы других и находим мэтчи
    setTimeout(() => {
      calculateMatches();
    }, 1500);
  };

  // Подсчёт мэтчей
  const calculateMatches = () => {
    if (!room || !currentParticipant) return;

    const matchesFound: Match[] = [];
    const allParticipants = [...room.males, ...room.females];

    // Симулируем выборы демо-участников
    const allChoices: Record<string, string[]> = {};

    allParticipants.forEach(p => {
      if (p.id === currentParticipant.id) {
        allChoices[p.id] = finalChoices;
      } else {
        // Демо-участники выбирают случайно, но учитывают полученные симпатии
        const oppositeGender = p.gender === 'male' ? room.females : room.males;
        const sorted = [...oppositeGender].sort((a, b) => b.sympatiesReceived - a.sympatiesReceived);
        const choices = sorted.slice(0, 2).map(p => p.id);
        allChoices[p.id] = choices;
      }
    });

    // Проверяем взаимные выборы
    allParticipants.forEach(p1 => {
      allParticipants.forEach(p2 => {
        if (p1.id === p2.id || p1.gender === p2.gender) return;

        const p1Choices = allChoices[p1.id] || [];
        const p2Choices = allChoices[p2.id] || [];

        if (p1Choices.includes(p2.id) && p2Choices.includes(p1.id)) {
          // Проверяем, не добавлен ли уже этот мэтч
          const exists = matchesFound.some(
            m => (m.user1 === p1.id && m.user2 === p2.id) || (m.user1 === p2.id && m.user2 === p1.id)
          );

          if (!exists) {
            const compatibility = Math.floor(Math.random() * 20) + 80; // 80-100%
            matchesFound.push({
              user1: p1.id,
              user2: p2.id,
              user1Name: p1.nickname,
              user2Name: p2.nickname,
              compatibility,
            });
          }
        }
      });
    });

    setMatches(matchesFound);
    setShowMatches(true);
  };

  // Открытие чата
  const openChat = (match: Match) => {
    const partnerName = match.user1 === currentParticipant?.id ? match.user2Name : match.user1Name;
    const existingChat = privateChats.find(c => c.partner === partnerName);

    if (!existingChat) {
      setPrivateChats(prev => [...prev, { partner: partnerName, messages: [] }]);
    }

    setActiveChat(partnerName);
  };

  // Отправка сообщения
  const sendMessage = () => {
    if (!chatInput.trim() || !activeChat || !currentParticipant) return;

    setPrivateChats(prev => prev.map(chat => {
      if (chat.partner === activeChat) {
        return {
          ...chat,
          messages: [...chat.messages, {
            from: currentParticipant.nickname,
            text: chatInput,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          }],
        };
      }
      return chat;
    }));

    setChatInput('');

    // Симуляция ответа
    setTimeout(() => {
      setPrivateChats(prev => prev.map(chat => {
        if (chat.partner === activeChat) {
          return {
            ...chat,
            messages: [...chat.messages, {
              from: activeChat,
              text: 'Привет! Рада знакомству! 😊',
              time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            }],
          };
        }
        return chat;
      }));
    }, 1500);
  };

  const handlePointsUpdate = (points: number) => {
    if (!user) return;
    const updated = updateUser({ points });
    setUser(updated);
    setCurrentParticipant(prev => prev ? { ...prev, points } : null);
  };

  // Получить противоположный пол для отображения
  const getOppositeGender = () => {
    if (!room || !currentParticipant) return [];
    return currentParticipant.gender === 'male' ? room.females : room.males;
  };

  if (!user) {
    return <div className="app-container">Загрузка...</div>;
  }

  // Форма создания профиля
  if (showProfileForm) {
    return (
      <div className="app-container" style={{ paddingBottom: '70px' }}>
        <Header nickname={user.nickname} onlineCount={0} />

        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }}>
          <div className="profile-column" style={{ maxHeight: 'none' }}>
            <h2>💕 Создание профиля для знакомств</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Заполните профиль, чтобы участвовать в групповых свиданиях (5 мужчин + 5 женщин)
            </p>

            <div className="profile-form">
              <div className="form-group">
                <label>Ваш пол</label>
                <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
                  <option value="male">Мужской 👨</option>
                  <option value="female">Женский 👩</option>
                </select>
              </div>

              <div className="form-group">
                <label>Возраст</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Ваш возраст"
                />
              </div>

              <div className="form-group">
                <label>О себе</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Расскажите о себе..."
                  rows={4}
                />
              </div>

              <button className="save-profile-btn" onClick={createRoom}>
                ❤️ Начать знакомства
              </button>
            </div>
          </div>
        </div>

        <UnifiedMusicPlayer currentUserId={user.id} isPremium={user.status === 'king' || user.status === 'legend'} onPointsDeduct={handlePointsUpdate} />
      </div>
    );
  }

  // Фаза ожидания/загрузки
  if (!room || !currentParticipant) {
    return (
      <div className="app-container" style={{ paddingBottom: '70px' }}>
        <Header nickname={user.nickname} onlineCount={10} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="waiting-status">
            <p>⏳ Создание комнаты...</p>
          </div>
        </div>
        <UnifiedMusicPlayer currentUserId={user.id} isPremium={user.status === 'king' || user.status === 'legend'} onPointsDeduct={handlePointsUpdate} />
      </div>
    );
  }

  const currentQuestion = room.questions[room.currentQuestionIndex];
  const oppositeGender = getOppositeGender();

  return (
    <div className="app-container" style={{ paddingBottom: '70px' }}>
      <Header nickname={user.nickname} onlineCount={10} />

      <main className="dating-main" style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        {/* Участники */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Мужчины */}
          <div className="profile-column" style={{ maxHeight: '200px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>👨 Участники ({room.males.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {room.males.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    background: p.id === currentParticipant.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: p.id === currentParticipant.id ? 'white' : 'var(--text-primary)',
                    borderRadius: '20px',
                    fontSize: '13px',
                  }}
                >
                  <span>{p.avatar}</span>
                  <span>{p.nickname}</span>
                  {p.sympatiesReceived > 0 && <span style={{ color: 'var(--accent-love)' }}>❤️{p.sympatiesReceived}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Женщины */}
          <div className="profile-column" style={{ maxHeight: '200px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>👩 Участницы ({room.females.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {room.females.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    background: p.id === currentParticipant.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: p.id === currentParticipant.id ? 'white' : 'var(--text-primary)',
                    borderRadius: '20px',
                    fontSize: '13px',
                  }}
                >
                  <span>{p.avatar}</span>
                  <span>{p.nickname}</span>
                  {p.sympatiesReceived > 0 && <span style={{ color: 'var(--accent-love)' }}>❤️{p.sympatiesReceived}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Фаза вопросов */}
        {room.phase === 'questions' && currentQuestion && (
          <div className="dating-column" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px' }}>
            {/* Прогресс */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>Вопрос {room.currentQuestionIndex + 1} из {room.questions.length}</span>
                <span style={{ color: 'var(--text-muted)' }}>💎 {currentParticipant.points} поинтов</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((room.currentQuestionIndex + 1) / room.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Вопрос */}
            <div className="question-container">
              <h3 style={{ marginBottom: '24px' }}>{currentQuestion.text}</h3>

              <div className="options-container" style={{ display: 'grid', gap: '12px' }}>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-btn ${selectedAnswer === option ? 'active' : ''}`}
                    onClick={() => setSelectedAnswer(option)}
                    style={{
                      padding: '14px 24px',
                      background: selectedAnswer === option ? 'var(--accent-primary)' : 'var(--bg-primary)',
                      color: selectedAnswer === option ? 'white' : 'var(--text-primary)',
                      border: selectedAnswer === option ? '2px solid var(--accent-primary)' : '2px solid var(--border-light)',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
                <button
                  className="submit-btn"
                  onClick={answerQuestion}
                  disabled={!selectedAnswer}
                  style={{ opacity: selectedAnswer ? 1 : 0.5, minWidth: '150px' }}
                >
                  Ответить
                </button>

                {/* Кнопка отправки симпатии */}
                <button
                  className="send-sympathy-btn"
                  onClick={() => setShowSympathyModal(true)}
                  style={{ padding: '12px 20px' }}
                >
                  💝 Симпатия
                </button>
              </div>
            </div>

            {/* Подсказка */}
            <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
              Вы можете отправить симпатию поинтами любому участнику. Полученные симпатии увеличат шанс на мэтч!
            </p>
          </div>
        )}

        {/* Фаза финального выбора */}
        {room.phase === 'final_choice' && (
          <div className="dating-column" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>💕 Кому вы понравились?</h3>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Выберите 1 или 2 участников, которые вам понравились больше всего
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {oppositeGender.map(p => (
                <div
                  key={p.id}
                  onClick={() => toggleFinalChoice(p.id)}
                  style={{
                    padding: '16px',
                    background: finalChoices.includes(p.id) ? 'linear-gradient(135deg, var(--accent-love), #d946ef)' : 'var(--bg-tertiary)',
                    color: finalChoices.includes(p.id) ? 'white' : 'var(--text-primary)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: finalChoices.includes(p.id) ? '2px solid var(--accent-love)' : '2px solid transparent',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{p.avatar}</div>
                  <div style={{ fontWeight: '600' }}>{p.nickname}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{p.age} лет</div>
                  {p.sympatiesReceived > 0 && (
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>❤️ {p.sympatiesReceived}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                Выбрано: {finalChoices.length} из 2
              </p>
              <button
                className="submit-btn"
                onClick={confirmFinalChoices}
                disabled={finalChoices.length === 0}
                style={{ opacity: finalChoices.length > 0 ? 1 : 0.5, minWidth: '200px' }}
              >
                💕 Подтвердить выбор
              </button>
            </div>
          </div>
        )}

        {/* Фаза результатов */}
        {room.phase === 'results' && (
          <div className="dating-column" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px' }}>
            {!showMatches ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💕</div>
                <h3>Подсчитываем совпадения...</h3>
                <div className="progress-bar" style={{ marginTop: '20px' }}>
                  <div className="progress-fill" style={{ width: '60%', animation: 'pulse 1s infinite' }} />
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>💕 Ваши мэтчи!</h3>

                {matches.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {matches.map((match, index) => {
                      const partnerName = match.user1 === currentParticipant.id ? match.user2Name : match.user1Name;
                      return (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(217, 70, 239, 0.1))',
                            borderRadius: '12px',
                            border: '2px solid var(--accent-love)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '18px' }}>{partnerName}</div>
                            <div style={{ color: 'var(--accent-love)' }}>💕 Совместимость: {match.compatibility}%</div>
                          </div>
                          <button
                            className="submit-btn"
                            onClick={() => openChat(match)}
                            style={{ background: 'var(--accent-love)' }}
                          >
                            💬 Чат
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💔</div>
                    <h3>В этот раз не сложилось...</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                      Попробуйте ещё раз!
                    </p>
                    <button
                      className="submit-btn"
                      onClick={() => {
                        setShowProfileForm(true);
                        setRoom(null);
                        setMatches([]);
                        setShowMatches(false);
                      }}
                      style={{ marginTop: '20px' }}
                    >
                      Начать заново
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Активный чат */}
        {activeChat && (
          <div className="private-chat" style={{ display: 'flex', position: 'fixed', bottom: '80px', right: '20px', width: '350px', height: '400px', zIndex: 100 }}>
            <div className="private-chat-header">
              <h3>Чат с {activeChat} 💕</h3>
              <button className="close-chat-btn" onClick={() => setActiveChat(null)}>✕</button>
            </div>
            <div className="private-messages" style={{ flex: 1, overflow: 'auto' }}>
              {privateChats.find(c => c.partner === activeChat)?.messages.map((msg, i) => (
                <div key={i} className={`message ${msg.from === currentParticipant.nickname ? 'own' : 'other'}`}>
                  <div className="message-header">
                    <span className="message-user">{msg.from}</span>
                    <span className="message-time">{msg.time}</span>
                  </div>
                  <div className="message-content">{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="private-input">
              <input
                type="text"
                placeholder="Сообщение..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>➤</button>
            </div>
          </div>
        )}
      </main>

      {/* Модальное окно симпатии */}
      {showSympathyModal && (
        <div className="modal-overlay" onClick={() => setShowSympathyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💝 Отправить симпатию</h3>
              <button className="close-modal-btn" onClick={() => setShowSympathyModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                Выберите участника и количество поинтов. Симпатия увеличит ваш шанс на мэтч!
              </p>

              <div className="form-group">
                <label>Участник</label>
                <select value={sympathyTarget || ''} onChange={(e) => setSympathyTarget(e.target.value)}>
                  <option value="">Выберите...</option>
                  {oppositeGender.map(p => (
                    <option key={p.id} value={p.id}>{p.avatar} {p.nickname}, {p.age} лет</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Поинты (ваши: {currentParticipant.points})</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[10, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setSympathyAmount(amount)}
                      disabled={amount > currentParticipant.points}
                      style={{
                        padding: '8px 16px',
                        background: sympathyAmount === amount ? 'var(--accent-love)' : 'var(--bg-tertiary)',
                        color: sympathyAmount === amount ? 'white' : 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: amount > currentParticipant.points ? 'not-allowed' : 'pointer',
                        opacity: amount > currentParticipant.points ? 0.5 : 1,
                      }}
                    >
                      💎 {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowSympathyModal(false)}>Отмена</button>
                <button
                  className="submit-btn"
                  onClick={sendSympathy}
                  disabled={!sympathyTarget || sympathyAmount > currentParticipant.points}
                  style={{ background: 'var(--accent-love)', opacity: sympathyTarget ? 1 : 0.5 }}
                >
                  💝 Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UnifiedMusicPlayer currentUserId={user.id} isPremium={user.status === 'king' || user.status === 'legend'} onPointsDeduct={handlePointsUpdate} />
    </div>
  );
}
