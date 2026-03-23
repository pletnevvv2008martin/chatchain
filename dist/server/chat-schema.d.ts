import { Schema, MapSchema, ArraySchema } from "@colyseus/schema";
export declare class ChatMessage extends Schema {
    id: string;
    userId: string;
    userName: string;
    userStatus: string;
    content: string;
    type: string;
    timestamp: number;
    deleted: boolean;
    editedAt: string;
    replyToId: string;
    replyToContent: string;
    replyToUser: string;
    voiceId: string;
    voiceDuration: number;
    reactions: string;
    mentions: ArraySchema<string>;
}
export declare class ChatUser extends Schema {
    id: string;
    sessionId: string;
    nickname: string;
    status: string;
    isOnline: boolean;
    isTyping: boolean;
    lastActive: number;
    joinedAt: number;
}
export declare class ChatRoomState extends Schema {
    roomId: string;
    roomName: string;
    isLobby: boolean;
    password: string;
    ownerId: string;
    users: MapSchema<ChatUser, string>;
    userCount: number;
    messages: ArraySchema<string>;
    messageCount: number;
    createdAt: number;
}
export interface ChatEvents {
    send_message: {
        content: string;
        type: 'text' | 'gif' | 'voice';
        replyTo?: {
            messageId: string;
            content: string;
            user: string;
        };
        voiceId?: string;
        voiceDuration?: number;
        mentions?: string[];
    };
    edit_message: {
        messageId: string;
        content: string;
    };
    delete_message: {
        messageId: string;
    };
    add_reaction: {
        messageId: string;
        emoji: string;
    };
    typing_start: Record<string, never>;
    typing_stop: Record<string, never>;
    message_received: ChatMessage;
    message_edited: {
        messageId: string;
        content: string;
        editedAt: string;
    };
    message_deleted: {
        messageId: string;
    };
    reaction_added: {
        messageId: string;
        reactions: string;
    };
    user_joined: {
        userId: string;
        userName: string;
    };
    user_left: {
        userId: string;
        userName: string;
    };
    user_typing: {
        userId: string;
        userName: string;
        isTyping: boolean;
    };
    online_count: {
        count: number;
    };
    error: {
        message: string;
    };
}
//# sourceMappingURL=chat-schema.d.ts.map