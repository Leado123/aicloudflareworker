import { atom, onMount } from "nanostores";
import { type CoreMessage } from "ai";
import { computed } from "nanostores";
import { Langfuse, LangfuseWeb } from "langfuse";

export const CONTENT_MODE = {
  CHAT: "chat",
  CRAFTING_TABLE: "craftingTable",
  WRITE: "write",
} as const;

export type MessageMetadata = {
  hasAttachments?: boolean;
  attachmentCount?: number;
  suggestedPrompts?: string[];
  showSuggestedPrompts?: boolean;
};

export type ExtendedCoreMessage = Omit<CoreMessage, "content"> & {
  content: string | Record<string, any>;
  metadata?: MessageMetadata;
  attachments?: FileAttachment[];
};

export type FileAttachment = {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded content
};

export type Conversation = {
  id: string;
  title: string;
  messages: ExtendedCoreMessage[];
};

export type Notes = {};

export type StoredFileData = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: string; // base64 encoded file content
};

export type FlashCard = {
  id: string;
  front: string;
  back: string;
  difficulty?: "easy" | "medium" | "hard";
  lastReviewed?: Date;
};

export type CraftingBench = {
  id: string;
  title: string;
  files: File[]; // Runtime files for display
  storedFiles: StoredFileData[]; // Serializable file data for persistence
  notes: string;
  flashcards: FlashCard[];
  lastNotesUpdate?: Date;
  lastFlashcardsUpdate?: Date;
};

export const contentMode = atom<
  (typeof CONTENT_MODE)[keyof typeof CONTENT_MODE]
>(CONTENT_MODE.CHAT);

export const conversations = atom<Conversation[]>([]);
export const currentConversationId = atom<string | null>(null);

export const craftingBenches = atom<CraftingBench[]>([]);
export const currentCraftingBenchId = atom<string | null>(null);

// Dynamic atom for the current conversation
export const currentConversation = computed(
  [conversations, currentConversationId],
  (convs, id) => convs.find((c) => c.id === id) ?? null
);

// Dynamic atom for the current crafting bench
export const currentCraftingBench = computed(
  [craftingBenches, currentCraftingBenchId],
  (benches, id) => benches.find((b) => b.id === id) ?? null
);

// Computed atom to check if conversation is empty
export const conversationEmpty = computed(
  [currentConversation],
  (conversation) => !conversation || conversation.messages.length === 0
);

// Computed atom to check if crafting bench is empty
export const craftingBenchEmpty = computed(
  [currentCraftingBench],
  (bench) => !bench || bench.files.length === 0
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
    messages: [],
  };

  addConversation(newConversation);
  setCurrentConversation(id);

  return id;
}

export function generateTitleFromMessage(message: string): string {
  // Truncate at 20 characters and add ellipsis if needed
  const truncated = message.trim().substring(0, 20);
  return truncated.length < message.trim().length
    ? truncated + "..."
    : truncated;
}

export function updateConversation(id: string, updates: Partial<Conversation>) {
  const currentConversations = conversations.get();
  conversations.set(
    currentConversations.map((conv) =>
      conv.id === id ? { ...conv, ...updates } : conv
    )
  );
}

export function addMessageToConversation(
  id: string,
  message: ExtendedCoreMessage
) {
  const currentConversations = conversations.get();
  conversations.set(
    currentConversations.map((conv) =>
      conv.id === id ? { ...conv, messages: [...conv.messages, message] } : conv
    )
  );
}

export function updateLastMessage(
  id: string,
  content: string,
  metadata?: MessageMetadata
) {
  const currentConversations = conversations.get();
  conversations.set(
    currentConversations.map((conv) => {
      if (conv.id === id && conv.messages.length > 0) {
        const updatedMessages = [...conv.messages];
        const lastMessageIndex = updatedMessages.length - 1;
        updatedMessages[lastMessageIndex] = {
          ...updatedMessages[lastMessageIndex],
          content,
          metadata: metadata || updatedMessages[lastMessageIndex].metadata,
        };
        return { ...conv, messages: updatedMessages };
      }
      return conv;
    })
  );
}

export function deleteConversation(id: string) {
  const currentConversations = conversations.get();
  conversations.set(currentConversations.filter((conv) => conv.id !== id));

  // If we're deleting the current conversation, clear the current ID
  if (currentConversationId.get() === id) {
    currentConversationId.set(null);
  }
}

export function setCurrentConversation(id: string | null) {
  currentConversationId.set(id);
}

// Actions for managing crafting benches
export function addCraftingBench(bench: CraftingBench) {
  const currentBenches = craftingBenches.get();
  craftingBenches.set([...currentBenches, bench]);
}

