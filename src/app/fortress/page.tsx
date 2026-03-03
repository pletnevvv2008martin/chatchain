'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client, Room } from 'colyseus.js';
import {
  Castle, Swords, Shield, Coins, TreeDeciduous, Mountain, Cog, Drumstick, Zap,
  Crown, Lock, X, ArrowLeft, RefreshCw, Volume2, VolumeX,
  Crosshair, Flag, Eye, Move, ZoomIn, ZoomOut, Heart, Skull, Chest,
  Sparkles, Flame, Users, Map as MapIcon, Compass, Star, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============================================
// ТИПЫ
// ============================================

type RaceId = 'human' | 'elf' | 'dwarf' | 'darkElf' | 'undead' | 'werewolf' | 'orc' | 'mage' | 'vampire' | 'dragonborn';
type NodeType = 'castle' | 'town' | 'village' | 'gold_mine' | 'stone_quarry' | 'lumber_mill' | 'iron_mine' | 'farm' | 'mana_well' | 'monster_lair' | 'teleport' | 'obelisk';

interface Resources {
  gold: number;
  stone: number;
  wood: number;
  iron: number;
  food: number;
  mana: number;
  gems: number;
  teleportScrolls: number;
}

interface Army {
  warriors: number;
  archers: number;
  cavalry: number;
  mages: number;
  totalPower: number;
}

interface Hero {
  id: string;
  name: string;
  currentNodeId: string;
  x: number;
  y: number;
  level: number;
  experience: number;
  army: Army;
  movementPoints: number;
  maxMovement: number;
  attack: number;
  defense: number;
}

interface MapNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  ownerId: string;
  ownerName: string;
  heroId: string;
  garrison: number;
  defense: number;
  connections: string[];
  goldReward: number;
  monsterPower: number;
  monsterType: string;
  terrain: string;
  isTerritory: boolean;
}

interface Teleport {
  id: string;
  name: string;
  x: number;
  y: number;
  targetMapId: string;
  targetTeleportId: string;
  cost: number;
  type: 'teleport' | 'obelisk';
}

interface GameMap {
  id: string;
  name: string;
  theme: string;
  maxPlayers: number;
  currentPlayerCount: number;
  nodes: Map<string, MapNode>;
  teleports: Map<string, Teleport>;
}

interface Player {
  id: string;
  name: string;
  race: RaceId;
  color: string;
  resources: Resources;
  heroes: Map<string, Hero>;
  buildings: Map<string, { id: string; level: number }>;
  castleNodeId: string;
  territory: { centerX: number; centerY: number; radius: number; ownedNodes: string[]; defenseBonus: number };
  score: number;
  battlesWon: number;
  battlesLost: number;
  online: boolean;
  lastActive: number;
  isRegistered: boolean;
  currentMapId: string;
  stats: {
    fortress: { totalGames: number; wins: number; losses: number; score: number; playTime: number };
    mafia: { totalGames: number; wins: number; losses: number; score: number };
    duel: { totalGames: number; wins: number; losses: number; score: number };
    chain: { totalGames: number; wins: number; losses: number; score: number };
    poker: { totalGames: number; wins: number; losses: number; score: number };
  };
}

