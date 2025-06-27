import { APIContext } from "astro";
import { convertToCoreMessages, streamText } from "ai"
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createCerebras } from '@ai-sdk/cerebras';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import APIKeyManager from "@/util/apiKeyManager";

export const prerender = false;

export interface APIKeySubmission {
    apiKey: string;
    service: "gemini" | "cerebras";
}

const prisma = new PrismaClient();
const apiKeyManager = APIKeyManager.getInstance();

export async function POST(request: APIContext) {
    try {
        const { apiKey, service }: APIKeySubmission = await request.request.json();

        if (!apiKey || !service) {
            return new Response(JSON.stringify({ error: "API key and service are required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate and store the API key
        if (service === "gemini") {
            try {
                // Use the API key manager's add method which includes validation
                const success = await apiKeyManager.addKey(apiKey);
                
                if (!success) {
                    return new Response(JSON.stringify({ error: "Invalid Gemini API key" }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                
            } catch (error) {
                console.error("Gemini API key validation failed:", error);
                return new Response(JSON.stringify({ error: "Invalid Gemini API key" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else if (service === "cerebras") {
            try {
                const cerebras = createCerebras({
                    apiKey: apiKey
                });
                
                // Test the API key with a simple prompt
                const { textStream } = await streamText({
                    model: cerebras("llama3.1-8b"),
                    prompt: "Hello"
                });
                
                // Consume a bit of the stream to ensure it works
                const reader = textStream.getReader();
                const { done } = await reader.read();
                reader.releaseLock();
                
                // Store the API key in the database (Cerebras keys are not managed by APIKeyManager)
                await prisma.aPIKeys.create({
                    data: {
                        key: apiKey,
                        type: "CEREBRAS"                                
                    }
                });
                
            } catch (error) {
                console.error("Cerebras API key validation failed:", error);
                return new Response(JSON.stringify({ error: "Invalid Cerebras API key" }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else {
            return new Response(JSON.stringify({ error: "Unsupported service type" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ 
            message: `${service} API key validated and saved successfully`,
            service: service 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        
    } catch (error) {
        console.error("Error in submitAPIKey:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    } finally {
        await prisma.$disconnect();
    }
}