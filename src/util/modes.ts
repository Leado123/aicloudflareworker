// Specific mode definitions for Chat, Crafting Table, and Writing modes
import { 
    ModeDefinition, 
    Conversation, 
    CraftingBench, 
    Document,
    generateTitleFromContent,
    fileToStoredData,
    storedDataToFile,
    type StoredFileData
} from './modeDefinitions';
import ChatMode from '../components/chatMode';
import CraftingTableMode from '../components/newCraftingTableMode';
import WritingMode from '../components/writingMode';
import CalculatorMode from '../components/calculatorMode';

// Chat Mode Definition
export const chatMode: ModeDefinition<Conversation> = {
    name: 'chat',
    key: 'chat',
    icon: 'MessageCircle',
    displayName: 'AI Chat',
    component: ChatMode,
    dataType: class ConversationClass {
        id!: string;
        title!: string;
        messages!: any[];
        createdAt?: Date;
        updatedAt?: Date;
    } as any,
    
    defaultEntity: () => ({
        title: "New Chat",
        messages: []
    }),

    serialize: (conversation: Conversation) => ({
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt?.toISOString(),
        updatedAt: conversation.updatedAt?.toISOString()
    }),

    deserialize: (data: any): Conversation => ({
        id: data.id,
        title: data.title,
        messages: data.messages || [],
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    }),

    isEmpty: (conversation: Conversation) => !conversation || conversation.messages.length === 0,
    
    // Define API actions available for this mode
    apiActions: {
        generateTitle: {
            name: 'generateTitle',
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        streamResponse: {
            name: 'streamResponse', 
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        analyzeConversation: {
            name: 'analyzeConversation',
            handler: async () => { throw new Error('Handler only available on server side'); }
        }
    }
};

// Crafting Table Mode Definition
export const craftingTableMode: ModeDefinition<CraftingBench> = {
    name: 'craftingTable',
    key: 'craftingTable',
    icon: 'Sparkles',
    displayName: 'Crafting Table',
    component: CraftingTableMode,
    dataType: class CraftingBenchClass {
        id!: string;
        title!: string;
        files!: File[];
        storedFiles!: StoredFileData[];
        notes!: string;
        flashcards!: any[];
        lastNotesUpdate?: Date;
        lastFlashcardsUpdate?: Date;
        createdAt?: Date;
        updatedAt?: Date;
    } as any,

    defaultEntity: () => ({
        title: "New Study Session",
        files: [],
        storedFiles: [],
        notes: "",
        flashcards: [],
        lastNotesUpdate: undefined,
        lastFlashcardsUpdate: undefined
    }),

    serialize: (bench: CraftingBench) => ({
        id: bench.id,
        title: bench.title,
        storedFiles: bench.storedFiles,
        notes: bench.notes,
        flashcards: bench.flashcards,
        lastNotesUpdate: bench.lastNotesUpdate?.toISOString(),
        lastFlashcardsUpdate: bench.lastFlashcardsUpdate?.toISOString(),
        createdAt: bench.createdAt?.toISOString(),
        updatedAt: bench.updatedAt?.toISOString()
    }),

    deserialize: (data: any): CraftingBench => ({
        id: data.id,
        title: data.title,
        files: (data.storedFiles || []).map((storedFile: any) => storedDataToFile(storedFile)),
        storedFiles: data.storedFiles || [],
        notes: data.notes || "",
        flashcards: data.flashcards || [],
        lastNotesUpdate: data.lastNotesUpdate ? new Date(data.lastNotesUpdate) : undefined,
        lastFlashcardsUpdate: data.lastFlashcardsUpdate ? new Date(data.lastFlashcardsUpdate) : undefined,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    }),

    isEmpty: (bench: CraftingBench) => !bench || bench.files.length === 0,
    
    // Define API actions available for this mode
    apiActions: {
        processFiles: {
            name: 'processFiles',
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        generateNotes: {
            name: 'generateNotes',
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        generateFlashcards: {
            name: 'generateFlashcards', 
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        extractText: {
            name: 'extractText',
            handler: async () => { throw new Error('Handler only available on server side'); }
        }
    }
};

// Writing Mode Definition
export const writingMode: ModeDefinition<Document> = {
    name: 'write',
    key: 'write',
    icon: 'PencilRuler',
    displayName: 'AI Essay Editor',
    component: WritingMode,
    dataType: class DocumentClass {
        id!: string;
        title!: string;
        content!: string;
        wordCount?: number;
        lastSaved?: Date;
        version?: number;
        createdAt?: Date;
        updatedAt?: Date;
    } as any,

    defaultEntity: () => ({
        title: "New Document",
        content: "",
        wordCount: 0,
        version: 1
    }),

    serialize: (document: Document) => ({
        id: document.id,
        title: document.title,
        content: document.content,
        wordCount: document.wordCount,
        lastSaved: document.lastSaved?.toISOString(),
        version: document.version,
        createdAt: document.createdAt?.toISOString(),
        updatedAt: document.updatedAt?.toISOString()
    }),

    deserialize: (data: any): Document => ({
        id: data.id,
        title: data.title,
        content: data.content || "",
        wordCount: data.wordCount || 0,
        lastSaved: data.lastSaved ? new Date(data.lastSaved) : undefined,
        version: data.version || 1,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    }),

    isEmpty: (document: Document) => !document || !document.content.trim(),
    
    // Define API actions available for this mode
    apiActions: {
        improveText: {
            name: 'improveText',
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        generateOutline: {
            name: 'generateOutline',
            handler: async () => { throw new Error('Handler only available on server side'); }
        },
        checkGrammar: {
            name: 'checkGrammar',
            handler: async () => { throw new Error('Handler only available on server side'); }
        }
    }
};

// Calculator Mode Definition (no entities needed)
export const calculatorMode: ModeDefinition<any> = {
    name: 'calculator',
    key: 'calculator',
    icon: 'Calculator',
    displayName: 'Calculator',
    component: CalculatorMode,
    dataType: class CalculatorClass {} as any, // Dummy class since no entities needed
    
    defaultEntity: () => ({}), // Empty default since no entities
    serialize: () => ({}), // No serialization needed
    deserialize: () => ({}), // No deserialization needed
    isEmpty: () => false, // Calculator doesn't have entities, so never "empty"
    
    // No API actions needed for calculator
    apiActions: {}
};

// Export all modes
export const allModes = {
    chat: chatMode,
    craftingTable: craftingTableMode,
    write: writingMode,
    calculator: calculatorMode
} as const;

export type ModeKey = keyof typeof allModes;
export type ModeType = typeof allModes[ModeKey];

// Helper functions for working with modes
export function getModeByKey(key: string): ModeType | undefined {
    return allModes[key as ModeKey];
}

export function getAllModeKeys(): ModeKey[] {
    return Object.keys(allModes) as ModeKey[];
}

export function generateEntityTitle(mode: ModeType, content: string): string {
    switch (mode.key) {
        case 'chat':
            return generateTitleFromContent(content, 20);
        case 'craftingTable':
            return content || "New Study Session";
        case 'write':
            return generateTitleFromContent(content, 30);
        default:
            return "New Item";
    }
}
