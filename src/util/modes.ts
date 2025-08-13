// Specific mode definitions for Chat, Crafting Table, and Writing modes
import {
  ModeDefinition,
  Conversation,
  CraftingBench,
  Document,
  CitationCollection,
  generateTitleFromContent,
  fileToStoredData,
  storedDataToFile,
  type StoredFileData,
} from "./modeDefinitions";
import ChatMode from "../components/ChatMode/component";
import CraftingTableMode from "../components/NewCraftingTableMode/component";
import WritingMode from "../components/WritingMode/component";
import SpanishMode from "../components/Spanish/component";
import CalculatorMode from "../components/CalcMode/component";
import CitationMode from "../components/CitationMode/component";
import {
  deleteConversation,
  setCurrentConversation,
  addConversation,
  updateConversation
} from "./store";

// Chat Mode Definition
export const chatMode: ModeDefinition<Conversation> = {
  name: "chat",
  key: "chat",
  icon: "MessageCircle",
  displayName: "AI Chat",
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
    messages: [],
    citations: [],
  }),

  serialize: (conversation: Conversation) => ({
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages,
    citations: conversation.citations || [],
    createdAt: conversation.createdAt?.toISOString(),
    updatedAt: conversation.updatedAt?.toISOString(),
  }),

  deserialize: (data: any): Conversation => ({
    id: data.id,
    title: data.title,
    messages: data.messages || [],
    citations: data.citations || [],
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  }),

  isEmpty: (conversation: Conversation) =>
    !conversation || (conversation.messages.length === 0 && (conversation.citations?.length ?? 0) === 0),

  // Define API actions available for this mode
  apiActions: {
    generateTitle: {
      name: "generateTitle",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    streamResponse: {
      name: "streamResponse",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    analyzeConversation: {
      name: "analyzeConversation",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
  },

  // Custom hooks for syncing with store system
  onEntityCreated: (entity: Conversation) => {
    // Sync with store system
    addConversation(entity);
    setCurrentConversation(entity.id);
  },

  onEntityUpdated: (entity: Conversation) => {
    // Sync with store system
    updateConversation(entity.id, entity);
  },

  onEntityDeleted: (entityId: string) => {
    // Sync with store system - this will set currentConversationId to null
    deleteConversation(entityId);
  },
};

// Crafting Table Mode Definition
export const craftingTableMode: ModeDefinition<CraftingBench> = {
  name: "craftingTable",
  key: "craftingTable",
  icon: "Sparkles",
  displayName: "Crafting Table",
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
    lastFlashcardsUpdate: undefined,
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
    updatedAt: bench.updatedAt?.toISOString(),
  }),

  deserialize: (data: any): CraftingBench => ({
    id: data.id,
    title: data.title,
    files: (data.storedFiles || []).map((storedFile: any) =>
      storedDataToFile(storedFile)
    ),
    storedFiles: data.storedFiles || [],
    notes: data.notes || "",
    flashcards: data.flashcards || [],
    lastNotesUpdate: data.lastNotesUpdate
      ? new Date(data.lastNotesUpdate)
      : undefined,
    lastFlashcardsUpdate: data.lastFlashcardsUpdate
      ? new Date(data.lastFlashcardsUpdate)
      : undefined,
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  }),

  isEmpty: (bench: CraftingBench) => !bench || bench.files.length === 0,

  // Define API actions available for this mode
  apiActions: {
    processFiles: {
      name: "processFiles",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    generateNotes: {
      name: "generateNotes",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    generateFlashcards: {
      name: "generateFlashcards",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    extractText: {
      name: "extractText",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
  },
};

// Writing Mode Definition
export const writingMode: ModeDefinition<Document> = {
  name: "write",
  key: "write",
  icon: "PencilRuler",
  displayName: "AI Essay Editor",
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
    version: 1,
  }),

  serialize: (document: Document) => ({
    id: document.id,
    title: document.title,
    content: document.content,
    wordCount: document.wordCount,
    lastSaved: document.lastSaved?.toISOString(),
    version: document.version,
    createdAt: document.createdAt?.toISOString(),
    updatedAt: document.updatedAt?.toISOString(),
  }),

  deserialize: (data: any): Document => ({
    id: data.id,
    title: data.title,
    content: data.content || "",
    wordCount: data.wordCount || 0,
    lastSaved: data.lastSaved ? new Date(data.lastSaved) : undefined,
    version: data.version || 1,
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  }),

  isEmpty: (document: Document) => !document || !document.content.trim(),

  // Define API actions available for this mode
  apiActions: {
    improveText: {
      name: "improveText",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    generateOutline: {
      name: "generateOutline",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    checkGrammar: {
      name: "checkGrammar",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
  },
};

// Calculator Mode Definition (no entities needed)
export const calculatorMode: ModeDefinition<any> = {
  name: "calculator",
  key: "calculator",
  icon: "Calculator",
  displayName: "Calculator",
  component: CalculatorMode,
  dataType: class CalculatorClass {} as any, // Dummy class since no entities needed

  defaultEntity: () => ({}), // Empty default since no entities
  serialize: () => ({}), // No serialization needed
  deserialize: () => ({}), // No deserialization needed
  isEmpty: () => false, // Calculator doesn't have entities, so never "empty"

  // No API actions needed for calculator
  apiActions: {},
};

// Citation Mode Definition
export const citationMode: ModeDefinition<CitationCollection> = {
  name: "citation",
  key: "citation",
  icon: "BookOpen",
  displayName: "Citation Manager",
  component: CitationMode,
  dataType: class CitationCollectionClass {
    id!: string;
    title!: string;
    entries!: any[];
    lastSearchQuery?: string;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  } as any,

  defaultEntity: () => ({
    title: "New Citation Collection",
    entries: [],
    lastSearchQuery: undefined,
    tags: [],
  }),

  serialize: (collection: CitationCollection) => ({
    id: collection.id,
    title: collection.title,
    entries: collection.entries.map(entry => ({
      ...entry,
      addedAt: entry.addedAt.toISOString(),
    })),
    lastSearchQuery: collection.lastSearchQuery,
    tags: collection.tags,
    createdAt: collection.createdAt?.toISOString(),
    updatedAt: collection.updatedAt?.toISOString(),
  }),

  deserialize: (data: any): CitationCollection => ({
    id: data.id,
    title: data.title,
    entries: (data.entries || []).map((entry: any) => ({
      ...entry,
      addedAt: entry.addedAt ? new Date(entry.addedAt) : new Date(),
    })),
    lastSearchQuery: data.lastSearchQuery,
    tags: data.tags || [],
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  }),

  isEmpty: (collection: CitationCollection) => !collection || collection.entries.length === 0,

  // Define API actions available for this mode
  apiActions: {
    searchCitations: {
      name: "searchCitations",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    addCitation: {
      name: "addCitation",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
    removeCitation: {
      name: "removeCitation",
      handler: async () => {
        throw new Error("Handler only available on server side");
      },
    },
  },
};

// Export all modes
export const allModes = {
  chat: chatMode,
  craftingTable: craftingTableMode,
  write: writingMode,
  calculator: calculatorMode,
  citation: citationMode,
} as const;

export type ModeKey = keyof typeof allModes;
export type ModeType = (typeof allModes)[ModeKey];

// Helper functions for working with modes
export function getModeByKey(key: string): ModeType | undefined {
  return allModes[key as ModeKey];
}

export function getAllModeKeys(): ModeKey[] {
  return Object.keys(allModes) as ModeKey[];
}

export function generateEntityTitle(mode: ModeType, content: string): string {
  switch (mode.key) {
    case "chat":
      return generateTitleFromContent(content, 20);
    case "craftingTable":
      return content || "New Study Session";
    case "write":
      return generateTitleFromContent(content, 30);
    default:
      return "New Item";
  }
}
