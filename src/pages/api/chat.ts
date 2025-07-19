// src/pages/api/chat.ts

// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

import APIKeyManager from '@/util/apiKeyManager';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { CoreMessage, streamText, tool } from 'ai';
import type { APIContext } from 'astro';
import z from 'zod';

const threePrompts = tool({
  description: "Generates 3 prompts for the user to click on if they want to know more",
  parameters: z.object({
    prompts: z.array(z.string()).length(3)
  }),
  execute: async ({ prompts }) => {
    return prompts;
  }
})

const apiKeyManager = APIKeyManager.getInstance();

export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

export async function POST({ request }: APIContext) {
  const body = await request.json();
  const { messages } = body as { messages: CoreMessage[] };
  
  const currentApiKey = await apiKeyManager.getCurrentApiKey();

  const google = createGoogleGenerativeAI({
    apiKey: currentApiKey,
  });
  
  const result = streamText({
    model: google("gemini-1.5-flash-8b"),
    messages: messages,
    tools: {
      generateThreePrompts: threePrompts,
    },
    toolChoice: 'required'
  })
  
  return result.toDataStreamResponse({
    getErrorMessage: errorHandler, // TODO: remove in prod
  })
}
