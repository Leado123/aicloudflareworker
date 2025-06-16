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

        const messagesFp = messages.splice(0, messages.length - 1);
        const messagesLp = messages.splice(messages.length - 1);
        const promptMessage = { role: "system", content: generalChatPrompt.prompt }
        const editedMessage = messagesFp.concat([promptMessage as CoreMessage], messagesLp);
        console.log(editedMessage);


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

                        for await (const textPart of textStream) {
                            controller.enqueue(encoder.encode(textPart));
                        }
                        generationTrace.end({
                            output: textStream,
                        })
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