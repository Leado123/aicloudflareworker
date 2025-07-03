// Server-side API handlers for crafting table mode
import type { CraftingTableAPIActions } from '../../../../util/apiDefinitions';
import { getTextExtractor } from "office-text-extractor";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { CoreMessage } from 'ai';

const extractor = getTextExtractor();
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || "AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"
});

export const craftingTableAPIHandlers: CraftingTableAPIActions = {
    processFiles: {
        name: 'processFiles',
        handler: async (input: { files: File[], action: 'notes' | 'flashcards' }) => {
            try {
                // Extract text from files
                const extractedTexts = await Promise.all(
                    input.files.map(async (file) => {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        return await extractor.extractText({ input: buffer, type: "buffer" });
                    })
                );

                const combinedText = extractedTexts.join('\n\n');

                // Generate content based on action
                const prompt = input.action === 'notes' 
                    ? 'Create comprehensive study notes from the following content. Organize it clearly with headings, bullet points, and key concepts highlighted:'
                    : 'Create flashcards from the following content. Format as Q: [question] A: [answer] pairs. Focus on key concepts, definitions, and important facts:';

                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: combinedText }
                    ],
                });

                return { content: text };
            } catch (error) {
                throw new Error(`Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { files: File[], action: 'notes' | 'flashcards' } => {
            return typeof input === 'object' && 
                   input !== null && 
                   Array.isArray(input.files) &&
                   (input.action === 'notes' || input.action === 'flashcards');
        }
    },

    generateNotes: {
        name: 'generateNotes',
        handler: async (input: { content: string, extraCommands?: string }) => {
            try {
                const systemPrompt = `Create comprehensive study notes from the provided content. ${input.extraCommands || ''}`;

                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: input.content }
                    ],
                });

                return { notes: text };
            } catch (error) {
                throw new Error(`Failed to generate notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { content: string, extraCommands?: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.content === 'string';
        }
    },

    generateFlashcards: {
        name: 'generateFlashcards',
        handler: async (input: { content: string, extraCommands?: string }) => {
            try {
                const systemPrompt = `Create flashcards from the provided content. Format as JSON array with objects containing "front" and "back" properties. ${input.extraCommands || ''}`;

                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: input.content }
                    ],
                });

                // Try to parse as JSON, fallback to text parsing
                try {
                    const flashcards = JSON.parse(text);
                    return { flashcards };
                } catch {
                    // Parse text format
                    const flashcards = parseFlashcardsFromText(text);
                    return { flashcards };
                }
            } catch (error) {
                throw new Error(`Failed to generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { content: string, extraCommands?: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.content === 'string';
        }
    },

    extractText: {
        name: 'extractText',
        handler: async (input: { files: File[] }) => {
            try {
                const extractedTexts = await Promise.all(
                    input.files.map(async (file) => {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        return await extractor.extractText({ input: buffer, type: "buffer" });
                    })
                );

                return { extractedText: extractedTexts };
            } catch (error) {
                throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { files: File[] } => {
            return typeof input === 'object' && 
                   input !== null && 
                   Array.isArray(input.files);
        }
    }
};

// Helper function to parse flashcards from text
function parseFlashcardsFromText(text: string): Array<{ front: string; back: string }> {
    const flashcards: Array<{ front: string; back: string }> = [];
    const cardSections = text.split(/\n\s*\n/);

    for (const section of cardSections) {
        const qMatch = section.match(/(?:\*\*)?Q(?:uestion)?(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);
        const aMatch = section.match(/(?:\*\*)?A(?:nswer)?(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);

        if (qMatch && aMatch) {
            flashcards.push({
                front: qMatch[1].trim(),
                back: aMatch[1].trim()
            });
        }
    }

    return flashcards;
}
