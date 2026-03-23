import { Schema, MapSchema, ArraySchema } from "@colyseus/schema";
export type NodeType = 'castle' | 'town' | 'village' | 'gold_mine' | 'stone_quarry' | 'lumber_mill' | 'iron_mine' | 'farm' | 'mana_well' | 'monster_lair' | 'teleport' | 'obelisk';
export type RaceId = 'human' | 'elf' | 'dwarf' | 'darkElf' | 'undead' | 'werewolf' | 'orc' | 'mage' | 'vampire' | 'dragonborn';
export declare class GameStats extends Schema {
    totalGames: number;
    wins: number;
    losses: number;
    score: number;
    playTime: number;
    lastPlayed: string;
    highestScore: number;
}
export declare class AllGamesStats extends Schema {
    fortress: GameStats;
    mafia: GameStats;
    duel: GameStats;
    chain: GameStats;
    poker: GameStats;
}
export declare class Resources extends Schema {
    gold: number;
    stone: number;
    wood: number;
    iron: number;
    food: number;
    mana: number;
    gems: number;
    teleportScrolls: number;
}
export declare class Army extends Schema {
    warriors: number;
    archers: number;
    cavalry: number;
    mages: number;
    totalPower: number;
}
export declare class Hero extends Schema {
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
export declare class CastleTerritory extends Schema {
    centerX: number;
    centerY: number;
    radius: number;
    ownedNodes: ArraySchema<string>;
    defenseBonus: number;
}
export declare class MapNode extends Schema {
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
    connections: ArraySchema<string>;
    goldReward: number;
    monsterPower: number;
    monsterType: string;
    terrain: string;
    isTerritory: boolean;
}
export declare class Teleport extends Schema {
    id: string;
    name: string;
    x: number;
    y: number;
    targetMapId: string;
    targetTeleportId: string;
    cost: number;
    type: "teleport" | "obelisk";
}
export declare class Building extends Schema {
    id: string;
    level: number;
}
export declare class Player extends Schema {
    id: string;
    name: string;
    race: RaceId;
    color: string;
    resources: Resources;
    heroes: MapSchema<Hero, string>;
    buildings: MapSchema<Building, string>;
    castleNodeId: string;
    territory: CastleTerritory;
    score: number;
    battlesWon: number;
    battlesLost: number;
    online: boolean;
    lastActive: number;
    isRegistered: boolean;
    currentMapId: string;
    stats: AllGamesStats;
}
export declare class GameMap extends Schema {
    id: string;
    name: string;
    theme: string;
    maxPlayers: number;
    currentPlayerCount: number;
    nodes: MapSchema<MapNode, string>;
    teleports: MapSchema<Teleport, string>;
}
export declare class FortressState extends Schema {
    players: MapSchema<Player, string>;
    maps: MapSchema<GameMap, string>;
    chat: ArraySchema<string>;
    turn: number;
    lastUpdate: number;
    gamePhase: string;
    activeMapId: string;
}
export declare const RACE_EMOJIS: Record<RaceId, string>;
export declare const RACE_COLORS: Record<RaceId, string>;
export declare const RACE_BONUSES: Record<RaceId, {
    attack: number;
    defense: number;
    magic: number;
    economy: number;
}>;
export declare const NODE_CONFIG: Record<NodeType, {
    emoji: string;
    name: string;
    baseDefense: number;
    production?: {
        resource: string;
        amount: number;
    };
    monsterPower?: number;
    goldReward?: number;
}>;
//# sourceMappingURL=fortress-schema.d.ts.map