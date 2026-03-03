'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client, Room } from 'colyseus.js';
import {
  Castle, Swords, Shield, Coins, TreeDeciduous, Mountain, Cog, Drumstick, Zap,
  Crown, Lock, X, ArrowLeft, RefreshCw, Volume2, VolumeX,
  Crosshair, Flag, Eye, Move, ZoomIn, ZoomOut, Heart, Skull, Chest,
  Sparkles, Flame, Users, Map as MapIcon, Compass, Star, Trophy,
  Tavern, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================
// ТИПЫ
// ============================================

type RaceId = 'human' | 'elf' | 'dwarf' | 'darkElf' | 'undead' | 'werewolf' | 'orc' | 'mage' | 'vampire' | 'dragonborn';
type NodeType = 'castle' | 'town' | 'village' | 'gold_mine' | 'stone_quarry' | 'lumber_mill' | 'iron_mine' | 'farm' | 'mana_well' | 'monster_lair' | 'teleport' | 'obelisk' | 'tavern';

interface Resources {
  gold: number;
  stone: number;
  wood: number;
  iron: number;
  food: number;
  mana: number;
  gems: number;
}

interface Hero {
  id: string;
  name: string;
  class: string;
  emoji: string;
  x: number;
  y: number;
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  armyPower: number;
  movementPoints: number;
  maxMovement: number;
  skills: string[];
}

interface MapNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  ownerId: string;
  ownerName: string;
  garrison: number;
  defense: number;
  connections: string[];
  goldReward: number;
  monsterPower: number;
  monsterType: string;
  terrain: string;
  isTerritory: boolean;
}

interface GameMap {
  id: string;
  name: string;
  theme: string;
  nodes: Map<string, MapNode>;
}

interface Player {
  id: string;
  name: string;
  race: RaceId;
  color: string;
  resources: Resources;
  heroes: Hero[];
  castleNodeId: string;
  score: number;
  battlesWon: number;
  battlesLost: number;
  currentMapId: string;
}

// ============================================
// КОНСТАНТЫ
// ============================================

const RACE_EMOJIS: Record<RaceId, string> = {
  human: '👤', elf: '🧝', dwarf: '🪓', darkElf: '🦇', undead: '🦴',
  werewolf: '🐺', orc: '🧌', mage: '🧙', vampire: '🧛', dragonborn: '🐲'
};

const RACE_COLORS: Record<RaceId, string> = {
  human: '#4a90d9', elf: '#4ade80', dwarf: '#f59e0b', darkElf: '#a855f7',
  undead: '#2dd4bf', werewolf: '#78716c', orc: '#84cc16', mage: '#3b82f6',
  vampire: '#dc2626', dragonborn: '#f97316'
};

// Красивые конфиги для объектов
const NODE_STYLES: Record<string, {
  emoji: string;
  name: string;
  color: string;
  glowColor: string;
  description: string;
  icon: string;
}> = {
  castle: { 
    emoji: '🏰', name: 'Замок', color: '#8b5cf6', glowColor: '#a78bfa',
    description: 'Ваш главный оплот', icon: '👑'
  },
  town: { 
    emoji: '🏘️', name: 'Город', color: '#3b82f6', glowColor: '#60a5fa',
    description: 'Приносит +20 золота/ход', icon: '🏪'
  },
  village: { 
    emoji: '🏠', name: 'Деревня', color: '#22c55e', glowColor: '#4ade80',
    description: 'Приносит +15 еды/ход', icon: '🌾'
  },
  gold_mine: { 
    emoji: '💰', name: 'Золотая шахта', color: '#eab308', glowColor: '#fde047',
    description: 'Приносит +30 золота/ход', icon: '⛏️'
  },
  stone_quarry: { 
    emoji: '🪨', name: 'Каменоломня', color: '#6b7280', glowColor: '#9ca3af',
    description: 'Приносит +25 камня/ход', icon: '🔨'
  },
  lumber_mill: { 
    emoji: '🪵', name: 'Лесопилка', color: '#92400e', glowColor: '#d97706',
    description: 'Приносит +20 дерева/ход', icon: '🪓'
  },
  iron_mine: { 
    emoji: '⚙️', name: 'Железный рудник', color: '#475569', glowColor: '#64748b',
    description: 'Приносит +15 железа/ход', icon: '🔧'
  },
  farm: { 
    emoji: '🌾', name: 'Ферма', color: '#84cc16', glowColor: '#a3e635',
    description: 'Приносит +25 еды/ход', icon: '🐄'
  },
  mana_well: { 
    emoji: '🔮', name: 'Источник маны', color: '#8b5cf6', glowColor: '#c4b5fd',
    description: 'Приносит +10 маны/ход', icon: '✨'
  },
  monster_lair: { 
    emoji: '🐉', name: 'Логово монстров', color: '#dc2626', glowColor: '#f87171',
    description: 'Победите монстров для награды', icon: '⚔️'
  },
  teleport: { 
    emoji: '🌀', name: 'Телепорт', color: '#06b6d4', glowColor: '#22d3ee',
    description: 'Мгновенное перемещение', icon: '💫'
  },
  obelisk: { 
    emoji: '🗼', name: 'Обелиск', color: '#7c3aed', glowColor: '#a78bfa',
    description: 'Переход на другую карту', icon: '🌟'
  },
  tavern: { 
    emoji: '🍺', name: 'Таверна', color: '#f59e0b', glowColor: '#fbbf24',
    description: 'Призовите героя бесплатно!', icon: '🎲'
  },
};

