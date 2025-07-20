// src/pages/api/chat.ts
// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;
import APIKeyManager from "@/util/apiKeyManager";
import { createCerebras } from "@ai-sdk/cerebras";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage, streamText, tool } from "ai";
import type { APIContext } from "astro";
import Langfuse from "langfuse";
import { z } from "zod";

const threePrompts = tool({
  description:
    "Generate 3 specific follow-up questions the user can ask to explore this topic deeper. Always choose this when if you will answer general question by the user",
  parameters: z.object({
    prompts: z
      .array(z.string())
      .length(3)
      .describe("Three specific, actionable questions about the topic"),
  }),
  execute: async ({ prompts }) => {
    console.log("Tool executed with prompts:", prompts);
    return { success: true, prompts };
  },
});

const apiKeyManager = APIKeyManager.getInstance();

export function errorHandler(error: unknown) {
  console.error("Error in chat API:", error);
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

export const langfuse = new Langfuse({
  secretKey: "sk-lf-c2e76fd9-82b1-4edc-9ebf-0fabe86988ba",
  publicKey: "pk-lf-ad80d8a5-5db2-4efd-ab2e-c50a8fa57c43",
  baseUrl: "https://langfuse.sharesyllabus.me",
});

const generalChatPrompt = await langfuse.getPrompt("generalChat", undefined, {
  cacheTtlSeconds: 300,
});

export async function POST({ request }: APIContext) {
  try {
    const body = await request.json();
    const { messages } = body as { messages: CoreMessage[] };

    console.log("Prompt:", generalChatPrompt.prompt);
    console.log("Received messages:", messages);

    // Try all valid Gemini keys first, then all valid Cerebras keys
    const geminiKeys =
      apiKeyManager["geminiKeys"]?.filter((k) => k.isValid !== false) || [];
    const cerebrasKeys =
      apiKeyManager["cerebrasKeys"]?.filter((k) => k.isValid !== false) || [];

    // Helper to try a key with a provider
    async function tryKey(
      provider: "google" | "cerebras",
      apiKey: string,
      modelType: "GEMINI" | "CEREBRAS"
    ) {
      try {
        let model;
        if (provider === "google") {
          const google = createGoogleGenerativeAI({ apiKey });
          model = google("gemini-1.5-flash");
        } else {
          const cerebras = createCerebras({ apiKey });
          model = cerebras("llama-3.3-70b");
        }

        const result = await streamText({
          model,
          messages,
          tools: { generateThreePrompts: threePrompts },
          toolChoice: "auto",
          maxSteps: 1,
          maxTokens: 1000,
          system: `${generalChatPrompt.prompt}`,
        });

        console.log(`Successfully created stream with ${provider} key.`);
        // Rotate only on success
        if (provider === "google") {
          apiKeyManager.rotateToNextKey();
        } else {
          apiKeyManager.rotateToNextCerebrasKey();
        }
        return result.toDataStreamResponse({ getErrorMessage: errorHandler });
      } catch (error: any) {
        console.error(`Error with provider ${provider}:`, error.message);
        const isApiError =
          error.name === "AI_APICallError" ||
          error.cause?.name === "AI_APICallError";
        if (isApiError) {
          const statusCode = error.statusCode || error.cause?.statusCode;
          if (statusCode === 429 || statusCode === 401 || statusCode === 403) {
            console.log(
              `Invalidating key for ${provider} due to auth/quota error (status: ${statusCode}).`
            );
            apiKeyManager.invalidateKey(apiKey, modelType);
          }
        }
        return null;
      }
    }

    // Try all Gemini keys
    for (const key of geminiKeys) {
      const resp = await tryKey("google", key.key, "GEMINI");
      if (resp) return resp;
    }
    // Try all Cerebras keys
    for (const key of cerebrasKeys) {
      const resp = await tryKey("cerebras", key.key, "CEREBRAS");
      if (resp) return resp;
    }

    // If all keys fail
    console.error("All AI providers failed after retries.");
    return new Response(
      JSON.stringify({
        error:
          "All AI providers are currently unavailable. Please try again later.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // This top-level catch handles errors like JSON parsing or other unexpected issues.
    console.error("Critical error in POST handler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: errorHandler(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