interface FortressState {
  players: Map<string, Player>;
  maps: Map<string, GameMap>;
  chat: string[];
  turn: number;
  lastUpdate: number;
  gamePhase: string;
  activeMapId: string;
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

const NODE_CONFIG: Record<NodeType, { emoji: string; name: string }> = {
  castle: { emoji: '🏰', name: 'Замок' },
  town: { emoji: '🏘️', name: 'Город' },
  village: { emoji: '🏠', name: 'Деревня' },
  gold_mine: { emoji: '💰', name: 'Золотая шахта' },
  stone_quarry: { emoji: '🪨', name: 'Каменоломня' },
  lumber_mill: { emoji: '🪵', name: 'Лесопилка' },
  iron_mine: { emoji: '⚙️', name: 'Железная шахта' },
  farm: { emoji: '🌾', name: 'Ферма' },
  mana_well: { emoji: '🔮', name: 'Источник маны' },
  monster_lair: { emoji: '🐉', name: 'Логово монстров' },
  teleport: { emoji: '🌀', name: 'Телепорт' },
  obelisk: { emoji: '🗼', name: 'Обелиск' },
};

const FANTASY_MAPS = [
  { id: 'green_valley', name: '🌿 Зелёная Долина', theme: 'forest', bgColor: '#1a472a', description: 'Мирные земли с богатыми ресурсами' },
  { id: 'frozen_peaks', name: '❄️ Ледяные Вершины', theme: 'ice', bgColor: '#1a3a5c', description: 'Холодные горы с редкими кристаллами' },
  { id: 'volcanic_lands', name: '🌋 Вулканические Земли', theme: 'fire', bgColor: '#4a1a1a', description: 'Опасные земли с редкой магмой' },
  { id: 'dark_swamp', name: '🕳️ Тёмное Болото', theme: 'swamp', bgColor: '#1a3a2a', description: 'Зловещие топи с древними артефактами' },
  { id: 'desert_dunes', name: '🏜️ Пустынные Дюны', theme: 'desert', bgColor: '#5a4a2a', description: 'Бескрайние пески с древними гробницами' },
  { id: 'enchanted_forest', name: '🧚 Зачарованный Лес', theme: 'magic', bgColor: '#2a1a4a', description: 'Магический лес с феями и эльфами' },
  { id: 'undead_realm', name: '💀 Царство Нежити', theme: 'undead', bgColor: '#1a1a2a', description: 'Земли проклятых с древними сокровищами' },
  { id: 'dragon_lair', name: '🐉 Логово Драконов', theme: 'dragon', bgColor: '#3a1a1a', description: 'Огненные земли с несметными сокровищами' },
  { id: 'celestial_peaks', name: '☁️ Небесные Вершины', theme: 'sky', bgColor: '#1a2a4a', description: 'Парящие острова с небесными ресурсами' },
  { id: 'abyss_depths', name: '🌊 Бездна Глубин', theme: 'water', bgColor: '#0a2a3a', description: 'Подводные пещеры с затонувшими сокровищами' },
];

const GAME_SERVER = process.env.NEXT_PUBLIC_GAME_SERVER || 'wss://179.61.145.218:2567';

// ============================================
// КОМПОНЕНТЫ
// ============================================

function MapNodeComponent({
  node, isSelected, isMyNode, isEnemyNode, myColor, playerHere, onClick
}: {
  node: MapNode;
  isSelected: boolean;
  isMyNode: boolean;
  isEnemyNode: boolean;
  myColor: string;
  playerHere?: { name: string; color: string; emoji: string };
  onClick: () => void;
}) {
  const config = NODE_CONFIG[node.type] || NODE_CONFIG.village;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Фон узла */}
      <circle
        cx={node.x}
        cy={node.y}
        r={35}
        fill={isMyNode ? myColor : isEnemyNode ? '#dc2626' : node.isTerritory ? '#22c55e' : '#2a2a3a'}
        stroke={isSelected ? '#ffd700' : node.ownerId ? RACE_COLORS.human : '#444'}
        strokeWidth={isSelected ? 3 : 1}
        opacity={0.9}
      />

      {/* Иконка */}
      <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize={24}>
        {node.monsterPower > 0 ? '🐉' : config.emoji}
      </text>

      {/* Информация о монстре */}
      {node.monsterPower > 0 && (
        <text x={node.x} y={node.y + 50} textAnchor="middle" fontSize={10} fill="#ef4444">
          ⚔️{node.monsterPower}
        </text>
      )}

      {/* Гарнизон */}
      {node.garrison > 0 && (
        <text x={node.x} y={node.y - 25} textAnchor="middle" fontSize={10} fill="#22c55e">
          🛡️{node.garrison}
        </text>
      )}

      {/* Игрок на узле */}
      {playerHere && (
        <g>
          <circle cx={node.x + 25} cy={node.y - 25} r={15} fill={playerHere.color} />
          <text x={node.x + 25} y={playerHere.y - 20} textAnchor="middle" fontSize={14}>
            {playerHere.emoji}
          </text>
        </g>
      )}

      {/* Владелец */}
      {node.ownerName && (
        <text x={node.x} y={node.y + 55} textAnchor="middle" fontSize={9} fill="#aaa">
          {node.ownerName.slice(0, 10)}
        </text>
      )}
    </g>
  );
}