// Классы героев для таверны
const HERO_CLASSES = [
  { class: 'warrior', name: 'Воин', emoji: '⚔️', hp: 150, attack: 25, defense: 15, skill: 'Мощный удар' },
  { class: 'mage', name: 'Маг', emoji: '🔮', hp: 80, attack: 35, defense: 5, skill: 'Огненный шар' },
  { class: 'ranger', name: 'Следопыт', emoji: '🏹', hp: 100, attack: 20, defense: 10, skill: 'Меткий выстрел' },
  { class: 'paladin', name: 'Паладин', emoji: '🛡️', hp: 130, attack: 18, defense: 20, skill: 'Святой свет' },
  { class: 'rogue', name: 'Разбойник', emoji: '🗡️', hp: 90, attack: 30, defense: 8, skill: 'Скрытность' },
  { class: 'necromancer', name: 'Некромант', emoji: '💀', hp: 85, attack: 32, defense: 6, skill: 'Воскрешение' },
  { class: 'druid', name: 'Друид', emoji: '🌿', hp: 110, attack: 22, defense: 12, skill: 'Призыв зверей' },
  { class: 'berserker', name: 'Берсерк', emoji: '🪓', hp: 140, attack: 35, defense: 5, skill: 'Ярость' },
];

const FANTASY_MAPS = [
  { id: 'green_valley', name: '🌿 Зелёная Долина', theme: 'forest', bgColor: '#0a1f0a', particleColor: '#22c55e' },
  { id: 'frozen_peaks', name: '❄️ Ледяные Вершины', theme: 'ice', bgColor: '#0a1a2e', particleColor: '#60a5fa' },
  { id: 'volcanic_lands', name: '🌋 Вулканические Земли', theme: 'fire', bgColor: '#1f0a0a', particleColor: '#f97316' },
  { id: 'dark_swamp', name: '🕳️ Тёмное Болото', theme: 'swamp', bgColor: '#0a1a12', particleColor: '#84cc16' },
  { id: 'desert_dunes', name: '🏜️ Пустынные Дюны', theme: 'desert', bgColor: '#1f1a0a', particleColor: '#fbbf24' },
  { id: 'enchanted_forest', name: '🧚 Зачарованный Лес', theme: 'magic', bgColor: '#1a0a2e', particleColor: '#a78bfa' },
  { id: 'undead_realm', name: '💀 Царство Нежити', theme: 'undead', bgColor: '#0f0f1a', particleColor: '#6b7280' },
  { id: 'dragon_lair', name: '🐉 Логово Драконов', theme: 'dragon', bgColor: '#1a0a0a', particleColor: '#dc2626' },
  { id: 'celestial_peaks', name: '☁️ Небесные Вершины', theme: 'sky', bgColor: '#0a1a2e', particleColor: '#e0f2fe' },
  { id: 'abyss_depths', name: '🌊 Бездна Глубин', theme: 'water', bgColor: '#0a0f1f', particleColor: '#0ea5e9' },
];

const GAME_SERVER = process.env.NEXT_PUBLIC_GAME_SERVER || 'ws://179.61.145.218:2567';

// ============================================
// КОМПОНЕНТЫ
// ============================================

// Анимированные частицы на фоне
function ParticleBackground({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: { x: number; y: number; size: number; speedY: number; speedX: number; opacity: number }[] = [];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedY: Math.random() * 0.5 + 0.1,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    
    let animationId: number;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
        
        p.y -= p.speedY;
        p.x += p.speedX;
        
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, [color]);
  
  return <canvas ref={canvasRef} className="particle-canvas" />;
}

