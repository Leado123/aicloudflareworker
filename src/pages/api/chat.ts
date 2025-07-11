// src/pages/api/chat.ts

// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

import type { APIContext } from 'astro';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from "ai";
import type { CoreMessage } from "ai";
import Langfuse from 'langfuse';
import APIKeyManager from "@/util/apiKeyManager";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const langfuse = new Langfuse({
    secretKey: "sk-lf-c2e76fd9-82b1-4edc-9ebf-0fabe86988ba",
    publicKey: "pk-lf-ad80d8a5-5db2-4efd-ab2e-c50a8fa57c43",
    baseUrl: "https://langfuse.sharesyllabus.me"
});

const generalChatPrompt = await langfuse.getPrompt("generalChat", undefined, { cacheTtlSeconds: 300 });
const trace = langfuse.trace({
    name: "aiapp",
});

// Initialize the API key manager
const apiKeyManager = APIKeyManager.getInstance();

export async function POST({ request }: APIContext) {
    try {
        const { messages } = await request.json() as { messages: CoreMessage[] };

        if (!Array.isArray(messages) || messages.some(msg => !msg.role || !msg.content)) {
            return new Response(JSON.stringify({ error: "Invalid messages format provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get current API key from the manager
        const currentApiKey = apiKeyManager.getCurrentApiKey();
        
        const google = createGoogleGenerativeAI({
            apiKey: currentApiKey
        });

        // Add system prompt at the beginning
        const systemMessage: CoreMessage = { 
            role: "system", 
            content: generalChatPrompt.prompt 
        };
        const messagesWithSystem = [systemMessage, ...messages];

        console.log("Final messages being sent to AI:", messagesWithSystem);

        // Log API key stats
        const keyStats = apiKeyManager.getKeyStats();
        console.log(`API Key Stats - Total: ${keyStats.total}, Valid: ${keyStats.valid}, Invalid: ${keyStats.invalid}`);

        const generationTrace = trace.generation({
            name: "gemini-2.0-flash",
            model: "gemini-2.0-flash",
            modelParameters: {
                temperature: 0.9,
                maxTokens: 2000,
            },
            input: messagesWithSystem,
        });

        try {
            const result = streamText({
                model: google("gemini-2.0-flash"),
                messages: messagesWithSystem,
            });

            // Rotate to next API key after successful request initiation
            apiKeyManager.rotateToNextKey();

            const response = result.toDataStreamResponse();
            
            generationTrace.end({
                output: "Stream completed successfully",
            });

            return response;
        } catch (error) {
            console.error('Stream Error:', error);
            
            // If there's an API key related error, try rotating to next key
            if (error instanceof Error && 
                (error.message.includes('API key') || 
                 error.message.includes('authentication') ||
                 error.message.includes('quota') ||
                 error.message.includes('rate limit'))) {
                console.log('API key error detected, rotating to next key');
                apiKeyManager.rotateToNextKey();
            }
            
            generationTrace.end({
                output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });

            throw error;
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
