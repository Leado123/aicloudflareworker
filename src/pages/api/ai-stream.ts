// src/pages/api/ai-stream.ts


// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

import type { APIContext } from 'astro';

// We'll use OpenAI for this example. Install: `bun add openai`
import { google } from '@ai-sdk/google';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { convertToCoreMessages, streamText } from "ai"
import type { CoreMessage } from "ai"
import Langfuse from 'langfuse';
import { LangfuseExporter } from "langfuse-vercel"
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import APIKeyManager from "@/util/apiKeyManager";


interface Env {
    OPENAI_API_KEY: string; // Your OpenAI API key
    // Add other environment variables/bindings here if needed
}


export const langfuse = new Langfuse({
    secretKey: "sk-lf-309a678f-5517-499b-afad-cfc559bf094f",
    publicKey: "pk-lf-e15b4ef5-81a1-430d-8d1b-cd57bfcb3606",
    baseUrl: "https://langfuse.sharesyllabus.me"
})

const generalChatPrompt = await langfuse.getPrompt("generalChat", undefined, { cacheTtlSeconds: 300 })
export const trace = langfuse.trace({
    name: "aiapp",
})

// Initialize the API key manager
const apiKeyManager = APIKeyManager.getInstance();


export async function POST({ request, locals }: APIContext) {
    // Get current API key from the manager
    const currentApiKey = apiKeyManager.getCurrentApiKey();
    
    const google = createGoogleGenerativeAI({
        apiKey: currentApiKey
    });
    
    try {
        const { messages } = await request.json() as { messages: CoreMessage[] };

        if (!Array.isArray(messages) || messages.some(msg => !msg.role || !msg.content)) {
            return new Response(JSON.stringify({ error: "Invalid messages format provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Add system prompt at the beginning instead of in the middle
        const promptMessage = { role: "system", content: generalChatPrompt.prompt } as CoreMessage;
        const editedMessage = [promptMessage, ...messages];
        console.log("Final messages being sent to AI:", editedMessage);

        // Log API key stats
        const keyStats = apiKeyManager.getKeyStats();
        console.log(`API Key Stats - Total: ${keyStats.total}, Valid: ${keyStats.valid}, Invalid: ${keyStats.invalid}`);

        // Create a ReadableStream to stream the AI response
        let controller: ReadableStreamDefaultController;
        const readable = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();

                (async () => {
                    try {
                        const generationTrace = trace.generation({
                            name: "gemini-2.0-flash",
                            model: "gemini-2.0-flash",
                            modelParameters: {
                                temperature: 0.9,
                                maxTokens: 2000,
                            },
                            input: editedMessage,
                        })
                        
                        const { textStream } = await streamText({
                            model: google("gemini-2.0-flash"),
                            messages: editedMessage,
                        });

                        let fullResponse = "";
                        for await (const textPart of textStream) {
                            fullResponse += textPart;
                            console.log("Streaming text part:", textPart);
                            controller.enqueue(encoder.encode(textPart));
                        }
                        console.log("Complete AI response:", fullResponse);
                        
                        // Rotate to next API key after successful completion
                        apiKeyManager.rotateToNextKey();
                        
                        generationTrace.end({
                            output: fullResponse,
                        })
                        controller.close();
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
                        
                        controller.error(error);
                    }
                })();
            },
        });



        // Return the Response with the ReadableStream
        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8', // Or 'text/event-stream' if you want SSE format
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
            status: 200,
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}