// Анимированный узел карты
function MapNodeComponent({
  node, isSelected, isMyNode, isEnemyNode, myColor, hasHero, onClick
}: {
  node: MapNode;
  isSelected: boolean;
  isMyNode: boolean;
  isEnemyNode: boolean;
  myColor: string;
  hasHero: boolean;
  onClick: () => void;
}) {
  const style = NODE_STYLES[node.type] || NODE_STYLES.village;
  const [hover, setHover] = useState(false);

  return (
    <g 
      onClick={onClick} 
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Внешнее свечение */}
      <circle
        cx={node.x}
        cy={node.y}
        r={isSelected ? 55 : 50}
        fill="none"
        stroke={isMyNode ? myColor : isEnemyNode ? '#dc2626' : style.glowColor}
        strokeWidth={isSelected ? 4 : 2}
        opacity={hover || isSelected ? 0.8 : 0.3}
        className="node-glow"
      />
      
      {/* Основной круг */}
      <circle
        cx={node.x}
        cy={node.y}
        r={42}
        fill={`url(#nodeGradient-${node.type})`}
        stroke={isSelected ? '#ffd700' : isMyNode ? myColor : style.color}
        strokeWidth={isSelected ? 4 : 2}
        className="node-body"
      />
      
      {/* Иконка объекта */}
      <text 
        x={node.x} 
        y={node.y + 8} 
        textAnchor="middle" 
        fontSize={32}
        className="node-emoji"
      >
        {style.emoji}
      </text>
      
      {/* Индикатор монстра */}
      {node.monsterPower > 0 && (
        <g>
          <circle cx={node.x + 30} cy={node.y - 30} r={18} fill="#dc2626" opacity={0.9} />
          <text x={node.x + 30} y={node.y - 25} textAnchor="middle" fontSize={14} fill="white">⚔️</text>
          <text x={node.x + 30} y={node.y - 10} textAnchor="middle" fontSize={10} fill="white">{node.monsterPower}</text>
        </g>
      )}
      
      {/* Индикатор гарнизона */}
      {node.garrison > 0 && (
        <g>
          <circle cx={node.x - 30} cy={node.y - 30} r={16} fill={isMyNode ? '#22c55e' : '#6b7280'} opacity={0.9} />
          <text x={node.x - 30} y={node.y - 26} textAnchor="middle" fontSize={12} fill="white">🛡️</text>
        </g>
      )}
      
      {/* Герой на узле */}
      {hasHero && (
        <g className="hero-marker">
          <circle cx={node.x} cy={node.y + 55} r={20} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
          <text x={node.x} y={node.y + 60} textAnchor="middle" fontSize={18}>⚔️</text>
        </g>
      )}
      
      {/* Название при наведении */}
      {(hover || isSelected) && (
        <g>
          <rect
            x={node.x - 60}
            y={node.y - 75}
            width={120}
            height={24}
            rx={8}
            fill="rgba(0,0,0,0.8)"
            stroke={style.color}
          />
          <text
            x={node.x}
            y={node.y - 58}
            textAnchor="middle"
            fontSize={12}
            fill="white"
            fontWeight="bold"
          >
            {style.name}
          </text>
        </g>
      )}
      
      {/* Владелец */}
      {node.ownerName && (
        <text x={node.x} y={node.y + 75} textAnchor="middle" fontSize={10} fill="#888">
          {node.ownerName.slice(0, 12)}
        </text>
      )}
      
      {/* Градиент для узла */}
      <defs>
        <radialGradient id={`nodeGradient-${node.type}`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={style.glowColor} />
          <stop offset="100%" stopColor={style.color} />
        </radialGradient>
      </defs>
    </g>
  );
}

