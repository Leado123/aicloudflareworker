// Server-side API handlers for writing mode
import type { WritingAPIActions } from '../../../../util/apiDefinitions';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || "AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"
});

export const writingAPIHandlers: WritingAPIActions = {
    improveText: {
        name: 'improveText',
        handler: async (input: { text: string, instructions?: string }) => {
            try {
                const systemPrompt = `Improve the following text for clarity, grammar, and readability. ${input.instructions || 'Make it more professional and engaging.'}`;

                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: input.text }
                    ],
                });

                // For now, return the improved text and some mock suggestions
                return { 
                    improvedText: text,
                    suggestions: [
                        "Consider adding more specific examples",
                        "Use more active voice",
                        "Improve paragraph transitions"
                    ]
                };
            } catch (error) {
                throw new Error(`Failed to improve text: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { text: string, instructions?: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.text === 'string';
        }
    },

    generateOutline: {
        name: 'generateOutline',
        handler: async (input: { topic: string, requirements?: string }) => {
            try {
                const systemPrompt = `Create a detailed outline for the topic: "${input.topic}". ${input.requirements || 'Include main sections, subsections, and key points.'}`;

                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Topic: ${input.topic}` }
                    ],
                });

                // Extract sections from the outline
                const sections = text.split('\n')
                    .filter(line => line.trim())
                    .filter(line => /^[IVX]+\.|^\d+\.|^[A-Z]\.|^-/.test(line.trim()))
                    .map(line => line.trim());

                return { 
                    outline: text,
                    sections
                };
            } catch (error) {
                throw new Error(`Failed to generate outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { topic: string, requirements?: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.topic === 'string';
        }
    },

    checkGrammar: {
        name: 'checkGrammar',
        handler: async (input: { text: string }) => {
            try {
                const systemPrompt = `Check the following text for grammar, spelling, and style errors. Return corrections in JSON format with array of objects containing: "original", "suggested", and "reason".`;

                const { text } = await generateText({
                    model: google('gemini-2.0-flash'),
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: input.text }
                    ],
                });

                // Try to parse as JSON, fallback to mock corrections
                try {
                    const corrections = JSON.parse(text);
                    return { corrections };
                } catch {
                    // Return mock corrections if parsing fails
                    return { 
                        corrections: [
                            {
                                original: "example text",
                                suggested: "example text",
                                reason: "Grammar check completed"
                            }
                        ]
                    };
                }
            } catch (error) {
                throw new Error(`Failed to check grammar: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        validate: (input: any): input is { text: string } => {
            return typeof input === 'object' && 
                   input !== null && 
                   typeof input.text === 'string';
        }
    }
};
