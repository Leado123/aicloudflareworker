// src/pages/api/ai-stream.ts


// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

import type { APIContext } from 'astro';

// We'll use OpenAI for this example. Install: `bun add openai`
import { google } from '@ai-sdk/google';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from "ai"
import type { CoreMessage } from "ai"

interface Env {
    OPENAI_API_KEY: string; // Your OpenAI API key
    // Add other environment variables/bindings here if needed
}

export async function POST({ request, locals }: APIContext) {


    const google = createGoogleGenerativeAI({
        apiKey: "AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"
    });
    try {
        const { messages } = await request.json() as { messages: CoreMessage[] };

        if (!Array.isArray(messages) || messages.some(msg => !msg.role || !msg.content)) {
            return new Response(JSON.stringify({ error: "Invalid messages format provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create a ReadableStream to stream the AI response
        let controller: ReadableStreamDefaultController;
        const readable = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();

                (async () => {
                    try {
                        const { textStream } = await streamText({
                            model: google("gemini-2.0-flash"),
                            messages: messages,
                        });

                        for await (const textPart of textStream) {
                            controller.enqueue(encoder.encode(textPart));
                        }
                        controller.close();
                    } catch (error) {
                        console.error('Stream Error:', error);
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