// Компонент Таверны
function TavernModal({
  isOpen, onClose, onSummon, summonedHero
}: {
  isOpen: boolean;
  onClose: () => void;
  onSummon: () => void;
  summonedHero: Hero | null;
}) {
  const [rolling, setRolling] = useState(false);
  const [displayHero, setDisplayHero] = useState(0);

  const handleSummon = () => {
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDisplayHero(Math.floor(Math.random() * HERO_CLASSES.length));
      count++;
      if (count > 15) {
        clearInterval(interval);
        setRolling(false);
        onSummon();
      }
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="tavern-modal" onClick={onClose}>
      <div className="tavern-content" onClick={e => e.stopPropagation()}>
        <div className="tavern-header">
          <h2>🍺 Таверна</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="tavern-body">
          <p className="tavern-description">
            Добро пожаловать, путник! Здесь ты можешь призвать героя себе на службу.
            Первое посещение — бесплатно!
          </p>
          
          {summonedHero ? (
            <div className="summoned-hero">
              <div className="hero-card">
                <div className="hero-emoji">{summonedHero.emoji}</div>
                <h3>{summonedHero.name}</h3>
                <p className="hero-class">{summonedHero.class}</p>
                <div className="hero-stats">
                  <span>❤️ {summonedHero.hp}/{summonedHero.maxHp}</span>
                  <span>⚔️ {summonedHero.attack}</span>
                  <span>🛡️ {summonedHero.defense}</span>
                </div>
                <p className="hero-skill">✨ {summonedHero.skills[0]}</p>
              </div>
              <Button onClick={onClose} className="close-btn">Отправиться в путь!</Button>
            </div>
          ) : (
            <div className="summon-area">
              {rolling ? (
                <div className="rolling-hero">
                  <span className="hero-emoji large">{HERO_CLASSES[displayHero].emoji}</span>
                  <div className="rolling-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              ) : (
                <Button onClick={handleSummon} className="summon-btn">
                  <Dice1 size={20} />
                  <span>Призвать героя!</span>
                  <span className="free-badge">БЕСПЛАТНО</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Компонент боя
function BattleModal({
  isOpen, onClose, result
}: {
  isOpen: boolean;
  onClose: () => void;
  result: { won: boolean; message: string; rewards: Resources } | null;
}) {
  if (!isOpen || !result) return null;

  return (
    <div className="battle-modal" onClick={onClose}>
      <div className="battle-content" onClick={e => e.stopPropagation()}>
        <div className={`battle-result ${result.won ? 'victory' : 'defeat'}`}>
          <div className="result-icon">
            {result.won ? '🏆' : '💀'}
          </div>
          <h2>{result.won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}</h2>
          <p>{result.message}</p>
          {result.won && (
            <div className="rewards">
              {Object.entries(result.rewards).map(([key, value]) => value > 0 && (
                <span key={key} className="reward-item">
                  {key === 'gold' ? '💰' : key === 'food' ? '🍖' : '⭐'} +{value}
                </span>
              ))}
            </div>
          )}
          <Button onClick={onClose}>Продолжить</Button>
        </div>
      </div>
    </div>
  );
}

// Музыка
function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const toggleMusic = useCallback(() => {
    if (!isPlaying) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      [130.81, 164.81, 196.00, 246.94].forEach((freq) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.012;
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        oscillatorsRef.current.push(osc);
      });
      setIsPlaying(true);
    } else {
      oscillatorsRef.current.forEach(osc => { try { osc.stop(); } catch {} });
      oscillatorsRef.current = [];
      audioContextRef.current?.close();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  return (
    <button className="music-btn" onClick={toggleMusic}>
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

export default function FortressPage() {
  const router = useRouter();

  // Пользователь
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Сеть
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>('');

  // Игра
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [hero, setHero] = useState<Hero | null>(null);
  const [heroLocation, setHeroLocation] = useState<string | null>(null);

  // UI
  const [showRaceSelect, setShowRaceSelect] = useState(false);
  const [showTavern, setShowTavern] = useState(false);
  const [race, setRace] = useState<RaceId>('human');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [summonedHero, setSummonedHero] = useState<Hero | null>(null);
  const [battleResult, setBattleResult] = useState<{ won: boolean; message: string; rewards: Resources } | null>(null);

  // Локальная игра (оффлайн режим) - определяется до использования
  const initLocalGame = useCallback(() => {
    const mapId = 'green_valley';
    const nodes = new Map<string, MapNode>();
    
    const nodeTypes: NodeType[] = ['town', 'village', 'gold_mine', 'farm', 'lumber_mill', 'monster_lair', 'tavern'];
    let nodeId = 0;
    
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        const id = `node_${nodeId}`;
        const x = 100 + col * 120 + (row % 2) * 60;
        const y = 100 + row * 100;
        
        let type: NodeType = row === 3 && col === 4 ? 'castle' : nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        
        const node: MapNode = {
          id,
          type,
          name: NODE_STYLES[type]?.name || 'Unknown',
          x,
          y,
          ownerId: row === 3 && col === 4 ? userId : '',
          ownerName: row === 3 && col === 4 ? userName : '',
          garrison: row === 3 && col === 4 ? 50 : 0,
          defense: 20,
          connections: [],
          goldReward: type === 'monster_lair' ? Math.floor(Math.random() * 500) + 200 : 0,
          monsterPower: type === 'monster_lair' ? Math.floor(Math.random() * 200) + 50 : 0,
          monsterType: type === 'monster_lair' ? 'Дракон' : '',
          terrain: '🌿',
          isTerritory: false
        };
        
        nodes.set(id, node);
        nodeId++;
      }
    }
    
    nodes.forEach((node, id) => {
      const num = parseInt(id.split('_')[1]);
      const row = Math.floor(num / 8);
      const col = num % 8;
      
      if (col < 7) node.connections.push(`node_${num + 1}`);
      if (col > 0) node.connections.push(`node_${num - 1}`);
      if (row < 5) node.connections.push(`node_${num + 8}`);
      if (row > 0) node.connections.push(`node_${num - 8}`);
    });
    
    const map: GameMap = {
      id: mapId,
      name: '🌿 Зелёная Долина',
      theme: 'forest',
      nodes
    };
    
    const localPlayer: Player = {
      id: userId,
      name: userName,
      race: 'human',
      color: RACE_COLORS.human,
      resources: { gold: 500, stone: 200, wood: 200, iron: 100, food: 300, mana: 50, gems: 0 },
      heroes: [],
      castleNodeId: 'node_28',
      score: 0,
      battlesWon: 0,
      battlesLost: 0,
      currentMapId: mapId
    };
    
    setPlayer(localPlayer);
    setCurrentMap(map);
    setConnected(true);
    setLoading(false);
    setShowRaceSelect(true);
  }, [userId, userName]);

  // Загрузка пользователя
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('chatchain_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(user.id);
       
      setUserName(user.nickname);
    } else {
      router.push('/');
    }
  }, [router]);

  // Инициализация игры
  useEffect(() => {
    if (!userId || !userName) return;
    
    // Сразу запускаем локальную игру (оффлайн режим)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initLocalGame();
  }, [userId, userName, initLocalGame]);

  // Выбор расы
  const selectRace = (raceId: RaceId) => {
    setRace(raceId);
    localStorage.setItem('chatchain_fortress_race', raceId);
    setShowRaceSelect(false);
    if (room) {
      room.send('select_race', raceId);
    }
  };

  // Призыв героя
  const summonHero = () => {
    const heroClass = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)];
    const newHero: Hero = {
      id: `hero_${Date.now()}`,
      name: `${heroClass.name} ${userName}`,
      class: heroClass.name,
      emoji: heroClass.emoji,
      x: 0,
      y: 0,
      level: 1,
      experience: 0,
      hp: heroClass.hp,
      maxHp: heroClass.hp,
      attack: heroClass.attack,
      defense: heroClass.defense,
      armyPower: 100,
      movementPoints: 5,
      maxMovement: 5,
      skills: [heroClass.skill]
    };
    
    setSummonedHero(newHero);
    setHero(newHero);
    
    if (room) {
      room.send('summon_hero', { heroClass: heroClass.class });
    }
    
    // Ставим героя в замок
    if (player && currentMap) {
      const castle = Array.from(currentMap.nodes.values()).find(n => n.type === 'castle' && n.ownerId === userId);
      if (castle) {
        setHeroLocation(castle.id);
      }
    }
  };

  // Движение героя
  const moveHero = (targetNodeId: string) => {
    if (!hero || hero.movementPoints <= 0) return;
    
    setHeroLocation(targetNodeId);
    setHero(prev => prev ? { ...prev, movementPoints: prev.movementPoints - 1 } : null);
    
    if (room) {
      room.send('move_hero', { heroId: hero.id, targetNodeId });
    }
  };

  // Атака
  const attackNode = (node: MapNode) => {
    if (!hero) return;
    
    if (node.monsterPower > 0) {
      // Бой с монстром
      const heroPower = hero.attack + hero.armyPower * 0.5;
      const won = heroPower > node.monsterPower * (0.5 + Math.random() * 0.5);
      
      if (won) {
        const losses = Math.floor(hero.hp * 0.2);
        setHero(prev => prev ? { 
          ...prev, 
          hp: Math.max(1, prev.hp - losses),
          experience: prev.experience + node.monsterPower
        } : null);
        
        setBattleResult({
          won: true,
          message: `Победа над ${node.monsterType}!`,
          rewards: { gold: node.goldReward, food: 50, iron: 0, stone: 0, wood: 0, mana: 0, gems: 0 }
        });
        
        // Обновляем карту
        if (currentMap) {
          const updatedNode = currentMap.nodes.get(node.id);
          if (updatedNode) {
            updatedNode.monsterPower = 0;
            updatedNode.type = 'village';
          }
        }
      } else {
        setHero(prev => prev ? { 
          ...prev, 
          hp: Math.max(1, prev.hp - 50)
        } : null);
        
        setBattleResult({
          won: false,
          message: `${node.monsterType} оказался сильнее!`,
          rewards: { gold: 0, food: 0, iron: 0, stone: 0, wood: 0, mana: 0, gems: 0 }
        });
      }
    }
    
    setSelectedNode(null);
  };

  // Захват узла
  const captureNode = (node: MapNode) => {
    if (!hero || heroLocation !== node.id) return;
    
    if (currentMap) {
      const updatedNode = currentMap.nodes.get(node.id);
      if (updatedNode) {
        updatedNode.ownerId = userId;
        updatedNode.ownerName = userName;
        updatedNode.garrison = 10;
      }
    }
    
    setSelectedNode(null);
  };

  // Следующий ход
  const nextTurn = () => {
    if (hero) {
      setHero(prev => prev ? { ...prev, movementPoints: prev.maxMovement } : null);
    }
    
    // Начисляем ресурсы
    if (player && currentMap) {
      let goldBonus = 50;
      let foodBonus = 20;
      
      currentMap.nodes.forEach(node => {
        if (node.ownerId === userId) {
          if (node.type === 'gold_mine') goldBonus += 30;
          if (node.type === 'farm') foodBonus += 25;
          if (node.type === 'town') goldBonus += 20;
        }
      });
      
      setPlayer(prev => prev ? {
        ...prev,
        resources: {
          ...prev.resources,
          gold: prev.resources.gold + goldBonus,
          food: prev.resources.food + foodBonus
        }
      } : null);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const mapTemplate = FANTASY_MAPS.find(m => m.id === player?.currentMapId) || FANTASY_MAPS[0];

  // Рендер
  if (showRaceSelect) {
    return (
      <div className="fortress-page race-select">
        <div className="race-select-content">
          <h1>🏰 Выберите расу</h1>
          <p className="race-subtitle">Каждая раса имеет уникальные бонусы</p>
          <div className="race-grid">
            {Object.entries(RACE_EMOJIS).map(([id, emoji]) => (
              <div key={id} className="race-card" onClick={() => selectRace(id as RaceId)}>
                <span className="race-emoji">{emoji}</span>
                <span className="race-name">{id.charAt(0).toUpperCase() + id.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
        <Styles />
      </div>
    );
  }

  if (loading || !player || !currentMap) {
    return (
      <div className="fortress-page loading">
        <div className="loading-content">
          <Castle className="w-20 h-20 animate-pulse" style={{ color: RACE_COLORS[race] || '#4a90d9' }} />
          <p>Загрузка мира...</p>
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div className="fortress-page" style={{ background: mapTemplate.bgColor }}>
      <ParticleBackground color={mapTemplate.particleColor} />
      <BackgroundMusic />

      {/* Шапка */}
      <header className="fortress-header">
        <div className="header-left">
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
          <div className="player-info">
            <span className="race-icon">{RACE_EMOJIS[race]}</span>
            <div>
              <h1>{userName}</h1>
              <span>
                {hero ? `⚔️ ${formatNumber(hero.armyPower)} • 👣 ${hero.movementPoints}/${hero.maxMovement}` : 'Нет героя'}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          {hero && (
            <Button size="sm" onClick={nextTurn} className="turn-btn">
              ⏭️ След. ход
            </Button>
          )}
        </div>
      </header>

      {/* Ресурсы */}
      <div className="resources-bar">
        {[
          { key: 'gold', emoji: '💰' },
          { key: 'wood', emoji: '🪵' },
          { key: 'stone', emoji: '🪨' },
          { key: 'food', emoji: '🍖' },
          { key: 'mana', emoji: '🔮' },
        ].map(res => (
          <div key={res.key} className="resource-item">
            <span className="resource-emoji">{res.emoji}</span>
            <span className="resource-value">{formatNumber((player.resources as any)[res.key] || 0)}</span>
          </div>
        ))}
      </div>

      {/* Ошибки */}
      {error && <div className="error-banner">{error}</div>}

      {/* Нет героя - призыв */}
      {!hero && (
        <div className="no-hero-message">
          <div className="message-content">
            <h2>🗡️ У вас пока нет героя</h2>
            <p>Найдите таверну на карте и призовите героя!</p>
            <Button onClick={() => setShowTavern(true)} className="tavern-btn">
              🍺 Открыть таверну
            </Button>
          </div>
        </div>
      )}

      {/* Карта */}
      <div className="map-container">
        <div className="map-toolbar">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
            <ZoomIn size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
            <ZoomOut size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>
            <RefreshCw size={16} />
          </Button>
        </div>

        <div
          className="map-viewport"
          onMouseDown={e => { setIsDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }}
          onMouseMove={e => { if (isDragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            {/* Связи */}
            {Array.from(currentMap.nodes.values()).map(node => (
              node.connections.map(connId => {
                const connNode = currentMap.nodes.get(connId);
                if (!connNode || node.id >= connId) return null;
                return (
                  <line
                    key={`${node.id}-${connId}`}
                    x1={node.x}
                    y1={node.y}
                    x2={connNode.x}
                    y2={connNode.y}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={2}
                  />
                );
              })
            ))}

            {/* Узлы */}
            {Array.from(currentMap.nodes.values()).map(node => {
              const isMyNode = node.ownerId === userId;
              const isEnemyNode = !!node.ownerId && !isMyNode;
              const hasHeroHere = heroLocation === node.id;
              
              return (
                <MapNodeComponent
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                  isMyNode={isMyNode}
                  isEnemyNode={isEnemyNode}
                  myColor={player.color}
                  hasHero={hasHeroHere}
                  onClick={() => setSelectedNode(node)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Панель выбранного узла */}
      {selectedNode && (
        <div className="selection-panel">
          <div className="panel-header">
            <h3>{NODE_STYLES[selectedNode.type]?.emoji} {NODE_STYLES[selectedNode.type]?.name}</h3>
            <button onClick={() => setSelectedNode(null)}><X size={16} /></button>
          </div>
          <p className="panel-description">{NODE_STYLES[selectedNode.type]?.description}</p>
          
          {selectedNode.monsterPower > 0 && (
            <div className="monster-info">
              <span className="monster-badge">⚔️ {selectedNode.monsterType}</span>
              <span className="monster-power">Сила: {selectedNode.monsterPower}</span>
              <span className="monster-reward">Награда: 💰 {selectedNode.goldReward}</span>
            </div>
          )}
          
          <div className="panel-actions">
            {/* Таверна */}
            {selectedNode.type === 'tavern' && !hero && (
              <Button onClick={() => setShowTavern(true)} className="action-btn tavern-action">
                🍺 Войти в таверну
              </Button>
            )}
            
            {/* Движение */}
            {hero && hero.movementPoints > 0 && heroLocation !== selectedNode.id && (
              <Button onClick={() => moveHero(selectedNode.id)} className="action-btn move-action">
                🚶 Переместиться
              </Button>
            )}
            
            {/* Атака монстра */}
            {hero && selectedNode.monsterPower > 0 && heroLocation === selectedNode.id && (
              <Button onClick={() => attackNode(selectedNode)} className="action-btn attack-action">
                ⚔️ Атаковать!
              </Button>
            )}
            
            {/* Захват */}
            {hero && !selectedNode.ownerId && !selectedNode.monsterPower && heroLocation === selectedNode.id && (
              <Button onClick={() => captureNode(selectedNode)} className="action-btn capture-action">
                🏴 Захватить
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Информация о герое */}
      {hero && (
        <div className="hero-panel">
          <div className="hero-avatar">{hero.emoji}</div>
          <div className="hero-info">
            <span className="hero-name">{hero.name}</span>
            <div className="hero-bars">
              <div className="bar hp-bar">
                <div className="bar-fill" style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }}></div>
                <span>❤️ {hero.hp}/{hero.maxHp}</span>
              </div>
            </div>
            <div className="hero-stats-mini">
              <span>⚔️ {hero.attack}</span>
              <span>🛡️ {hero.defense}</span>
              <span>👣 {hero.movementPoints}/{hero.maxMovement}</span>
            </div>
          </div>
        </div>
      )}

      {/* Модальные окна */}
      <TavernModal 
        isOpen={showTavern} 
        onClose={() => setShowTavern(false)} 
        onSummon={summonHero}
        summonedHero={summonedHero}
      />
      
      <BattleModal
        isOpen={!!battleResult}
        onClose={() => setBattleResult(null)}
        result={battleResult}
      />

      <Styles />
    </div>
  );
}

// ============================================
// СТИЛИ
// ============================================

function Styles() {
  return (
    <style jsx global>{`
      .fortress-page {
        min-height: 100vh;
        color: #ffffff;
        position: relative;
        overflow: hidden;
      }

      .particle-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
      }

      /* Loading & Race Select */
      .fortress-page.loading, .fortress-page.race-select {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0a1f0a 0%, #0d1117 100%);
      }

      .loading-content, .race-select-content {
        text-align: center;
      }

      .race-select h1 {
        font-size: 42px;
        margin-bottom: 8px;
        background: linear-gradient(to right, #fbbf24, #f59e0b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .race-subtitle {
        color: #888;
        margin-bottom: 32px;
      }

      .race-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        max-width: 700px;
      }

      .race-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .race-card:hover {
        transform: translateY(-5px);
        border-color: #fbbf24;
        box-shadow: 0 10px 30px rgba(251, 191, 36, 0.2);
      }

      .race-emoji {
        font-size: 36px;
        display: block;
        margin-bottom: 8px;
      }

      .race-name {
        font-size: 12px;
        text-transform: capitalize;
        color: #ccc;
      }

      /* Header */
      .fortress-header {
        position: relative;
        z-index: 10;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-left, .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .player-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .race-icon {
        font-size: 32px;
      }

      .player-info h1 {
        font-size: 14px;
        font-weight: 700;
      }

      .player-info span {
        font-size: 11px;
        color: #888;
      }

      .turn-btn {
        background: linear-gradient(to right, #22c55e, #16a34a) !important;
        border: none !important;
        font-weight: 600;
      }

      /* Resources */
      .resources-bar {
        position: relative;
        z-index: 10;
        background: rgba(0, 0, 0, 0.5);
        padding: 10px 16px;
        display: flex;
        justify-content: center;
        gap: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .resource-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .resource-emoji {
        font-size: 18px;
      }

      .resource-value {
        font-size: 14px;
        font-weight: 600;
        color: #fbbf24;
      }

      /* Error */
      .error-banner {
        position: relative;
        z-index: 10;
        background: #dc2626;
        color: white;
        padding: 8px 16px;
        text-align: center;
      }

      /* No Hero Message */
      .no-hero-message {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 50;
        text-align: center;
      }

      .no-hero-message .message-content {
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #fbbf24;
        border-radius: 20px;
        padding: 40px;
        animation: pulse-glow 2s infinite;
      }

      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
        50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
      }

      .no-hero-message h2 {
        font-size: 24px;
        margin-bottom: 12px;
        color: #fbbf24;
      }

      .no-hero-message p {
        color: #888;
        margin-bottom: 20px;
      }

      .tavern-btn {
        background: linear-gradient(to right, #f59e0b, #d97706) !important;
        border: none !important;
        font-size: 16px !important;
        padding: 12px 24px !important;
      }

      /* Map */
      .map-container {
        position: relative;
        z-index: 5;
        height: calc(100vh - 130px);
        overflow: hidden;
      }

      .map-toolbar {
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 10;
        display: flex;
        gap: 8px;
      }

      .map-viewport {
        width: 100%;
        height: 100%;
      }

      /* Node Animations */
      .node-glow {
        animation: glow-pulse 2s infinite;
      }

      @keyframes glow-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }

      .node-body {
        transition: all 0.2s ease;
      }

      .hero-marker {
        animation: hero-bounce 1s infinite;
      }

      @keyframes hero-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      /* Selection Panel */
      .selection-panel {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 20px;
        min-width: 300px;
        z-index: 20;
        backdrop-filter: blur(10px);
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .panel-header h3 {
        font-size: 18px;
        font-weight: 600;
      }

      .panel-header button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
      }

      .panel-description {
        color: #888;
        font-size: 13px;
        margin-bottom: 12px;
      }

      .monster-info {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .monster-badge {
        background: #dc2626;
        padding: 4px 12px;
        border-radius: 8px;
        font-size: 12px;
      }

      .monster-power {
        color: #f87171;
        font-size: 12px;
      }

      .monster-reward {
        color: #fbbf24;
        font-size: 12px;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .action-btn {
        flex: 1;
        min-width: 120px;
      }

      .tavern-action { background: linear-gradient(to right, #f59e0b, #d97706) !important; }
      .move-action { background: linear-gradient(to right, #3b82f6, #2563eb) !important; }
      .attack-action { background: linear-gradient(to right, #dc2626, #b91c1c) !important; }
      .capture-action { background: linear-gradient(to right, #22c55e, #16a34a) !important; }

      /* Hero Panel */
      .hero-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 20;
      }

      .hero-avatar {
        font-size: 48px;
        background: linear-gradient(to bottom right, #fbbf24, #f59e0b);
        border-radius: 12px;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .hero-name {
        font-weight: 600;
        font-size: 14px;
      }

      .hero-bars .bar {
        width: 150px;
        height: 16px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        overflow: hidden;
        position: relative;
      }

      .bar-fill {
        height: 100%;
        background: linear-gradient(to right, #ef4444, #dc2626);
        transition: width 0.3s ease;
      }

      .bar span {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
      }

      .hero-stats-mini {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #888;
      }

      /* Tavern Modal */
      .tavern-modal, .battle-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }

      .tavern-content, .battle-content {
        background: linear-gradient(to bottom, #1a1a2e, #0f0f1a);
        border: 2px solid #f59e0b;
        border-radius: 24px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
      }

      .tavern-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .tavern-header h2 {
        font-size: 28px;
        color: #fbbf24;
      }

      .tavern-header button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
      }

      .tavern-description {
        color: #888;
        margin-bottom: 24px;
        line-height: 1.6;
      }

      .summon-btn {
        background: linear-gradient(to right, #f59e0b, #d97706) !important;
        border: none !important;
        padding: 16px 32px !important;
        font-size: 16px !important;
        display: flex !important;
        align-items: center;
        gap: 12px;
        margin: 0 auto;
      }

      .free-badge {
        background: #22c55e;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
      }

      .rolling-hero {
        padding: 40px;
      }

      .hero-emoji.large {
        font-size: 80px;
        display: block;
        animation: roll 0.1s infinite;
      }

      @keyframes roll {
        0% { transform: rotate(-5deg); }
        50% { transform: rotate(5deg); }
        100% { transform: rotate(-5deg); }
      }

      .rolling-dots span {
        animation: blink 0.5s infinite;
      }

      .rolling-dots span:nth-child(2) { animation-delay: 0.1s; }
      .rolling-dots span:nth-child(3) { animation-delay: 0.2s; }

      @keyframes blink {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }

      .summoned-hero {
        text-align: center;
      }

      .hero-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid #fbbf24;
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
      }

      .hero-card .hero-emoji {
        font-size: 64px;
        margin-bottom: 12px;
      }

      .hero-card h3 {
        font-size: 20px;
        margin-bottom: 4px;
      }

      .hero-class {
        color: #fbbf24;
        margin-bottom: 12px;
      }

      .hero-stats {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-bottom: 12px;
      }

      .hero-skill {
        color: #22c55e;
        font-size: 14px;
      }

      .close-btn {
        background: linear-gradient(to right, #22c55e, #16a34a) !important;
        border: none !important;
      }

      /* Battle Modal */
      .battle-result {
        padding: 20px;
      }

      .battle-result.victory .result-icon { font-size: 80px; animation: victory 0.5s ease; }
      .battle-result.defeat .result-icon { font-size: 80px; animation: defeat 0.5s ease; }

      @keyframes victory {
        0% { transform: scale(0) rotate(-180deg); }
        100% { transform: scale(1) rotate(0deg); }
      }

      @keyframes defeat {
        0% { transform: translateY(-50px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }

      .battle-result.victory h2 { color: #22c55e; }
      .battle-result.defeat h2 { color: #dc2626; }

      .rewards {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin: 16px 0;
      }

      .reward-item {
        background: rgba(251, 191, 36, 0.2);
        padding: 8px 16px;
        border-radius: 8px;
        color: #fbbf24;
      }

      /* Music Button */
      .music-btn {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .race-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .resources-bar {
          gap: 12px;
        }

        .hero-panel {
          right: 10px;
          left: 10px;
          bottom: 100px;
          transform: none;
        }

        .selection-panel {
          left: 10px;
          right: 10px;
          transform: none;
          min-width: auto;
        }
      }
    `}</style>
  );
}
