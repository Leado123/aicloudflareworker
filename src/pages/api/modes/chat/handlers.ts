// Server-side API handlers for chat mode
import type { APIContext } from 'astro';
import type { ChatAPIActions } from '../../../../util/apiDefinitions';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { CoreMessage } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || "AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"
});

export const chatAPIHandlers: ChatAPIActions = {
    generateTitle: {
        name: 'generateTitle',
        handler: async (input: { message: string }) => {
            try {
                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        {
                            role: 'system',
                            content: 'Generate a short, descriptive title (max 20 characters) for this conversation based on the first message. Be concise and relevant.'
                        },
                        {
                            role: 'user',
                            content: input.message
                        }
                    ],
                    maxTokens: 50
                });

                return { title: text.trim() };
            } catch (error) {
                throw new Error(`Failed to generate title: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { message: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.message === 'string';
        }
    },

    streamResponse: {
        name: 'streamResponse',
        handler: async (input: { messages: CoreMessage[], conversationId: string }) => {
            try {
                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: input.messages,
                });

                return { response: text };
            } catch (error) {
                throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { messages: CoreMessage[], conversationId: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   Array.isArray(input.messages) &&
                   typeof input.conversationId === 'string';
        }
    },

    analyzeConversation: {
        name: 'analyzeConversation',
        handler: async (input: { conversationId: string }) => {
            try {
                // For now, return a mock response
                // In a real implementation, you'd fetch the conversation and analyze it
                return {
                    summary: "This conversation discusses various topics related to AI and technology.",
                    topics: ["AI", "Technology", "Programming"]
                };
            } catch (error) {
                throw new Error(`Failed to analyze conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { conversationId: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.conversationId === 'string';
        }
    }
};
