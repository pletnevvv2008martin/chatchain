import { Room, Client } from "colyseus";
import { FortressState, Player, MapNode, GameMap } from "./fortress-schema";
import { MapTemplate } from "./fortress-maps";
interface MoveHeroMessage {
    heroId: string;
    targetNodeId: string;
}
interface AttackNodeMessage {
    heroId: string;
    targetNodeId: string;
}
interface CaptureNodeMessage {
    heroId: string;
    targetNodeId: string;
}
interface RecruitMessage {
    unitType: string;
    count: number;
}
interface UseTeleportMessage {
    heroId: string;
    teleportId: string;
}
interface ChangeMapMessage {
    obeliskId: string;
    targetMapId: string;
}
export declare class FortressRoom extends Room<FortressState> {
    maxClients: number;
    mapLimits: Record<string, number>;
    resourceInterval?: ReturnType<typeof setInterval>;
    saveInterval?: ReturnType<typeof setInterval>;
    turnInterval?: ReturnType<typeof setInterval>;
    onCreate(): Promise<void>;
    generateAllMaps(): Promise<void>;
    generateMapNodes(mapTemplate: MapTemplate): MapNode[];
    addTeleportsAndObelisks(gameMap: GameMap, mapTemplate: MapTemplate): void;
    onJoin(client: Client, options: any): Promise<void>;
    onLeave(client: Client): void;
    onDispose(): void;
    getMapPlayerCount(mapId: string): number;
    findFreeMap(): string | null;
    createPlayer(userId: string, userName: string, sessionId: string, mapId: string): Player;
    findFreeNodeForCastle(gameMap: GameMap): MapNode | null;
    handleMoveHero(client: Client, msg: MoveHeroMessage): void;
    handleAttackNode(client: Client, msg: AttackNodeMessage): void;
    handleCaptureNode(client: Client, msg: CaptureNodeMessage): void;
    handleUseTeleport(client: Client, msg: UseTeleportMessage): void;
    handleChangeMap(client: Client, msg: ChangeMapMessage): void;
    handleRecruit(client: Client, msg: RecruitMessage): void;
    handleBuild(client: Client, buildingType: string): void;
    updateResources(): void;
    broadcastSystemMessage(content: string): void;
    savePlayers(): Promise<void>;
    loadPlayers(): Promise<void>;
}
export {};
//# sourceMappingURL=fortress-room.d.ts.map