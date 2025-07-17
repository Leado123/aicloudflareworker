// src/pages/api/ai-stream-fixed.ts

// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

import type { APIContext } from "astro";
import { google } from "@ai-sdk/google";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import type { CoreMessage } from "ai";
import Langfuse from "langfuse";
import { LangfuseExporter } from "langfuse-vercel";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import APIKeyManager from "@/util/apiKeyManager";
import { z } from "zod";

interface Env {
  OPENAI_API_KEY: string;
}

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

// Schema for file attachment data
const attachmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  data: z.string(), // base64 encoded content
});

export async function POST({ request, locals }: APIContext) {
  // Get current API key from the manager
  const currentApiKey = await apiKeyManager.getCurrentApiKey();

  const google = createGoogleGenerativeAI({
    apiKey: currentApiKey,
  });

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

    // Add system prompt with specific instructions for structured output
    const promptMessage: CoreMessage = {
      role: "system",
      content: `${generalChatPrompt.prompt}

IMPORTANT INSTRUCTIONS:
1. Provide a complete, helpful response to the user's message
2. At the end of your response, include a section marked with "SUGGESTED_PROMPTS:" followed by exactly 3 follow-up questions
3. Format the suggested prompts like this:
   SUGGESTED_PROMPTS:
   1. [First follow-up question]
   2. [Second follow-up question]
   3. [Third follow-up question]

The suggested prompts should be relevant, specific, and encourage continued conversation about the topic.`,
    };

    const editedMessages = [promptMessage, ...contextualMessages];
    console.log("Final messages being sent to AI:", editedMessages);

    // Log API key stats
    const keyStats = apiKeyManager.getKeyStats();
    console.log(
      `API Key Stats - Total: ${keyStats.total}, Valid: ${keyStats.valid}, Invalid: ${keyStats.invalid}`
    );

    // Create a ReadableStream to stream the response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const generationTrace = trace.generation({
            name: "gemini-2.5-flash",
            model: "gemini-2.5-flash",
            modelParameters: {
              temperature: 0.9,
              maxTokens: 2000,
            },
            input: editedMessages,
          });

          console.log("Starting streamText...");
          const { textStream } = await streamText({
            model: google("gemini-2.5-flash-preview-04-17", {
              useSearchGrounding: true,
              dynamicRetrievalConfig: {
                mode: "MODE_DYNAMIC",
                dynamicThreshold: 0.8,
              },
            }),
            messages: editedMessages,
          });

          console.log("Stream created, starting to iterate...");
          let fullResponse = "";
          let currentResponse = "";
          let suggestedPrompts: string[] = [];

          // Stream the text chunks
          for await (const chunk of textStream) {
            console.log("Received text chunk:", chunk);
            fullResponse += chunk;
            currentResponse += chunk;

            // Check if we have suggested prompts in the response
            if (currentResponse.includes("SUGGESTED_PROMPTS:")) {
              const parts = currentResponse.split("SUGGESTED_PROMPTS:");
              const mainResponse = parts[0].trim();
              const promptsSection = parts[1];

              // Extract prompts if we have the complete section
              if (promptsSection) {
                const promptLines = promptsSection
                  .split("\n")
                  .filter(line => line.trim() && /^\d+\./.test(line.trim()))
                  .map(line => line.replace(/^\d+\.\s*/, "").trim())
                  .filter(prompt => prompt.length > 0);

                if (promptLines.length > 0) {
                  suggestedPrompts = promptLines.slice(0, 3); // Take first 3
                }
              }

              // Send structured response with main content and prompts
              const responseData = {
                response: mainResponse,
                suggestedNextPrompts: suggestedPrompts,
              };

              const streamData = JSON.stringify(responseData) + "\n";
              controller.enqueue(encoder.encode(streamData));
            } else {
              // Send incremental response
              const responseData = {
                response: currentResponse,
                suggestedNextPrompts: [],
              };

              const streamData = JSON.stringify(responseData) + "\n";
              controller.enqueue(encoder.encode(streamData));
            }
          }

          console.log("Stream completed. Final response:", fullResponse);

          // Final processing to ensure we have suggested prompts
          if (suggestedPrompts.length === 0 && fullResponse.includes("SUGGESTED_PROMPTS:")) {
            const parts = fullResponse.split("SUGGESTED_PROMPTS:");
            const mainResponse = parts[0].trim();
            const promptsSection = parts[1];

            if (promptsSection) {
              const promptLines = promptsSection
                .split("\n")
                .filter(line => line.trim() && /^\d+\./.test(line.trim()))
                .map(line => line.replace(/^\d+\.\s*/, "").trim())
                .filter(prompt => prompt.length > 0);

              suggestedPrompts = promptLines.slice(0, 3);
            }

            // Send final structured response
            const finalResponseData = {
              response: mainResponse,
              suggestedNextPrompts: suggestedPrompts,
            };

            const streamData = JSON.stringify(finalResponseData) + "\n";
            controller.enqueue(encoder.encode(streamData));
          } else if (suggestedPrompts.length === 0) {
            // Fallback: generate generic suggested prompts
            const fallbackPrompts = [
              "Can you tell me more about this?",
              "What are the next steps?",
              "How does this relate to other topics?",
            ];

            const finalResponseData = {
              response: fullResponse,
              suggestedNextPrompts: fallbackPrompts,
            };

            const streamData = JSON.stringify(finalResponseData) + "\n";
            controller.enqueue(encoder.encode(streamData));
          }

          // Rotate to next API key after successful completion
          apiKeyManager.rotateToNextKey();

          generationTrace.end({
            output: fullResponse,
          });

          controller.close();
        } catch (error) {
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

          // Send error as JSON
          const errorData =
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "An unknown error occurred",
            }) + "\n";
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    // Return the Response with the ReadableStream
    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      status: 200,
    });
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
