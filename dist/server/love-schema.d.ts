import { Schema, MapSchema, ArraySchema } from "@colyseus/schema";
export type RoundType = 'waiting' | 'kiss' | 'choose_pair' | 'who_likes' | 'truth_or_dare';
export type VoteAction = 'kiss' | 'wink' | 'skip' | 'like';
export declare class LoveGift extends Schema {
    id: string;
    emoji: string;
    name: string;
    fromId: string;
    fromName: string;
    timestamp: number;
}
export declare class LovePlayer extends Schema {
    id: string;
    sessionId: string;
    name: string;
    age: number;
    city: string;
    gender: string;
    avatar: string;
    bio: string;
    rating: number;
    level: number;
    exp: number;
    isOnline: boolean;
    isVerified: boolean;
    isRegistered: boolean;
    gifts: ArraySchema<string>;
    joinedAt: number;
    lastActive: number;
    kissCount: number;
    winkCount: number;
    likeCount: number;
}
export declare class LoveMessage extends Schema {
    id: string;
    playerId: string;
    playerName: string;
    playerAvatar: string;
    text: string;
    timestamp: number;
    isSystem: boolean;
}
export declare class LoveVote extends Schema {
    voterId: string;
    targetId: string;
    action: string;
    timestamp: number;
}
export declare class RoundResult extends Schema {
    type: string;
    icon: string;
    title: string;
    data: string;
    timestamp: number;
}
export declare class LoveRoomState extends Schema {
    roomId: string;
    roomName: string;
    maxPlayers: number;
    isSandbox: boolean;
    players: MapSchema<LovePlayer, string>;
    playerCount: number;
    roundType: RoundType;
    roundNumber: number;
    roundTimer: number;
    roundDuration: number;
    roundActive: boolean;
    votes: MapSchema<LoveVote, string>;
    voteCount: number;
    lastResult: RoundResult;
    showResults: boolean;
    messages: ArraySchema<string>;
    createdAt: number;
    totalRounds: number;
    totalKisses: number;
    totalWinks: number;
    totalLikes: number;
}
export declare const ROUND_CONFIG: Record<RoundType, {
    name: string;
    icon: string;
    duration: number;
    description: string;
}>;
export declare const GIFT_ITEMS: {
    id: string;
    emoji: string;
    name: string;
    price: number;
}[];
//# sourceMappingURL=love-schema.d.ts.map