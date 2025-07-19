import { streamText, generateText, tool } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

import { z } from 'zod';

export const weatherTool = tool({
  description: 'Display the weather for a location',
  parameters: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async function ({ location }) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { weather: 'Sunny', temperature: 75, location };
  },
});


const google = createGoogleGenerativeAI({
  apiKey: "AIzaSyBYOb_Y8IDPpzYa8dxcUPCDKhNzUBvuw1I",

})


const result = streamText({
  model: google("gemini-1.5-flash-8b"),
  prompt: "what is the weather in corona",
  tools: {
    displayWeather: weatherTool
  }
})

console.log('--- Streaming Response ---');
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      process.stdout.write(part.textDelta); // Use process.stdout.write for continuous output
    } else if (part.type === 'tool-call') {
      console.log(`\n--- Tool Call: ${part.toolName}(${JSON.stringify(part.args)}) ---`);
    } else if (part.type === 'tool-result') {
      console.log(`\n--- Tool Result for ${part.toolName}: ${JSON.stringify(part.result)} ---`);
    } else if (part.type === 'finish') {
 
    }
  }


