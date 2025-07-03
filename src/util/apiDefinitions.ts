// Type-safe API definitions for modes
import type { BaseEntity } from './modeDefinitions';
import type { ModeKey } from './modes';

// Base API request/response types
export interface APIRequest<T = any> {
    action: string;
    payload: T;
}

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface APIError {
    code: string;
    message: string;
    details?: any;
}

// Generic API action interface
export interface APIAction<TInput = any, TOutput = any> {
    name: string;
    handler: (input: TInput) => Promise<TOutput>;
    validate?: (input: any) => input is TInput;
}

// Mode API definition interface
export interface ModeAPIDefinition<T extends BaseEntity> {
    mode: ModeKey;
    actions: Record<string, APIAction>;
}

// Chat mode API types
export interface ChatAPIActions {
    generateTitle: APIAction<
        { message: string },
        { title: string }
    >;
    streamResponse: APIAction<
        { messages: any[], conversationId: string },
        { response: string }
    >;
    analyzeConversation: APIAction<
        { conversationId: string },
        { summary: string; topics: string[] }
    >;
}

// Crafting Table mode API types
export interface CraftingTableAPIActions {
    processFiles: APIAction<
        { files: File[], action: 'notes' | 'flashcards' },
        { content: string }
    >;
    generateNotes: APIAction<
        { content: string, extraCommands?: string },
        { notes: string }
    >;
    generateFlashcards: APIAction<
        { content: string, extraCommands?: string },
        { flashcards: Array<{ front: string; back: string }> }
    >;
    extractText: APIAction<
        { files: File[] },
        { extractedText: string[] }
    >;
}

// Writing mode API types
export interface WritingAPIActions {
    improveText: APIAction<
        { text: string, instructions?: string },
        { improvedText: string; suggestions: string[] }
    >;
    generateOutline: APIAction<
        { topic: string, requirements?: string },
        { outline: string; sections: string[] }
    >;
    checkGrammar: APIAction<
        { text: string },
        { corrections: Array<{ original: string; suggested: string; reason: string }> }
    >;
}

// Union type for all mode API actions
export type AllModeAPIActions = ChatAPIActions & CraftingTableAPIActions & WritingAPIActions;

// Helper type to extract action names from API definition
export type ActionNames<T> = T extends Record<infer K, APIAction> ? K : never;

// Helper type to extract input type for a specific action
export type ActionInput<T, K extends ActionNames<T>> = T extends Record<K, APIAction<infer I, any>> ? I : never;

// Helper type to extract output type for a specific action
export type ActionOutput<T, K extends ActionNames<T>> = T extends Record<K, APIAction<any, infer O>> ? O : never;

// Type-safe API client interface
export interface ModeAPIClient {
    chat: {
        generateTitle(input: ActionInput<ChatAPIActions, 'generateTitle'>): Promise<ActionOutput<ChatAPIActions, 'generateTitle'>>;
        streamResponse(input: ActionInput<ChatAPIActions, 'streamResponse'>): Promise<ActionOutput<ChatAPIActions, 'streamResponse'>>;
        analyzeConversation(input: ActionInput<ChatAPIActions, 'analyzeConversation'>): Promise<ActionOutput<ChatAPIActions, 'analyzeConversation'>>;
    };
    craftingTable: {
        processFiles(input: ActionInput<CraftingTableAPIActions, 'processFiles'>): Promise<ActionOutput<CraftingTableAPIActions, 'processFiles'>>;
        generateNotes(input: ActionInput<CraftingTableAPIActions, 'generateNotes'>): Promise<ActionOutput<CraftingTableAPIActions, 'generateNotes'>>;
        generateFlashcards(input: ActionInput<CraftingTableAPIActions, 'generateFlashcards'>): Promise<ActionOutput<CraftingTableAPIActions, 'generateFlashcards'>>;
        extractText(input: ActionInput<CraftingTableAPIActions, 'extractText'>): Promise<ActionOutput<CraftingTableAPIActions, 'extractText'>>;
    };
    write: {
        improveText(input: ActionInput<WritingAPIActions, 'improveText'>): Promise<ActionOutput<WritingAPIActions, 'improveText'>>;
        generateOutline(input: ActionInput<WritingAPIActions, 'generateOutline'>): Promise<ActionOutput<WritingAPIActions, 'generateOutline'>>;
        checkGrammar(input: ActionInput<WritingAPIActions, 'checkGrammar'>): Promise<ActionOutput<WritingAPIActions, 'checkGrammar'>>;
    };
}

// Validation helpers
export function isValidAPIRequest(data: any): data is APIRequest {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.action === 'string' &&
        'payload' in data
    );
}

export function createAPIResponse<T>(data: T): APIResponse<T> {
    return {
        success: true,
        data
    };
}

export function createAPIError(error: string | APIError): APIResponse {
    if (typeof error === 'string') {
        return {
            success: false,
            error
        };
    }
    return {
        success: false,
        error: error.message
    };
}

// Utility function to validate mode and action
export function isValidModeAction(mode: string, action: string): mode is ModeKey {
    return ['chat', 'craftingTable', 'write'].includes(mode);
}
