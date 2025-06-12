import { atom, onMount } from "nanostores"
import { type CoreMessage } from "ai";
import { computed } from "nanostores";
import { Langfuse } from "langfuse";

export const CONTENT_MODE = {
    CHAT: "chat",
    CRAFTING_TABLE: "craftingTable",
    WRITE: "write",
} as const;

export type Conversation = {
    id: string;
    title: string;
    messages: CoreMessage[];
}

export const contentMode = atom<typeof CONTENT_MODE[keyof typeof CONTENT_MODE]>(CONTENT_MODE.CHAT);

export const conversations = atom<Conversation[]>([]);
export const currentConversationId = atom<string | null>(null);

// Dynamic atom for the current conversation
export const currentConversation = computed(
    [conversations, currentConversationId],
    (convs, id) => convs.find(c => c.id === id) ?? null
);

// Computed atom to check if conversation is empty
export const conversationEmpty = computed(
    [currentConversation],
    (conversation) => !conversation || conversation.messages.length === 0
);

// Actions for managing conversations
export function addConversation(conversation: Conversation) {
    const currentConversations = conversations.get();
    conversations.set([...currentConversations, conversation]);
}

export function createNewConversation(title: string = "New Chat"): string {
    const id = crypto.randomUUID();
    const newConversation: Conversation = {
        id,
        title,
        messages: []
    };
    
    addConversation(newConversation);
    setCurrentConversation(id);
    
    return id;
}

export function generateTitleFromMessage(message: string): string {
    // Truncate at 20 characters and add ellipsis if needed
    const truncated = message.trim().substring(0, 20);
    return truncated.length < message.trim().length ? truncated + "..." : truncated;
}

export function updateConversation(id: string, updates: Partial<Conversation>) {
    const currentConversations = conversations.get();
    conversations.set(
        currentConversations.map(conv => 
            conv.id === id ? { ...conv, ...updates } : conv
        )
    );
}

export function deleteConversation(id: string) {
    const currentConversations = conversations.get();
    conversations.set(currentConversations.filter(conv => conv.id !== id));
    
    // If we're deleting the current conversation, clear the current ID
    if (currentConversationId.get() === id) {
        currentConversationId.set(null);
    }
}

export function setCurrentConversation(id: string | null) {
    currentConversationId.set(id);
}

// get prompts from langfuse
