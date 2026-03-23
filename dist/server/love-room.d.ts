import { Room, Client } from "colyseus";
import { LoveRoomState, RoundResult } from "./love-schema";
export declare class LoveRoom extends Room<LoveRoomState> {
    maxClients: number;
    roundTimer: NodeJS.Timeout | null;
    resultsTimer: NodeJS.Timeout | null;
    onCreate(options: any): void;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented?: boolean): void;
    onDispose(): void;
    handleChatMessage(client: Client, text: string): void;
    addSystemMessage(text: string): void;
    startRound(): void;
    startRoundTimer(): void;
    endRound(): void;
    calculateResults(): RoundResult;
    handleVote(client: Client, targetId: string, action: string): void;
    skipRound(client: Client): void;
    handleGift(client: Client, targetId: string, giftId: string): void;
}
//# sourceMappingURL=love-room.d.ts.map