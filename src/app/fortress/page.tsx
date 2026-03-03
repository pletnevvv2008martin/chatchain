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
  Tavern, Dice1, Wifi, WifiOff
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
  currentNodeId?: string;
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

const NODE_STYLES: Record<string, {
  emoji: string;
  name: string;
  color: string;
  glowColor: string;
  description: string;
}> = {
  castle: { emoji: '🏰', name: 'Замок', color: '#8b5cf6', glowColor: '#a78bfa', description: 'Ваш главный оплот' },
  town: { emoji: '🏘️', name: 'Город', color: '#3b82f6', glowColor: '#60a5fa', description: 'Приносит +20 золота/ход' },
  village: { emoji: '🏠', name: 'Деревня', color: '#22c55e', glowColor: '#4ade80', description: 'Приносит +15 еды/ход' },
  gold_mine: { emoji: '💰', name: 'Золотая шахта', color: '#eab308', glowColor: '#fde047', description: 'Приносит +30 золота/ход' },
  stone_quarry: { emoji: '🪨', name: 'Каменоломня', color: '#6b7280', glowColor: '#9ca3af', description: 'Приносит +25 камня/ход' },
  lumber_mill: { emoji: '🪵', name: 'Лесопилка', color: '#92400e', glowColor: '#d97706', description: 'Приносит +20 дерева/ход' },
  iron_mine: { emoji: '⚙️', name: 'Железный рудник', color: '#475569', glowColor: '#64748b', description: 'Приносит +15 железа/ход' },
  farm: { emoji: '🌾', name: 'Ферма', color: '#84cc16', glowColor: '#a3e635', description: 'Приносит +25 еды/ход' },
  mana_well: { emoji: '🔮', name: 'Источник маны', color: '#8b5cf6', glowColor: '#c4b5fd', description: 'Приносит +10 маны/ход' },
  monster_lair: { emoji: '🐉', name: 'Логово монстров', color: '#dc2626', glowColor: '#f87171', description: 'Победите монстров для награды' },
  teleport: { emoji: '🌀', name: 'Телепорт', color: '#06b6d4', glowColor: '#22d3ee', description: 'Мгновенное перемещение' },
  obelisk: { emoji: '🗼', name: 'Обелиск', color: '#7c3aed', glowColor: '#a78bfa', description: 'Переход на другую карту' },
  tavern: { emoji: '🍺', name: 'Таверна', color: '#f59e0b', glowColor: '#fbbf24', description: 'Призовите героя!' },
};

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
      
      <circle
        cx={node.x}
        cy={node.y}
        r={42}
        fill={`url(#nodeGradient-${node.type})`}
        stroke={isSelected ? '#ffd700' : isMyNode ? myColor : style.color}
        strokeWidth={isSelected ? 4 : 2}
        className="node-body"
      />
      
      <text x={node.x} y={node.y + 8} textAnchor="middle" fontSize={32} className="node-emoji">
        {style.emoji}
      </text>
      
      {node.monsterPower > 0 && (
        <g>
          <circle cx={node.x + 30} cy={node.y - 30} r={18} fill="#dc2626" opacity={0.9} />
          <text x={node.x + 30} y={node.y - 25} textAnchor="middle" fontSize={14} fill="white">⚔️</text>
          <text x={node.x + 30} y={node.y - 10} textAnchor="middle" fontSize={10} fill="white">{node.monsterPower}</text>
        </g>
      )}
      
      {node.garrison > 0 && (
        <g>
          <circle cx={node.x - 30} cy={node.y - 30} r={16} fill={isMyNode ? '#22c55e' : '#6b7280'} opacity={0.9} />
          <text x={node.x - 30} y={node.y - 26} textAnchor="middle" fontSize={12} fill="white">🛡️</text>
        </g>
      )}
      
      {hasHero && (
        <g className="hero-marker">
          <circle cx={node.x} cy={node.y + 55} r={20} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
          <text x={node.x} y={node.y + 60} textAnchor="middle" fontSize={18}>⚔️</text>
        </g>
      )}
      
      {(hover || isSelected) && (
        <g>
          <rect x={node.x - 60} y={node.y - 75} width={120} height={24} rx={8} fill="rgba(0,0,0,0.8)" stroke={style.color} />
          <text x={node.x} y={node.y - 58} textAnchor="middle" fontSize={12} fill="white" fontWeight="bold">
            {style.name}
          </text>
        </g>
      )}
      
      {node.ownerName && (
        <text x={node.x} y={node.y + 75} textAnchor="middle" fontSize={10} fill="#888">
          {node.ownerName.slice(0, 12)}
        </text>
      )}
      
      <defs>
        <radialGradient id={`nodeGradient-${node.type}`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={style.glowColor} />
          <stop offset="100%" stopColor={style.color} />
        </radialGradient>
      </defs>
    </g>
  );
}

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
            Добро пожаловать, путник! Призовите героя себе на службу!
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
                  <div className="rolling-dots"><span>.</span><span>.</span><span>.</span></div>
                </div>
              ) : (
                <Button onClick={handleSummon} className="summon-btn">
                  <Dice1 size={20} />
                  <span>Призвать героя!</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
          <div className="result-icon">{result.won ? '🏆' : '💀'}</div>
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
  const gameRoom = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
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

  // ============================================
  // ИНИЦИАЛИЗАЦИЯ ЛОКАЛЬНОЙ ИГРЫ (FALLBACK)
  // ============================================
  
  const initLocalGame = useCallback(() => {
    console.log('🎮 Инициализация локальной игры...');
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
    console.log('✅ Локальная игра инициализирована');
  }, [userId, userName]);

  // ============================================
  // ПОДКЛЮЧЕНИЕ К СЕРВЕРУ
  // ============================================
  
  const connectToServer = useCallback(async () => {
    if (!userId || !userName) return;
    
    console.log('🔌 Подключение к серверу:', GAME_SERVER);
    
    try {
      const client = new Client(GAME_SERVER);
      
      const room = await client.joinOrCreate('fortress', {
        name: userName,
        userId: userId,
        isRegistered: true,
        mapId: 'green_valley'
      });
      
      console.log('✅ Подключено к комнате:', room.sessionId);
      gameRoom.current = room;
      setConnected(true);
      setIsOnline(true);
      setLoading(false);
      
      // Обработка сообщений от сервера
      room.onMessage('state_sync', (data: any) => {
        console.log('📡 State sync:', data);
      });
      
      room.onMessage('error', (data: any) => {
        console.error('❌ Server error:', data.message);
        setError(data.message);
      });
      
      room.onMessage('system_message', (data: any) => {
        console.log('💬 System:', data.content);
      });
      
      room.onMessage('map_changed', (data: any) => {
        console.log('🗺️ Map changed:', data.mapId);
      });
      
      // Синхронизация состояния
      room.onStateChange((state: any) => {
        console.log('🔄 State changed');
        
        // Получаем данные игрока
        if (state.players && room.sessionId) {
          const serverPlayer = state.players.get(room.sessionId);
          if (serverPlayer) {
            const playerData: Player = {
              id: serverPlayer.id || userId,
              name: serverPlayer.name || userName,
              race: serverPlayer.race || 'human',
              color: serverPlayer.color || RACE_COLORS.human,
              resources: serverPlayer.resources ? {
                gold: serverPlayer.resources.gold || 0,
                stone: serverPlayer.resources.stone || 0,
                wood: serverPlayer.resources.wood || 0,
                iron: serverPlayer.resources.iron || 0,
                food: serverPlayer.resources.food || 0,
                mana: serverPlayer.resources.mana || 0,
                gems: serverPlayer.resources.gems || 0
              } : { gold: 500, stone: 200, wood: 200, iron: 100, food: 300, mana: 50, gems: 0 },
              heroes: [],
              castleNodeId: serverPlayer.castleNodeId || '',
              score: serverPlayer.score || 0,
              battlesWon: serverPlayer.battlesWon || 0,
              battlesLost: serverPlayer.battlesLost || 0,
              currentMapId: serverPlayer.currentMapId || 'green_valley'
            };
            
            // Получаем героев
            if (serverPlayer.heroes) {
              const heroes: Hero[] = [];
              serverPlayer.heroes.forEach((h: any) => {
                heroes.push({
                  id: h.id,
                  name: h.name,
                  class: 'Воин',
                  emoji: '⚔️',
                  x: h.x,
                  y: h.y,
                  level: h.level || 1,
                  experience: h.experience || 0,
                  hp: 100,
                  maxHp: 100,
                  attack: h.army?.totalPower ? Math.floor(h.army.totalPower / 10) : 20,
                  defense: 10,
                  armyPower: h.army?.totalPower || 100,
                  movementPoints: h.movementPoints || 5,
                  maxMovement: h.maxMovement || 5,
                  skills: ['Удар'],
                  currentNodeId: h.currentNodeId
                });
              });
              playerData.heroes = heroes;
              if (heroes.length > 0) {
                setHero(heroes[0]);
                setHeroLocation(heroes[0].currentNodeId || null);
              }
            }
            
            setPlayer(playerData);
            setShowRaceSelect(!serverPlayer.race || serverPlayer.race === 'human');
          }
        }
        
        // Получаем карту
        if (state.maps) {
          const mapId = 'green_valley';
          const serverMap = state.maps.get(mapId);
          if (serverMap) {
            const gameMap: GameMap = {
              id: mapId,
              name: serverMap.name || 'Зелёная Долина',
              theme: serverMap.theme || 'forest',
              nodes: new Map()
            };
            
            if (serverMap.nodes) {
              serverMap.nodes.forEach((n: any) => {
                gameMap.nodes.set(n.id, {
                  id: n.id,
                  type: n.type,
                  name: n.name,
                  x: n.x,
                  y: n.y,
                  ownerId: n.ownerId,
                  ownerName: n.ownerName,
                  garrison: n.garrison,
                  defense: n.defense,
                  connections: Array.from(n.connections || []),
                  goldReward: n.goldReward || 0,
                  monsterPower: n.monsterPower || 0,
                  monsterType: 'Дракон',
                  terrain: n.terrain || '🌿',
                  isTerritory: n.isTerritory || false
                });
              });
            }
            
            setCurrentMap(gameMap);
          }
        }
      });
      
      room.onLeave(() => {
        console.log('👋 Disconnected from server');
        setConnected(false);
        setIsOnline(false);
      });
      
      room.onError((err: any) => {
        console.error('❌ Room error:', err);
        setError('Ошибка соединения с сервером');
        setIsOnline(false);
        initLocalGame();
      });
      
    } catch (err: any) {
      console.error('❌ Connection failed:', err.message);
      setError('Не удалось подключиться к серверу - оффлайн режим');
      setIsOnline(false);
      initLocalGame();
    }
  }, [userId, userName, initLocalGame]);

  // Загрузка пользователя
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('chatchain_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(user.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserName(user.nickname);
    } else {
      router.push('/');
    }
  }, [router]);

  // Инициализация игры - сначала пробуем сервер
  useEffect(() => {
    if (!userId || !userName) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connectToServer();
  }, [userId, userName, connectToServer]);

  // ============================================
  // ИГРОВЫЕ ДЕЙСТВИЯ
  // ============================================

  const selectRace = (raceId: RaceId) => {
    setRace(raceId);
    localStorage.setItem('chatchain_fortress_race', raceId);
    setShowRaceSelect(false);
    if (gameRoom.current) {
      gameRoom.current.send('select_race', raceId);
    }
  };

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
    
    if (gameRoom.current) {
      gameRoom.current.send('summon_hero', { heroClass: heroClass.class });
    }
    
    if (player && currentMap) {
      const castle = Array.from(currentMap.nodes.values()).find(n => n.type === 'castle' && n.ownerId === userId);
      if (castle) {
        setHeroLocation(castle.id);
        newHero.currentNodeId = castle.id;
      }
    }
  };

  const moveHero = (targetNodeId: string) => {
    if (!hero || hero.movementPoints <= 0) return;
    
    setHeroLocation(targetNodeId);
    setHero(prev => prev ? { ...prev, movementPoints: prev.movementPoints - 1, currentNodeId: targetNodeId } : null);
    
    if (gameRoom.current && hero) {
      gameRoom.current.send('move_hero', { heroId: hero.id, targetNodeId });
    }
  };

  const attackNode = (node: MapNode) => {
    if (!hero) return;
    
    if (node.monsterPower > 0) {
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
        
        if (currentMap) {
          const updatedNode = currentMap.nodes.get(node.id);
          if (updatedNode) {
            updatedNode.monsterPower = 0;
            updatedNode.type = 'village';
          }
        }
      } else {
        setHero(prev => prev ? { ...prev, hp: Math.max(1, prev.hp - 50) } : null);
        setBattleResult({
          won: false,
          message: `${node.monsterType} оказался сильнее!`,
          rewards: { gold: 0, food: 0, iron: 0, stone: 0, wood: 0, mana: 0, gems: 0 }
        });
      }
      
      if (gameRoom.current) {
        gameRoom.current.send('attack_node', { heroId: hero.id, targetNodeId: node.id });
      }
    }
    
    setSelectedNode(null);
  };

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
    
    if (gameRoom.current) {
      gameRoom.current.send('capture_node', { heroId: hero.id, targetNodeId: node.id });
    }
    
    setSelectedNode(null);
  };

  const nextTurn = () => {
    if (hero) {
      setHero(prev => prev ? { ...prev, movementPoints: prev.maxMovement } : null);
    }
    
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
    
    if (gameRoom.current) {
      gameRoom.current.send('end_turn');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const mapTemplate = FANTASY_MAPS.find(m => m.id === player?.currentMapId) || FANTASY_MAPS[0];

  // ============================================
  // РЕНДЕР
  // ============================================

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
          <p className="loading-status">{isOnline ? '🌐 Подключение к серверу...' : '🎮 Оффлайн режим'}</p>
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
                {isOnline ? <Wifi size={12} className="online-icon" /> : <WifiOff size={12} className="offline-icon" />}
                {hero ? ` ⚔️ ${formatNumber(hero.armyPower)} • 👣 ${hero.movementPoints}/${hero.maxMovement}` : ' Нет героя'}
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

      {/* Нет героя */}
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
            {selectedNode.type === 'tavern' && !hero && (
              <Button onClick={() => setShowTavern(true)} className="action-btn tavern-action">
                🍺 Войти в таверну
              </Button>
            )}
            
            {hero && hero.movementPoints > 0 && heroLocation !== selectedNode.id && (
              <Button onClick={() => moveHero(selectedNode.id)} className="action-btn move-action">
                🚶 Переместиться
              </Button>
            )}
            
            {hero && selectedNode.monsterPower > 0 && heroLocation === selectedNode.id && (
              <Button onClick={() => attackNode(selectedNode)} className="action-btn attack-action">
                ⚔️ Атаковать!
              </Button>
            )}
            
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

      .fortress-page.loading, .fortress-page.race-select {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0a1f0a 0%, #0d1117 100%);
      }

      .loading-content, .race-select-content {
        text-align: center;
      }

      .loading-status {
        font-size: 12px;
        color: #888;
        margin-top: 8px;
      }

      .online-icon { color: #22c55e; margin-right: 4px; }
      .offline-icon { color: #f97316; margin-right: 4px; }

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

      .fortress-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        z-index: 100;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .header-left, .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .player-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .race-icon {
        font-size: 28px;
      }

      .player-info h1 {
        font-size: 16px;
        margin: 0;
      }

      .player-info span {
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
      }

      .resources-bar {
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        height: 40px;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        z-index: 99;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .resource-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .resource-emoji {
        font-size: 16px;
      }

      .resource-value {
        font-size: 14px;
        font-weight: bold;
      }

      .error-banner {
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(220, 38, 38, 0.9);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 101;
      }

      .no-hero-message {
        position: fixed;
        top: 120px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 98;
      }

      .message-content {
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid rgba(139, 92, 246, 0.4);
        padding: 16px 24px;
        border-radius: 12px;
        text-align: center;
      }

      .message-content h2 {
        font-size: 18px;
        margin: 0 0 8px;
      }

      .message-content p {
        font-size: 14px;
        color: #ccc;
        margin: 0 0 12px;
      }

      .tavern-btn {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: none;
      }

      .map-container {
        position: fixed;
        top: 100px;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
      }

      .map-toolbar {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        gap: 8px;
        z-index: 50;
      }

      .map-viewport {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .node-glow {
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }

      .hero-marker {
        animation: bounce 1s ease-in-out infinite;
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      .selection-panel {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 16px;
        border-radius: 16px;
        min-width: 300px;
        z-index: 60;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .panel-header h3 {
        margin: 0;
        font-size: 18px;
      }

      .panel-header button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
      }

      .panel-description {
        font-size: 14px;
        color: #888;
        margin: 0 0 12px;
      }

      .monster-info {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .monster-badge, .monster-power, .monster-reward {
        background: rgba(220, 38, 38, 0.3);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .action-btn {
        flex: 1;
      }

      .move-action { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; }
      .attack-action { background: linear-gradient(135deg, #dc2626, #b91c1c); border: none; }
      .capture-action { background: linear-gradient(135deg, #22c55e, #16a34a); border: none; }
      .tavern-action { background: linear-gradient(135deg, #f59e0b, #d97706); border: none; }

      .hero-panel {
        position: fixed;
        bottom: 16px;
        left: 16px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 12px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 60;
      }

      .hero-avatar {
        font-size: 36px;
      }

      .hero-name {
        font-size: 14px;
        font-weight: bold;
      }

      .hero-bars {
        width: 120px;
        margin-top: 4px;
      }

      .bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        position: relative;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #dc2626, #ef4444);
        border-radius: 4px;
      }

      .bar span {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-size: 10px;
        white-space: nowrap;
      }

      .hero-stats-mini {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        font-size: 11px;
        color: #888;
      }

      /* Модальные окна */
      .tavern-modal, .battle-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
      }

      .tavern-content, .battle-content {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #f59e0b;
        border-radius: 20px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
      }

      .tavern-header, .battle-result h2 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .tavern-header h2, .battle-result h2 {
        margin: 0;
        font-size: 24px;
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
        text-align: center;
        margin-bottom: 20px;
      }

      .summon-area {
        display: flex;
        justify-content: center;
      }

      .summon-btn {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: none;
        padding: 16px 32px;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .rolling-hero {
        text-align: center;
      }

      .hero-emoji.large {
        font-size: 64px;
        display: block;
        animation: shake 0.1s infinite;
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      .rolling-dots span {
        animation: dot 1s infinite;
        font-size: 24px;
      }

      .rolling-dots span:nth-child(2) { animation-delay: 0.2s; }
      .rolling-dots span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes dot {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }

      .summoned-hero {
        text-align: center;
      }

      .hero-card {
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid rgba(139, 92, 246, 0.4);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 16px;
      }

      .hero-card .hero-emoji {
        font-size: 48px;
        margin-bottom: 8px;
      }

      .hero-card h3 {
        margin: 0 0 4px;
        color: #fbbf24;
      }

      .hero-class {
        color: #888;
        margin: 0 0 12px;
      }

      .hero-stats {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-bottom: 8px;
      }

      .hero-skill {
        color: #a78bfa;
        margin: 0;
      }

      .close-btn {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border: none;
        width: 100%;
      }

      .battle-result {
        text-align: center;
      }

      .result-icon {
        font-size: 64px;
        margin-bottom: 16px;
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
        background: rgba(34, 197, 94, 0.2);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 16px;
      }

      .music-btn {
        position: fixed;
        bottom: 16px;
        right: 16px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 60;
        color: white;
      }

      .turn-btn {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        border: none;
      }

      @media (max-width: 768px) {
        .race-grid {
          grid-template-columns: repeat(2, 1fr);
          max-width: 320px;
        }

        .hero-panel {
          left: 8px;
          right: 8px;
          bottom: 8px;
        }

        .selection-panel {
          left: 8px;
          right: 8px;
          transform: none;
          min-width: auto;
        }
      }
    `}</style>
  );
}
