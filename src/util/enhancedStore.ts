// Enhanced store using the unified mode system
// This file maintains backward compatibility while leveraging the new mode system

import { useModeEntities } from '../components/ModeProvider';
import { 
    type Conversation, 
    type CraftingBench, 
    type Document,
    type FlashCard,
    type StoredFileData
} from './modeDefinitions';
import { fileToStoredData } from './modeDefinitions';

// Re-export types for backward compatibility
export type { 
    Conversation, 
    CraftingBench, 
    Document, 
    FlashCard, 
    StoredFileData 
};

// Legacy content mode for backward compatibility
export const CONTENT_MODE = {
    CHAT: "chat",
    CRAFTING_TABLE: "craftingTable",
    WRITE: "write",
} as const;

// Hooks for accessing mode-specific data
export function useConversations() {
    return useModeEntities<Conversation>('chat');
}

export function useCraftingBenches() {
    return useModeEntities<CraftingBench>('craftingTable');
}

export function useDocuments() {
    return useModeEntities<Document>('write');
}

// Convenience functions for backward compatibility
export function useCurrentConversation() {
    const { currentEntity } = useConversations();
    return currentEntity;
}

export function useCurrentCraftingBench() {
    const { currentEntity } = useCraftingBenches();
    return currentEntity;
}

export function useCurrentDocument() {
    const { currentEntity } = useDocuments();
    return currentEntity;
}

// Enhanced functions for crafting bench operations
export function useCraftingBenchOperations() {
    const { updateEntity, currentEntity } = useCraftingBenches();

    const saveNotesToCraftingBench = (benchId: string, notes: string) => {
        updateEntity(benchId, { 
            notes,
            lastNotesUpdate: new Date()
        });
    };

    const saveFlashcardsToCraftingBench = (benchId: string, flashcards: FlashCard[]) => {
        updateEntity(benchId, { 
            flashcards,
            lastFlashcardsUpdate: new Date()
        });
    };

    const addFlashcardToCraftingBench = (benchId: string, flashcard: Omit<FlashCard, 'id'>) => {
        if (!currentEntity || currentEntity.id !== benchId) return;
        
        const newFlashcard: FlashCard = {
            ...flashcard,
            id: crypto.randomUUID()
        };
        const updatedFlashcards = [...currentEntity.flashcards, newFlashcard];
        saveFlashcardsToCraftingBench(benchId, updatedFlashcards);
    };

    const removeFlashcardFromCraftingBench = (benchId: string, flashcardId: string) => {
        if (!currentEntity || currentEntity.id !== benchId) return;
        
        const updatedFlashcards = currentEntity.flashcards.filter((card: FlashCard) => card.id !== flashcardId);
        saveFlashcardsToCraftingBench(benchId, updatedFlashcards);
    };

    const updateFlashcard = (benchId: string, flashcardId: string, updates: Partial<FlashCard>) => {
        if (!currentEntity || currentEntity.id !== benchId) return;
        
        const updatedFlashcards = currentEntity.flashcards.map((card: FlashCard) => 
            card.id === flashcardId ? { ...card, ...updates } : card
        );
        saveFlashcardsToCraftingBench(benchId, updatedFlashcards);
    };

    const removeFileFromCraftingBench = (benchId: string, fileIndex: number) => {
        if (!currentEntity || currentEntity.id !== benchId) return;
        
        const updatedFiles = currentEntity.files.filter((_: File, index: number) => index !== fileIndex);
        const updatedStoredFiles = currentEntity.storedFiles.filter((_: StoredFileData, index: number) => index !== fileIndex);
        
        updateEntity(benchId, { 
            files: updatedFiles,
            storedFiles: updatedStoredFiles
        });
    };

    const addFilesToCraftingBench = (benchId: string, newFiles: File[]) => {
        if (!currentEntity || currentEntity.id !== benchId) return;
        
        const updatedFiles = [...currentEntity.files, ...newFiles];
        updateEntity(benchId, { files: updatedFiles });
    };

    const addFilesToCraftingBenchWithData = async (benchId: string, newFiles: File[]) => {
        if (!currentEntity || currentEntity.id !== benchId) return;
        
        // Convert files to stored data
        const storedDataPromises = newFiles.map(file => fileToStoredData(file));
        const newStoredFiles = await Promise.all(storedDataPromises);
        
        // Update both runtime files and stored files
        const updatedFiles = [...currentEntity.files, ...newFiles];
        const updatedStoredFiles = [...currentEntity.storedFiles, ...newStoredFiles];
        
        updateEntity(benchId, { 
            files: updatedFiles,
            storedFiles: updatedStoredFiles
        });
    };

    return {
        saveNotesToCraftingBench,
        saveFlashcardsToCraftingBench,
        addFlashcardToCraftingBench,
        removeFlashcardFromCraftingBench,
        updateFlashcard,
        removeFileFromCraftingBench,
        addFilesToCraftingBench,
        addFilesToCraftingBenchWithData
    };
}

// Enhanced functions for conversation operations
export function useConversationOperations() {
    const { updateEntity, createEntity } = useConversations();

    const generateTitleFromMessage = (message: string): string => {
        const truncated = message.trim().substring(0, 20);
        return truncated.length < message.trim().length ? truncated + "..." : truncated;
    };

    const updateConversation = (id: string, updates: Partial<Conversation>) => {
        updateEntity(id, updates);
    };

    const createNewConversation = (title: string = "New Chat"): string => {
        return createEntity({ title });
    };

    return {
        generateTitleFromMessage,
        updateConversation,
        createNewConversation
    };
}

// Enhanced functions for document operations
export function useDocumentOperations() {
    const { updateEntity, createEntity } = useDocuments();

    const saveDocument = (docId: string, content: string) => {
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        updateEntity(docId, { 
            content,
            wordCount,
            lastSaved: new Date()
        });
    };

    const createNewDocument = (title: string = "New Document"): string => {
        return createEntity({ title });
    };

    return {
        saveDocument,
        createNewDocument
    };
}
