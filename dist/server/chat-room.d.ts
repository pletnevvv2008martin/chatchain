import { Room, Client } from "colyseus";
import { ChatRoomState, ChatMessage, ChatEvents } from "./chat-schema";
export declare class ChatRoom extends Room<ChatRoomState> {
    maxClients: number;
    messageHistory: ChatMessage[];
    maxHistorySize: number;
    onCreate(options: any): void;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented?: boolean): void;
    onDispose(): void;
    handleSendMessage(client: Client, data: ChatEvents['send_message']): void;
    handleEditMessage(client: Client, data: ChatEvents['edit_message']): void;
    handleDeleteMessage(client: Client, data: ChatEvents['delete_message']): void;
    handleReaction(client: Client, data: ChatEvents['add_reaction']): void;
    handleTyping(client: Client, isTyping: boolean): void;
    countOnlineUsers(): number;
}
//# sourceMappingURL=chat-room.d.ts.map