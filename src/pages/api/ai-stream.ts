// src/pages/api/ai-stream.ts

export const prerender = false;

import type { APIContext } from "astro";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";
import type { CoreMessage } from "ai";
import { z } from "zod";
import APIKeyManager from "@/util/apiKeyManager";
import Langfuse from "langfuse";

export const maxDuration = 30;

export const langfuse = new Langfuse({
  secretKey: "sk-lf-c2e76fd9-82b1-4edc-9ebf-0fabe86988ba",
  publicKey: "pk-lf-ad80d8a5-5db2-4efd-ab2e-c50a8fa57c43",
  baseUrl: "https://langfuse.sharesyllabus.me",
});

const generalChatPrompt = await langfuse.getPrompt("generalChat", undefined, {
  cacheTtlSeconds: 300,
});

export const trace = langfuse.trace({
  name: "aiapp",
});

// Initialize the API key manager
const apiKeyManager = APIKeyManager.getInstance();

// Response schema
export const chatSchema = z.object({
  response: z.string().describe("The main response to the user's message"),
  suggestedNextPrompts: z
    .array(z.string())
    .length(3)
    .describe(
      "Three suggested follow-up prompts that would be relevant based on the conversation context"
    ),
});

// Schema for file attachment data
const attachmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  data: z.string(), // base64 encoded content
});

export async function POST({ request }: APIContext) {
  try {
    const body = await request.json();
    const { messages, attachments } = body as {
      messages: CoreMessage[];
      attachments?: z.infer<typeof attachmentSchema>[];
    };

    console.log("Received messages:", messages);
    console.log("Received attachments:", attachments);

    if (
      !Array.isArray(messages) ||
      messages.some((msg) => !msg.role || !msg.content)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current API key from the manager
    const currentApiKey = await apiKeyManager.getCurrentApiKey();

    const google = createGoogleGenerativeAI({
      apiKey: currentApiKey,
    });

    // Process attachments and add them to the context
    let contextualMessages = [...messages];

    if (attachments && attachments.length > 0) {
      // Create a context message about the attached files
      const attachmentContext = attachments
        .map((att) => `File: ${att.name} (${att.type}, ${att.size} bytes)`)
        .join("\n");

      const contextMessage: CoreMessage = {
        role: "system",
        content: `The user has attached the following files to this conversation:\n${attachmentContext}\n\nPlease acknowledge these files and incorporate them into your response as appropriate.`,
      };

      contextualMessages.unshift(contextMessage);
    }

    // Add system prompt with instructions for structured output
    const promptMessage: CoreMessage = {
      role: "system",
      content: `${generalChatPrompt.prompt}

IMPORTANT: Always provide exactly 3 relevant follow-up prompts that would be interesting and useful for the user to explore based on the current conversation context. These should be specific, actionable, and directly related to the topic at hand.`,
    };

    const editedMessages = [promptMessage, ...contextualMessages];
    console.log("Final messages being sent to AI:", editedMessages);

    // Log API key stats
    const keyStats = apiKeyManager.getKeyStats();
    console.log(
      `API Key Stats - Total: ${keyStats.total}, Valid: ${keyStats.valid}, Invalid: ${keyStats.invalid}`
    );

    // Create generation trace
    const generationTrace = trace.generation({
      name: "gemini-2.5-flash",
      model: "gemini-2.5-flash",
      modelParameters: {
        temperature: 0.9,
        maxTokens: 2000,
      },
      input: editedMessages,
    });

    console.log("Starting streamObject...");
    const result = streamObject({
      model: google("gemini-1.5-flash", {
        useSearchGrounding: true,
        dynamicRetrievalConfig: {
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0.8,
        },
      }),
      messages: editedMessages,
      schema: chatSchema,
      onFinish: (result) => {
        console.log("Stream completed. Final result:", result);

        // Rotate to next API key after successful completion
        apiKeyManager.rotateToNextKey();

        // End generation trace
        generationTrace.end({
          output: result.object,
        });
      },
      onError: (error) => {
        console.error("Stream Error:", error);

        // If there's an API key related error, try rotating to next key
        if (
          error instanceof Error &&
          (error.message.includes("API key") ||
            error.message.includes("authentication") ||
            error.message.includes("quota") ||
            error.message.includes("rate limit"))
        ) {
          console.log("API key error detected, rotating to next key");
          apiKeyManager.rotateToNextKey();
        }

        // End generation trace with error
        generationTrace.end({
          output: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      },
    });

    console.log("Returning text stream response...");
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function OPTIONS({ request }: APIContext) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
