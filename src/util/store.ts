import { atom, onMount } from "nanostores"
import { type CoreMessage } from "ai";
import { computed } from "nanostores";
import { Langfuse } from "langfuse";

export const CONTENT_MODE = {
    CHAT: "chat",
    CRAFTING_TABLE: "craftingTable",
    WRITE: "write",
}  

export type Conversation = {
    id: string;
    title: string;
    messages: CoreMessage[];
}

export const contentMode = atom(CONTENT_MODE.CHAT);

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

// get prompts from langfuse
