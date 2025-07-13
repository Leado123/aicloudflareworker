import type { APIRoute } from "astro";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import Langfuse from "langfuse";
import APIKeyManager from "@/util/apiKeyManager";

// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;

// Initialize Langfuse
const langfuse = new Langfuse({
  secretKey: "sk-lf-c2e76fd9-82b1-4edc-9ebf-0fabe86988ba",
  publicKey: "pk-lf-ad80d8a5-5db2-4efd-ab2e-c50a8fa57c43",
  baseUrl: "https://langfuse.sharesyllabus.me",
});

// Initialize API key manager
const apiKeyManager = APIKeyManager.getInstance();

export enum ConjugationTense {
  Preterite = "Preterite",
  Imperfect = "Imperfect",
  Conditional = "Conditional",
  Future = "Future",
  AffirmativeImperative = "AffirmativeImperative",
  NegativeImperative = "NegativeImperative",
  PresentSubjunctive = "PresentSubjunctive",
  ImperfectSubjunctive = "ImperfectSubjunctive",
  PresentProgressive = "PresentProgressive",
  PreteriteProgressive = "PreteriteProgressive",
  ImperfectProgressive = "ImperfectProgressive",
  ConditionalProgressive = "ConditionalProgressive",
  FutureProgressive = "FutureProgressive",
  PresentPerfect = "PresentPerfect",
  PastPerfect = "PastPerfect",
  ConditionalPerfect = "ConditionalPerfect",
  FuturePerfect = "FuturePerfect",
  PresentPerfectSubjunctive = "PresentPerfectSubjunctive",
  PastPerfectSubjunctive = "PastPerfectSubjunctive",
  InformalFuture = "InformalFuture",
}

export interface ConjugationQuestion {
  id: string;
  conjugatedVerbAnswer: string;
  conjugationTense: ConjugationTense;
  verbInInfiniteTense: string;
  hasGerund: boolean;
  sentenceWithVerb?: string;
  exampleSentenceWithDifferentPronoun?: string;
}

// Zod schema for structured generation
const ConjugationQuestionSchema = z.object({
  id: z.string(),
  conjugatedVerbAnswer: z.string(),
  conjugationTense: z.nativeEnum(ConjugationTense),
  verbInInfiniteTense: z.string(),
  hasGerund: z.boolean(),
  sentenceWithVerb: z.string().optional(),
  exampleSentenceWithDifferentPronoun: z.string().optional(),
});

const ConjugationQuestionsArraySchema = z.object({
  questions: z.array(ConjugationQuestionSchema),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the request body
    const body = await request.json();
    const { count = 5, difficulty = "intermediate" } = body as {
      count?: number;
      difficulty?: string;
    };

    // Get current API key from the manager
    const currentApiKey = await apiKeyManager.getCurrentApiKey();

    // Ensure we have a valid API key
    if (!currentApiKey || currentApiKey.length === 0) {
      throw new Error(
        "No valid API key available. Please check your environment variables or database keys."
      );
    }

    // Initialize Google AI with current API key
    const google = createGoogleGenerativeAI({
      apiKey: currentApiKey,
    });

    // Get the makeConjugation prompt from Langfuse
    const conjugationPrompt = await langfuse.getPrompt(
      "makeConjugation",
      undefined,
      {
        cacheTtlSeconds: 300,
      }
    );

    // Create a trace for this generation
    const trace = langfuse.trace({
      name: "spanish-conjugation-generation",
      metadata: {
        count,
        difficulty,
        apiKey: currentApiKey.substring(0, 10) + "...", // Log partial key for debugging
      },
    });

    const generation = trace.generation({
      name: "generate-conjugation-questions",
      model: "gemini-2.0-flash",
      input: {
        prompt:
          conjugationPrompt?.prompt || "Generate Spanish conjugation questions",
        parameters: { count, difficulty },
      },
    });

    // Prepare the prompt with variables
    const promptText =
      conjugationPrompt?.prompt ||
      `
      Generate EXACTLY ${count} Spanish conjugation questions for ${difficulty} level students.

      IMPORTANT: You must generate exactly ${count} questions, no more, no less.

      For each question, provide:
      - A unique ID (numbered 1, 2, 3, etc.)
      - The conjugated verb as the answer
      - The conjugation tense (use these exact values: Preterite, Imperfect, Conditional, Future, AffirmativeImperative, NegativeImperative, PresentSubjunctive, ImperfectSubjunctive, PresentProgressive, PreteriteProgressive, ImperfectProgressive, ConditionalProgressive, FutureProgressive, PresentPerfect, PastPerfect, ConditionalPerfect, FuturePerfect, PresentPerfectSubjunctive, PastPerfectSubjunctive, InformalFuture)
      - The infinitive form of the verb
      - Whether the verb form uses a gerund (true/false)
      - An example sentence using the conjugated verb
      - An example sentence with a different pronoun (optional)

      Mix different tenses and include common irregular verbs.
      Make sure the questions are appropriate for ${difficulty} level Spanish learners.

      Remember: Generate EXACTLY ${count} questions.
    `;

    // Generate structured output using AI SDK
    const result = await generateObject({
      model: google("gemini-2.0-flash"),
      prompt: promptText,
      schema: ConjugationQuestionsArraySchema,
      temperature: 0.7,
    });

    // Enforce the exact count by slicing the results
    const questions = result.object.questions.slice(0, count);

    // Update the result object
    result.object.questions = questions;

    // Log the successful generation
    generation.end({
      output: result.object,
      usage: {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
    });

    // Rotate to next API key after successful completion
    apiKeyManager.rotateToNextKey();

    // Log API key stats
    const keyStats = apiKeyManager.getKeyStats();
    console.log(
      `API Key Stats - Total: ${keyStats.total}, Valid: ${keyStats.valid}, Invalid: ${keyStats.invalid}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        questions: result.object.questions,
        metadata: {
          count: result.object.questions.length,
          difficulty,
          usage: result.usage,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating conjugation questions:", error);

    // Handle API key rotation on error
    if (
      error instanceof Error &&
      (error.message.includes("invalid_api_key") ||
        error.message.includes("API key") ||
        error.message.includes("rate limit") ||
        error.message.includes("unregistered callers") ||
        error.message.includes("PERMISSION_DENIED"))
    ) {
      console.log("API key error detected, rotating to next key");
      apiKeyManager.rotateToNextKey();
    }

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

export const GET: APIRoute = ({ params, request }) => {
  return new Response(
    JSON.stringify({
      message: "Spanish conjugation API - Use POST to generate questions",
      path: new URL(request.url).pathname,
      usage: {
        endpoint: "POST /api/spanish",
        parameters: {
          count:
            "number (optional, default: 5) - Number of questions to generate",
          difficulty:
            "string (optional, default: 'intermediate') - Difficulty level",
        },
        example: {
          count: 3,
          difficulty: "beginner",
        },
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

export const HEAD: APIRoute = ({ params, request }) => {
  return new Response(
    JSON.stringify({
      message: "Spanish conjugation API - Use POST to generate questions",
      path: new URL(request.url).pathname,
      usage: {
        endpoint: "POST /api/spanish",
        parameters: {
          count:
            "number (optional, default: 5) - Number of questions to generate",
          difficulty:
            "string (optional, default: 'intermediate') - Difficulty level",
        },
        example: {
          count: 3,
          difficulty: "beginner",
        },
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