function TeleportComponent({
  teleport, onClick, isSelected
}: {
  teleport: Teleport;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle
        cx={teleport.x}
        cy={teleport.y}
        r={30}
        fill={teleport.type === 'obelisk' ? '#8b5cf6' : '#06b6d4'}
        stroke={isSelected ? '#ffd700' : '#fff'}
        strokeWidth={isSelected ? 3 : 1}
        opacity={0.8}
      />
      <text x={teleport.x} y={teleport.y + 5} textAnchor="middle" fontSize={24}>
        {teleport.type === 'obelisk' ? '🗼' : '🌀'}
      </text>
      <text x={teleport.x} y={teleport.y + 45} textAnchor="middle" fontSize={10} fill="#fff">
        {teleport.cost}💰
      </text>
    </g>
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
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Сеть
  const [client, setClient] = useState<Client | null>(null);
  const [room, setRoom] = useState<Room<FortressState> | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>('');

  // Состояние игры
  const [state, setState] = useState<FortressState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [selectedTeleport, setSelectedTeleport] = useState<Teleport | null>(null);
  const [activeTab, setActiveTab] = useState('map');

  // UI
  const [showRaceSelect, setShowRaceSelect] = useState(false);
  const [showMapSelect, setShowMapSelect] = useState(false);
  const [race, setRace] = useState<RaceId>('human');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Чат
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');

  // ============================================
  // ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ
  // ============================================

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('chatchain_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(user.id);
       
      setUserName(user.nickname);
       
      setIsRegistered(true);
    } else {
      // Гость
      const guestId = 'guest-' + Date.now();
       
      setUserId(guestId);
       
      setUserName('Гость');
       
      setIsRegistered(false);
    }
  }, []);

  // ============================================
  // ПОДКЛЮЧЕНИЕ К СЕРВЕРУ
  // ============================================

  useEffect(() => {
    if (!userId || !userName) return;

    const connectToServer = async () => {
      try {
        const gameClient = new Client(GAME_SERVER);
        setClient(gameClient);

        const gameRoom = await gameClient.joinOrCreate<FortressState>('fortress', {
          name: userName,
          userId: userId,
          isRegistered: isRegistered,
          mapId: 'green_valley'
        });

        setRoom(gameRoom);
        setConnected(true);
        setLoading(false);

        // Обработка изменений состояния
        gameRoom.onStateChange((newState) => {
          setState(newState);

          const player = newState.players.get(gameRoom.sessionId);
          if (player) {
            setCurrentPlayer(player);
            setRace(player.race);

            const map = newState.maps.get(player.currentMapId);
            if (map) {
              setCurrentMap(map);
            }
          }
        });

        // Системные сообщения
        gameRoom.onMessage('system_message', (msg) => {
          setChatMessages(prev => [...prev.slice(-50), msg.content]);
        });

        gameRoom.onMessage('error', (msg) => {
          setError(msg.message);
          setTimeout(() => setError(''), 3000);
        });

        gameRoom.onMessage('state_sync', (msg) => {
          console.log('State sync:', msg);
        });

        gameRoom.onMessage('redirect_map', (msg) => {
          console.log('Redirected to map:', msg.mapId);
        });

        gameRoom.onMessage('map_changed', (msg) => {
          console.log('Map changed:', msg.mapId);
        });

        // Ошибки соединения
        gameRoom.onError((code, message) => {
          console.error('Room error:', code, message);
          setError(`Ошибка: ${message}`);
          setConnected(false);
        });

        gameRoom.onLeave((code) => {
          console.log('Left room:', code);
          setConnected(false);
        });

      } catch (err: any) {
        console.error('Connection error:', err);
        setError(`Не удалось подключиться: ${err.message}`);
        setLoading(false);
      }
    };

    connectToServer();

    return () => {
      if (room) {
        room.leave();
      }
    };
  }, [userId, userName, isRegistered]);

  // ============================================
  // ОБРАБОТЧИКИ ДЕЙСТВИЙ
  // ============================================

  const selectRace = (raceId: RaceId) => {
    if (room) {
      room.send('select_race', raceId);
    }
    setRace(raceId);
    localStorage.setItem('chatchain_fortress_race', raceId);
    setShowRaceSelect(false);
  };

  const moveHero = (targetNodeId: string) => {
    if (!room || !currentPlayer) return;
    const heroId = Array.from(currentPlayer.heroes.keys())[0];
    if (heroId) {
      room.send('move_hero', { heroId, targetNodeId });
    }
    setSelectedNode(null);
  };

  const attackNode = (targetNodeId: string) => {
    if (!room || !currentPlayer) return;
    const heroId = Array.from(currentPlayer.heroes.keys())[0];
    if (heroId) {
      room.send('attack_node', { heroId, targetNodeId });
    }
    setSelectedNode(null);
  };

  const captureNode = (targetNodeId: string) => {
    if (!room || !currentPlayer) return;
    const heroId = Array.from(currentPlayer.heroes.keys())[0];
    if (heroId) {
      room.send('capture_node', { heroId, targetNodeId });
    }
    setSelectedNode(null);
  };

  const teleportHero = (teleportId: string) => {
    if (!room || !currentPlayer) return;
    const heroId = Array.from(currentPlayer.heroes.keys())[0];
    if (heroId) {
      room.send('use_teleport', { heroId, teleportId });
    }
    setSelectedTeleport(null);
  };

  const changeMap = (targetMapId: string) => {
    if (!room) return;
    room.send('change_map', { obeliskId: `${currentPlayer?.currentMapId}_obelisk`, targetMapId });
    setShowMapSelect(false);
    setSelectedTeleport(null);
  };

  const endTurn = () => {
    if (room) {
      room.send('end_turn');
    }
  };

  const recruit = (unitType: string, count: number) => {
    if (room) {
      room.send('recruit', { unitType, count });
    }
  };

  const build = (buildingType: string) => {
    if (room) {
      room.send('build', { buildingType });
    }
  };

  const sendChat = () => {
    if (room && chatInput.trim()) {
      room.send('chat', { content: chatInput });
      setChatInput('');
    }
  };

  // ============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const getMapTemplate = (mapId: string) => {
    return FANTASY_MAPS.find(m => m.id === mapId);
  };

  // ============================================
  // РЕНДЕРИНГ
  // ============================================

  // Проверка выбора расы
  useEffect(() => {
    if (!userId || !connected) return;
    const storedRace = localStorage.getItem('chatchain_fortress_race');
    if (!storedRace && currentPlayer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowRaceSelect(true);
    }
  }, [userId, connected, currentPlayer]);

  // Выбор расы
  if (showRaceSelect && connected) {
    return (
      <div className="fortress-page race-select">
        <h1>🏰 Выберите расу</h1>
        <div className="race-grid">
          {Object.entries(RACE_EMOJIS).map(([id, emoji]) => (
            <div key={id} className="race-card" onClick={() => selectRace(id as RaceId)}>
              <span className="race-emoji">{emoji}</span>
              <span className="race-name">{id.charAt(0).toUpperCase() + id.slice(1)}</span>
              <span className="race-bonus">
                {id === 'human' && '💰 +20% экономика'}
                {id === 'elf' && '✨ +50% магия'}
                {id === 'dwarf' && '🛡️ +50% защита'}
                {id === 'darkElf' && '⚔️ +40% атака'}
                {id === 'undead' && '💀 +30% магия'}
                {id === 'werewolf' && '🐺 +50% атака'}
                {id === 'orc' && '💪 +40% атака'}
                {id === 'mage' && '🔮 +100% магия'}
                {id === 'vampire' && '🧛 +30% атака'}
                {id === 'dragonborn' && '🐲 +40% экономика'}
              </span>
            </div>
          ))}
        </div>
        <Styles />
      </div>
    );
  }

  // Загрузка
  if (loading || !connected || !currentPlayer || !currentMap) {
    return (
      <div className="fortress-page loading">
        <Castle className="w-16 h-16 animate-pulse" style={{ color: RACE_COLORS[race] || '#4a90d9' }} />
        <p>Подключение к серверу...</p>
        {error && <p className="error">{error}</p>}
        <Styles />
      </div>
    );
  }

  const mapTemplate = getMapTemplate(currentPlayer.currentMapId);
  const myHero = Array.from(currentPlayer.heroes.values())[0];

  return (
    <div className="fortress-page" style={{ background: `linear-gradient(135deg, ${mapTemplate?.bgColor || '#0d1117'} 0%, #161b22 100%)` }}>
      <BackgroundMusic />

      {/* Шапка */}
      <header className="fortress-header">
        <div className="header-left">
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft size={16} /> Чат</Button></Link>
          <div className="player-info">
            <span className="race-icon">{RACE_EMOJIS[race]}</span>
            <div>
              <h1>{userName}</h1>
              <span>
                ⚔️ {myHero ? formatNumber(myHero.army.totalPower) : 0} •
                👣 {myHero?.movementPoints || 0}/{myHero?.maxMovement || 5} •
                Ход {state?.turn || 1}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="map-selector" onClick={() => setShowMapSelect(true)}>
            <MapIcon size={16} />
            <span>{mapTemplate?.name || 'Карта'}</span>
          </div>
          <Button size="sm" onClick={endTurn} style={{ background: '#22c55e' }}>
            ⏭️ След. ход
          </Button>
        </div>
      </header>

      {/* Ресурсы */}
      <div className="resources-bar">
        {[
          { key: 'gold', emoji: '💰' },
          { key: 'stone', emoji: '🪨' },
          { key: 'wood', emoji: '🪵' },
          { key: 'iron', emoji: '⚙️' },
          { key: 'food', emoji: '🍖' },
          { key: 'mana', emoji: '🔮' },
          { key: 'gems', emoji: '💎' },
        ].map(res => (
          <div key={res.key} className="resource-item">
            <span>{res.emoji}</span>
            <span>{formatNumber((currentPlayer.resources as any)[res.key] || 0)}</span>
          </div>
        ))}
      </div>

      {/* Ошибки */}
      {error && <div className="error-banner">{error}</div>}

      {/* Контент */}
      <div className="main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="main-tabs">
            <TabsTrigger value="map">🗺️ Карта</TabsTrigger>
            <TabsTrigger value="castle">🏰 Замок</TabsTrigger>
            <TabsTrigger value="stats">📊 Стата</TabsTrigger>
            <TabsTrigger value="chat">💬 Чат</TabsTrigger>
          </TabsList>

          {/* Карта */}
          <TabsContent value="map">
            <div className="map-container">
              {/* Панель инструментов */}
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

              {/* SVG карта */}
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
                    transformOrigin: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  {/* Связи между узлами */}
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
                          stroke="#444"
                          strokeWidth={1}
                          opacity={0.5}
                        />
                      );
                    })
                  ))}

                  {/* Узлы карты */}
                  {Array.from(currentMap.nodes.values()).map(node => {
                    const isMyNode = node.ownerId === room?.sessionId;
                    const isEnemyNode = !!node.ownerId && !isMyNode;

                    // Найти игрока на этом узле
                    let playerHere: { name: string; color: string; emoji: string } | undefined;
                    state?.players.forEach(p => {
                      p.heroes.forEach(h => {
                        if (h.currentNodeId === node.id) {
                          playerHere = { name: p.name, color: p.color, emoji: RACE_EMOJIS[p.race] };
                        }
                      });
                    });

                    return (
                      <MapNodeComponent
                        key={node.id}
                        node={node}
                        isSelected={selectedNode?.id === node.id}
                        isMyNode={isMyNode}
                        isEnemyNode={isEnemyNode}
                        myColor={currentPlayer.color}
                        playerHere={playerHere}
                        onClick={() => setSelectedNode(node)}
                      />
                    );
                  })}

                  {/* Телепорты и обелиски */}
                  {Array.from(currentMap.teleports.values()).map(teleport => (
                    <TeleportComponent
                      key={teleport.id}
                      teleport={teleport}
                      isSelected={selectedTeleport?.id === teleport.id}
                      onClick={() => setSelectedTeleport(teleport)}
                    />
                  ))}
                </svg>
              </div>

              {/* Мини-карта */}
              <div className="minimap">
                <div className="minimap-header">
                  <span>{mapTemplate?.name}</span>
                  <span>{currentMap.currentPlayerCount}/{currentMap.maxPlayers}</span>
                </div>
              </div>
            </div>

            {/* Панель выбранного узла */}
            {selectedNode && (
              <div className="selection-panel">
                <div className="panel-header">
                  <h3>{NODE_CONFIG[selectedNode.type]?.emoji} {selectedNode.name}</h3>
                  <button onClick={() => setSelectedNode(null)}><X size={16} /></button>
                </div>
                <div className="panel-content">
                  {selectedNode.monsterPower > 0 && (
                    <p>🐉 Монстры: ⚔️{selectedNode.monsterPower}</p>
                  )}
                  {selectedNode.garrison > 0 && (
                    <p>🛡️ Гарнизон: {selectedNode.garrison}</p>
                  )}
                  {selectedNode.ownerName && (
                    <p>👑 Владелец: {selectedNode.ownerName}</p>
                  )}
                  {selectedNode.goldReward > 0 && (
                    <p>💰 Награда: {selectedNode.goldReward}</p>
                  )}
                </div>
                <div className="panel-actions">
                  {myHero?.currentNodeId && selectedNode.connections.includes(myHero.currentNodeId) && (
                    <>
                      {selectedNode.monsterPower > 0 && (
                        <Button size="sm" style={{ background: '#dc2626' }} onClick={() => attackNode(selectedNode.id)}>
                          ⚔️ Атаковать
                        </Button>
                      )}
                      {selectedNode.ownerId && selectedNode.ownerId !== room?.sessionId && (
                        <Button size="sm" style={{ background: '#dc2626' }} onClick={() => attackNode(selectedNode.id)}>
                          ⚔️ Атаковать (PvP)
                        </Button>
                      )}
                      {!selectedNode.ownerId && !selectedNode.monsterPower && (
                        <Button size="sm" style={{ background: '#22c55e' }} onClick={() => captureNode(selectedNode.id)}>
                          🏴 Захватить
                        </Button>
                      )}
                      {!selectedNode.ownerId && !selectedNode.monsterPower && myHero.movementPoints > 0 && (
                        <Button size="sm" onClick={() => moveHero(selectedNode.id)}>
                          🚶 Переместиться
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Панель телепорта */}
            {selectedTeleport && (
              <div className="selection-panel">
                <div className="panel-header">
                  <h3>{selectedTeleport.type === 'obelisk' ? '🗼' : '🌀'} {selectedTeleport.name}</h3>
                  <button onClick={() => setSelectedTeleport(null)}><X size={16} /></button>
                </div>
                <div className="panel-content">
                  <p>💰 Стоимость: {selectedTeleport.cost}</p>
                  {selectedTeleport.type === 'obelisk' && (
                    <p>🗼 Переход на другую карту</p>
                  )}
                </div>
                <div className="panel-actions">
                  {selectedTeleport.type === 'teleport' && (
                    <Button size="sm" style={{ background: '#06b6d4' }} onClick={() => teleportHero(selectedTeleport.id)}>
                      🌀 Телепортироваться
                    </Button>
                  )}
                  {selectedTeleport.type === 'obelisk' && (
                    <Button size="sm" style={{ background: '#8b5cf6' }} onClick={() => setShowMapSelect(true)}>
                      🗺️ Выбрать карту
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Замок */}
          <TabsContent value="castle">
            <div className="castle-content">
              <h2>🏰 Ваш замок</h2>
              <div className="hero-info">
                <h3>⚔️ {myHero?.name || 'Герой'}</h3>
                <p>Уровень: {myHero?.level || 1}</p>
                <p>Опыт: {myHero?.experience || 0}</p>
                <p>⚔️ Сила армии: {myHero ? formatNumber(myHero.army.totalPower) : 0}</p>
                <p>🗡️ Воины: {myHero?.army.warriors || 0} | 🏹 Лучники: {myHero?.army.archers || 0}</p>
                <p>🐎 Кавалерия: {myHero?.army.cavalry || 0} | 🧙 Маги: {myHero?.army.mages || 0}</p>
              </div>

              <h3 style={{ marginTop: 20 }}>🏗️ Наем войск</h3>
              <div className="recruit-grid">
                <div className="recruit-card" onClick={() => recruit('warriors', 5)}>
                  <span className="recruit-icon">🗡️</span>
                  <span>Воины x5</span>
                  <span className="recruit-cost">250💰 100🍖</span>
                </div>
                <div className="recruit-card" onClick={() => recruit('archers', 5)}>
                  <span className="recruit-icon">🏹</span>
                  <span>Лучники x5</span>
                  <span className="recruit-cost">375💰 150🪵</span>
                </div>
                <div className="recruit-card" onClick={() => recruit('cavalry', 3)}>
                  <span className="recruit-icon">🐎</span>
                  <span>Кавалерия x3</span>
                  <span className="recruit-cost">450💰 150🍖</span>
                </div>
                <div className="recruit-card" onClick={() => recruit('mages', 2)}>
                  <span className="recruit-icon">🧙</span>
                  <span>Маги x2</span>
                  <span className="recruit-cost">400💰 60🔮</span>
                </div>
              </div>

              <h3 style={{ marginTop: 20 }}>🏗️ Постройки</h3>
              <div className="building-list">
                {[
                  { id: 'barracks', name: 'Казарма', icon: '⚔️', cost: '200💰 100🪨' },
                  { id: 'archery', name: 'Стрельбище', icon: '🏹', cost: '250💰 150🪵' },
                  { id: 'stable', name: 'Конюшня', icon: '🐎', cost: '400💰 200🪵' },
                  { id: 'mage_tower', name: 'Башня магов', icon: '🔮', cost: '500💰 300🪨' },
                ].map(b => (
                  <div key={b.id} className="building-card" onClick={() => build(b.id)}>
                    <span className="building-icon">{b.icon}</span>
                    <span>{b.name}</span>
                    <span className="building-cost">{b.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Статистика */}
          <TabsContent value="stats">
            <div className="stats-content">
              <div className="stat-card main-stat">
                <h3>🏰 Fortress</h3>
                <div className="stat-grid">
                  <div><Trophy size={20} /> <span>Очки: {formatNumber(currentPlayer.stats.fortress.score)}</span></div>
                  <div><Star size={20} /> <span>Победы: {currentPlayer.stats.fortress.wins}</span></div>
                  <div><Skull size={20} /> <span>Поражения: {currentPlayer.stats.fortress.losses}</span></div>
                  <div><Cog size={20} /> <span>Игр: {currentPlayer.stats.fortress.totalGames}</span></div>
                  <div><Zap size={20} /> <span>Время: {Math.floor((currentPlayer.stats.fortress.playTime || 0) / 60)}ч</span></div>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <h3>🔫 Mafia</h3>
                  <p>Победы: {currentPlayer.stats.mafia.wins}</p>
                  <p>Поражения: {currentPlayer.stats.mafia.losses}</p>
                </div>
                <div className="stat-card">
                  <h3>⚔️ Duel</h3>
                  <p>Победы: {currentPlayer.stats.duel.wins}</p>
                  <p>Поражения: {currentPlayer.stats.duel.losses}</p>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <h3>🔗 Chain</h3>
                  <p>Очки: {currentPlayer.stats.chain.score}</p>
                  <p>Игр: {currentPlayer.stats.chain.totalGames}</p>
                </div>
                <div className="stat-card">
                  <h3>🃏 Poker</h3>
                  <p>Очки: {currentPlayer.stats.poker.score}</p>
                  <p>Игр: {currentPlayer.stats.poker.totalGames}</p>
                </div>
              </div>

              <div className="stat-card total-stat">
                <h3>📊 Общий счёт</h3>
                <p className="total-score">{formatNumber(currentPlayer.score)}</p>
                <p>Битв выиграно: {currentPlayer.battlesWon}</p>
                <p>Битв проиграно: {currentPlayer.battlesLost}</p>
              </div>
            </div>
          </TabsContent>

          {/* Чат */}
          <TabsContent value="chat">
            <div className="chat-content">
              <div className="chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="chat-message">{msg}</div>
                ))}
              </div>
              <div className="chat-input-container">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendChat()}
                  placeholder="Сообщение..."
                  className="chat-input"
                />
                <Button size="sm" onClick={sendChat}>📤</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Модальное окно выбора карты */}
      {showMapSelect && (
        <div className="modal-overlay" onClick={() => setShowMapSelect(false)}>
          <div className="modal-content map-select-modal" onClick={e => e.stopPropagation()}>
            <h2>🗺️ Выберите карту</h2>
            <div className="maps-grid">
              {FANTASY_MAPS.map(map => {
                const gameMap = state?.maps.get(map.id);
                const playerCount = gameMap?.currentPlayerCount || 0;
                const isFull = playerCount >= 50;
                const isCurrentMap = currentPlayer.currentMapId === map.id;

                return (
                  <div
                    key={map.id}
                    className={`map-card ${isFull ? 'full' : ''} ${isCurrentMap ? 'current' : ''}`}
                    style={{ background: map.bgColor }}
                    onClick={() => !isFull && !isCurrentMap && changeMap(map.id)}
                  >
                    <div className="map-name">{map.name}</div>
                    <div className="map-desc">{map.description}</div>
                    <div className="map-players">
                      👥 {playerCount}/50 {isFull && '🔒'}
                    </div>
                    {isCurrentMap && <Badge>Текущая</Badge>}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => setShowMapSelect(false)}>Закрыть</Button>
          </div>
        </div>
      )}

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
      }

      .fortress-page.loading, .fortress-page.race-select {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
      }

      .race-select h1 {
        font-size: 32px;
        margin-bottom: 20px;
      }

      .race-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        max-width: 800px;
      }

      .race-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }

      .race-card:hover {
        transform: translateY(-5px);
        border-color: #4a90d9;
      }

      .race-emoji {
        font-size: 36px;
        display: block;
        margin-bottom: 8px;
      }

      .race-name {
        font-size: 14px;
        display: block;
        text-transform: capitalize;
      }

      .race-bonus {
        font-size: 10px;
        color: #888;
        margin-top: 4px;
        display: block;
      }

      /* Header */
      .fortress-header {
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 10px 16px;
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
        gap: 8px;
      }

      .race-icon {
        font-size: 28px;
      }

      .player-info h1 {
        font-size: 14px;
        font-weight: 700;
      }

      .player-info span {
        font-size: 11px;
        opacity: 0.7;
      }

      .map-selector {
        background: rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }

      .map-selector:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Resources */
      .resources-bar {
        background: rgba(0, 0, 0, 0.4);
        padding: 8px 16px;
        display: flex;
        justify-content: center;
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .resource-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }

      /* Error banner */
      .error-banner {
        background: #dc2626;
        color: white;
        padding: 8px 16px;
        text-align: center;
        font-size: 14px;
      }

      /* Main Content */
      .main-content {
        height: calc(100vh - 120px);
        overflow: hidden;
      }

      .main-tabs {
        background: rgba(255, 255, 255, 0.05);
        margin: 8px;
        border-radius: 8px;
      }

      .main-tabs button {
        color: rgba(255, 255, 255, 0.6);
      }

      .main-tabs button[data-state="active"] {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* Map Container */
      .map-container {
        position: relative;
        height: calc(100vh - 200px);
        background: #0a0a0a;
        overflow: hidden;
      }

      .map-toolbar {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 10;
        display: flex;
        gap: 8px;
      }

      .map-viewport {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .map-viewport svg {
        width: 100%;
        height: 100%;
      }

      /* Minimap */
      .minimap {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px;
        z-index: 10;
      }

      .minimap-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 11px;
      }

      /* Selection Panel */
      .selection-panel {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px;
        min-width: 200px;
        z-index: 20;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .panel-header h3 {
        font-size: 16px;
      }

      .panel-header button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
      }

      .panel-content p {
        margin-bottom: 6px;
        font-size: 13px;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      /* Castle & Stats */
      .castle-content, .stats-content, .chat-content {
        padding: 20px;
        overflow-y: auto;
        height: calc(100vh - 220px);
      }

      .hero-info {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-top: 16px;
      }

      .recruit-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-top: 12px;
      }

      .recruit-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .recruit-card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }

      .recruit-icon {
        font-size: 24px;
        display: block;
        margin-bottom: 8px;
      }

      .recruit-cost {
        font-size: 11px;
        color: #888;
        display: block;
        margin-top: 4px;
      }

      .building-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .building-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
      }

      .building-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
      }

      .building-cost {
        font-size: 10px;
        color: #888;
        display: block;
        margin-top: 4px;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .stat-card h3 {
        margin-bottom: 12px;
      }

      .stat-grid > div {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .stat-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .total-stat {
        text-align: center;
        margin-top: 20px;
      }

      .total-score {
        font-size: 36px;
        font-weight: bold;
        color: #ffd700;
      }

      /* Chat */
      .chat-messages {
        height: calc(100% - 60px);
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .chat-message {
        padding: 6px 0;
        font-size: 13px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .chat-input-container {
        display: flex;
        gap: 8px;
      }

      .chat-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px 12px;
        color: white;
        font-size: 14px;
      }

      .chat-input:focus {
        outline: none;
        border-color: #4a90d9;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }

      .modal-content {
        background: #1a1a2e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 24px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
      }

      .map-select-modal h2 {
        margin-bottom: 20px;
      }

      .maps-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }

      .map-card {
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.3s;
        border: 2px solid transparent;
      }

      .map-card:hover:not(.full) {
        transform: translateY(-3px);
        border-color: #fff;
      }

      .map-card.full {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .map-card.current {
        border-color: #22c55e;
      }

      .map-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 6px;
      }

      .map-desc {
        font-size: 10px;
        opacity: 0.7;
        margin-bottom: 8px;
      }

      .map-players {
        font-size: 11px;
      }

      /* Music Button */
      .music-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
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
          flex-wrap: wrap;
          gap: 8px;
        }

        .minimap {
          display: none;
        }

        .maps-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .recruit-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .stat-row {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