export function createNewCraftingBench(
  title: string = "New Crafting Bench"
): string {
  const id = crypto.randomUUID();
  const newBench: CraftingBench = {
    id,
    title,
    files: [],
    storedFiles: [],
    notes: "",
    flashcards: [],
  };

  addCraftingBench(newBench);
  setCurrentCraftingBench(id);

  return id;
}

export function updateCraftingBench(
  id: string,
  updates: Partial<CraftingBench>
) {
  const currentBenches = craftingBenches.get();
  craftingBenches.set(
    currentBenches.map((bench) =>
      bench.id === id ? { ...bench, ...updates } : bench
    )
  );
}

export function deleteCraftingBench(id: string) {
  const currentBenches = craftingBenches.get();
  craftingBenches.set(currentBenches.filter((bench) => bench.id !== id));

  // If we're deleting the current crafting bench, clear the current ID
  if (currentCraftingBenchId.get() === id) {
    currentCraftingBenchId.set(null);
  }
}

export function setCurrentCraftingBench(id: string | null) {
  currentCraftingBenchId.set(id);
}

export function addFilesToCraftingBench(benchId: string, newFiles: File[]) {
  const bench = craftingBenches.get().find((b) => b.id === benchId);
  if (bench) {
    const updatedFiles = [...bench.files, ...newFiles];
    updateCraftingBench(benchId, { files: updatedFiles });
  }
}

export function removeFileFromCraftingBench(
  benchId: string,
  fileIndex: number
) {
  const bench = craftingBenches.get().find((b) => b.id === benchId);
  if (bench) {
    const updatedFiles = bench.files.filter((_, index) => index !== fileIndex);
    const updatedStoredFiles = bench.storedFiles.filter(
      (_, index) => index !== fileIndex
    );
    updateCraftingBench(benchId, {
      files: updatedFiles,
      storedFiles: updatedStoredFiles,
    });
  }
}

// Functions to save notes and flashcards
export function saveNotesToCraftingBench(benchId: string, notes: string) {
  updateCraftingBench(benchId, {
    notes,
    lastNotesUpdate: new Date(),
  });
}

export function saveFlashcardsToCraftingBench(
  benchId: string,
  flashcards: FlashCard[]
) {
  updateCraftingBench(benchId, {
    flashcards,
    lastFlashcardsUpdate: new Date(),
  });
}

export function addFlashcardToCraftingBench(
  benchId: string,
  flashcard: Omit<FlashCard, "id">
) {
  const bench = craftingBenches.get().find((b) => b.id === benchId);
  if (bench) {
    const newFlashcard: FlashCard = {
      ...flashcard,
      id: crypto.randomUUID(),
    };
    const updatedFlashcards = [...bench.flashcards, newFlashcard];
    saveFlashcardsToCraftingBench(benchId, updatedFlashcards);
  }
}

export function removeFlashcardFromCraftingBench(
  benchId: string,
  flashcardId: string
) {
  const bench = craftingBenches.get().find((b) => b.id === benchId);
  if (bench) {
    const updatedFlashcards = bench.flashcards.filter(
      (card) => card.id !== flashcardId
    );
    saveFlashcardsToCraftingBench(benchId, updatedFlashcards);
  }
}

export function updateFlashcard(
  benchId: string,
  flashcardId: string,
  updates: Partial<FlashCard>
) {
  const bench = craftingBenches.get().find((b) => b.id === benchId);
  if (bench) {
    const updatedFlashcards = bench.flashcards.map((card) =>
      card.id === flashcardId ? { ...card, ...updates } : card
    );
    saveFlashcardsToCraftingBench(benchId, updatedFlashcards);
  }
}

// Utility functions for file handling
export async function fileToStoredData(file: File): Promise<StoredFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(",")[1]; // Remove data:type;base64, prefix
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        data: base64Data,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function storedDataToFile(storedData: StoredFileData): File {
  // Convert base64 back to Uint8Array
  const byteCharacters = atob(storedData.data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Create File object
  return new File([byteArray], storedData.name, {
    type: storedData.type,
    lastModified: storedData.lastModified,
  });
}

export async function addFilesToCraftingBenchWithData(
  benchId: string,
  newFiles: File[]
) {
  const bench = craftingBenches.get().find((b) => b.id === benchId);
  if (bench) {
    // Convert files to stored data
    const storedDataPromises = newFiles.map((file) => fileToStoredData(file));
    const newStoredFiles = await Promise.all(storedDataPromises);

    // Update both runtime files and stored files
    const updatedFiles = [...bench.files, ...newFiles];
    const updatedStoredFiles = [...bench.storedFiles, ...newStoredFiles];

    updateCraftingBench(benchId, {
      files: updatedFiles,
      storedFiles: updatedStoredFiles,
    });
  }
}

// get prompts from langfuse
