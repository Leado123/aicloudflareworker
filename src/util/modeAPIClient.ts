// Type-safe API client for modes
import type { 
    ModeAPIClient, 
    APIRequest, 
    APIResponse,
    ChatAPIActions,
    CraftingTableAPIActions,
    WritingAPIActions,
    ActionInput,
    ActionOutput
} from './apiDefinitions';
import type { ModeKey } from './modes';

// Base API client class
class BaseAPIClient {
    private baseUrl: string;

    constructor(baseUrl: string = '/api/modes') {
        this.baseUrl = baseUrl;
    }

    async makeRequest<TInput, TOutput>(
        mode: ModeKey,
        action: string,
        payload: TInput
    ): Promise<TOutput> {
        const request: APIRequest<TInput> = {
            action,
            payload
        };

        try {
            const response = await fetch(`${this.baseUrl}/${mode}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            const result: APIResponse<TOutput> = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }

            if (!result.data) {
                throw new Error('No data returned from API');
            }

            return result.data;
        } catch (error) {
            console.error(`API Error for ${mode}/${action}:`, error);
            throw error;
        }
    }
}

// Type-safe API client implementation
class TypeSafeModeAPIClient extends BaseAPIClient implements ModeAPIClient {
    chat = {
        generateTitle: (input: ActionInput<ChatAPIActions, 'generateTitle'>) =>
            this.makeRequest<
                ActionInput<ChatAPIActions, 'generateTitle'>,
                ActionOutput<ChatAPIActions, 'generateTitle'>
            >('chat', 'generateTitle', input),

        streamResponse: (input: ActionInput<ChatAPIActions, 'streamResponse'>) =>
            this.makeRequest<
                ActionInput<ChatAPIActions, 'streamResponse'>,
                ActionOutput<ChatAPIActions, 'streamResponse'>
            >('chat', 'streamResponse', input),

        analyzeConversation: (input: ActionInput<ChatAPIActions, 'analyzeConversation'>) =>
            this.makeRequest<
                ActionInput<ChatAPIActions, 'analyzeConversation'>,
                ActionOutput<ChatAPIActions, 'analyzeConversation'>
            >('chat', 'analyzeConversation', input)
    };

    craftingTable = {
        processFiles: (input: ActionInput<CraftingTableAPIActions, 'processFiles'>) =>
            this.makeRequest<
                ActionInput<CraftingTableAPIActions, 'processFiles'>,
                ActionOutput<CraftingTableAPIActions, 'processFiles'>
            >('craftingTable', 'processFiles', input),

        generateNotes: (input: ActionInput<CraftingTableAPIActions, 'generateNotes'>) =>
            this.makeRequest<
                ActionInput<CraftingTableAPIActions, 'generateNotes'>,
                ActionOutput<CraftingTableAPIActions, 'generateNotes'>
            >('craftingTable', 'generateNotes', input),

        generateFlashcards: (input: ActionInput<CraftingTableAPIActions, 'generateFlashcards'>) =>
            this.makeRequest<
                ActionInput<CraftingTableAPIActions, 'generateFlashcards'>,
                ActionOutput<CraftingTableAPIActions, 'generateFlashcards'>
            >('craftingTable', 'generateFlashcards', input),

        extractText: (input: ActionInput<CraftingTableAPIActions, 'extractText'>) =>
            this.makeRequest<
                ActionInput<CraftingTableAPIActions, 'extractText'>,
                ActionOutput<CraftingTableAPIActions, 'extractText'>
            >('craftingTable', 'extractText', input)
    };

    write = {
        improveText: (input: ActionInput<WritingAPIActions, 'improveText'>) =>
            this.makeRequest<
                ActionInput<WritingAPIActions, 'improveText'>,
                ActionOutput<WritingAPIActions, 'improveText'>
            >('write', 'improveText', input),

        generateOutline: (input: ActionInput<WritingAPIActions, 'generateOutline'>) =>
            this.makeRequest<
                ActionInput<WritingAPIActions, 'generateOutline'>,
                ActionOutput<WritingAPIActions, 'generateOutline'>
            >('write', 'generateOutline', input),

        checkGrammar: (input: ActionInput<WritingAPIActions, 'checkGrammar'>) =>
            this.makeRequest<
                ActionInput<WritingAPIActions, 'checkGrammar'>,
                ActionOutput<WritingAPIActions, 'checkGrammar'>
            >('write', 'checkGrammar', input)
    };
}

// Export singleton instance
export const modeAPI = new TypeSafeModeAPIClient();

// Export types for external usage
export type { ModeAPIClient };

// Utility hooks for React components
export function useModeAPI(): ModeAPIClient {
    return modeAPI;
}

// Custom error class for API errors
export class ModeAPIError extends Error {
    constructor(
        message: string,
        public mode: ModeKey,
        public action: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ModeAPIError';
    }
}

// Helper function to handle API errors consistently
export function handleAPIError(error: unknown, mode: ModeKey, action: string): never {
    if (error instanceof Error) {
        throw new ModeAPIError(error.message, mode, action, error);
    }
    throw new ModeAPIError('Unknown API error', mode, action);
}

// Development helper to test API endpoints
export async function testAPIEndpoint(mode: ModeKey, action: string, payload: any) {
    if (process.env.NODE_ENV !== 'development') {
        console.warn('testAPIEndpoint should only be used in development');
        return;
    }

    try {
        const client = new BaseAPIClient();
        const result = await client.makeRequest(mode, action, payload);
        console.log(`✅ ${mode}/${action} succeeded:`, result);
        return result;
    } catch (error) {
        console.error(`❌ ${mode}/${action} failed:`, error);
        throw error;
    }
}
