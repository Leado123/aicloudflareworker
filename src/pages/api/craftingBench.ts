// src/pages/api/craftingBench.ts

// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

import type { APIContext } from 'astro';
import { getTextExtractor } from "office-text-extractor"
import { createCerebras } from "@ai-sdk/cerebras"
import { generateText } from "ai"
import type { CoreMessage } from "ai"
import Langfuse from 'langfuse';
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const extractor = getTextExtractor()
const cerebras = createCerebras({
    apiKey: "csk-rmh58t2h4tnccw2nxdnh8ntjvj8npxw8j5rfcnrtmpw8dfmk"
})

const google = createGoogleGenerativeAI({
    apiKey: "AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"
});

export const langfuse = new Langfuse({
    secretKey: "sk-lf-c2e76fd9-82b1-4edc-9ebf-0fabe86988ba",
    publicKey: "pk-lf-ad80d8a5-5db2-4efd-ab2e-c50a8fa57c43",
    baseUrl: "https://langfuse.sharesyllabus.me"
})

export const trace = langfuse.trace({
    name: "aiapp",
})

const makeNotesPrompt = await langfuse.getPrompt("makeNotes", undefined, { cacheTtlSeconds: 300 })

export enum craftingBenchAction {
    MAKENOTES = "MAKENOTES",
    MAKEFLASHCARDS = "MAKEFLASHCARDS",
}

let cerebrasRequestCount = 0;
let lastCerebrasRequestTime = Date.now();

export async function POST({ request }: APIContext) {
    try {
        const formData = await request.formData();
        const action = formData.get('action') as string;
        const extraCommands = formData.get('extraCommands') as string || "";
        const files = formData.getAll('files') as File[];

        if (!action || !Object.values(craftingBenchAction).includes(action as craftingBenchAction)) {
            return new Response(JSON.stringify({ error: "Invalid or missing action" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!files || files.length === 0) {
            return new Response(JSON.stringify({ error: "No files provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Process files and extract text
        const formattedFiles = await Promise.all(files.map(async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const extractedText = await extractor.extractText({ input: buffer, type: "buffer" });
            return {
                name: file.name,
                content: extractedText,
            };
        }));

        // Prepare messages for AI generation
        const messages: CoreMessage[] = [
            { role: "system", content: makeNotesPrompt.prompt },
            ...formattedFiles.map(file => ({ role: "user" as const, content: file.content })),
        ];

        // Check conditions to switch to Google provider
        const totalTokens = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
        const currentTime = Date.now();

        if (totalTokens > 8000 || (cerebrasRequestCount > 1 && (currentTime - lastCerebrasRequestTime) <= 3000)) {
            const generationTrace = trace.generation({
                name: "makingNotes",
                model: "gemini-2.0-flash",
                modelParameters: {
                    temperature: 0.9,
                    maxTokens: 2000,
                },
                input: messages,
            });

            const generatedText = await generateText({
                model: google("gemini-2.0-flash"),
                messages: messages,
            });

            generationTrace.end({
                output: generatedText,
            });

            return new Response(JSON.stringify({ 
                success: true,
                data: generatedText 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Increment Cerebras request count
        cerebrasRequestCount++;
        lastCerebrasRequestTime = currentTime;

        // Generate content with Cerebras
        const generationTrace = trace.generation({
            name: "makingNotes",
            model: "llama-3.3-70b",
            modelParameters: {
                temperature: 0.9,
                maxTokens: 2000,
            },
            input: messages,
        });

        const generatedText = await generateText({
            model: cerebras("llama-3.3-70b"),
            messages: messages,
        });

        generationTrace.end({
            output: generatedText,
        });

        return new Response(JSON.stringify({ 
            success: true,
            data: generatedText 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'An unknown error occurred.' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}