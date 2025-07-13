// Example usage of the Spanish conjugation API
// This demonstrates how to call the API and handle the response

import { useState } from "react";

interface ConjugationQuestion {
  id: string;
  conjugatedVerbAnswer: string;
  conjugationTense: number;
  verbInInfiniteTense: string;
  hasGerund: boolean;
  sentenceWithVerb?: string;
  exampleSentenceWithDifferentPronoun?: string;
}

interface ConjugationResponse {
  success: boolean;
  questions?: ConjugationQuestion[];
  metadata?: {
    count: number;
    difficulty: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: string;
}

/**
 * Generate Spanish conjugation questions
 * @param count - Number of questions to generate (default: 5)
 * @param difficulty - Difficulty level: 'beginner', 'intermediate', 'advanced'
 * @returns Promise<ConjugationResponse>
 */
async function generateConjugationQuestions(
  count: number = 5,
  difficulty: string = "intermediate"
): Promise<ConjugationResponse> {
  try {
    const response = await fetch("/api/spanish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        count,
        difficulty,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ConjugationResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating conjugation questions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Example usage of the Spanish conjugation API
 */
export async function exampleUsage() {
  console.log("=== Spanish Conjugation API Example ===\n");

  // Example 1: Basic usage with defaults
  console.log("1. Generating 5 intermediate questions...");
  const result1 = await generateConjugationQuestions();

  if (result1.success && result1.questions) {
    console.log(`Generated ${result1.questions.length} questions:`);
    result1.questions.forEach((q, index) => {
      console.log(
        `${index + 1}. ${q.verbInInfiniteTense} → ${q.conjugatedVerbAnswer}`
      );
      if (q.sentenceWithVerb) {
        console.log(`   Example: ${q.sentenceWithVerb}`);
      }
    });
    console.log(`Token usage: ${result1.metadata?.usage.totalTokens} tokens\n`);
  } else {
    console.error("Failed to generate questions:", result1.error);
  }

  // Example 2: Beginner level questions
  console.log("2. Generating 3 beginner questions...");
  const result2 = await generateConjugationQuestions(3, "beginner");

  if (result2.success && result2.questions) {
    console.log(`Generated ${result2.questions.length} beginner questions:`);
    result2.questions.forEach((q, index) => {
      console.log(
        `${index + 1}. ${q.verbInInfiniteTense} → ${q.conjugatedVerbAnswer}`
      );
      console.log(`   Has gerund: ${q.hasGerund}`);
      if (q.sentenceWithVerb) {
        console.log(`   Example: ${q.sentenceWithVerb}`);
      }
      if (q.exampleSentenceWithDifferentPronoun) {
        console.log(`   Alternative: ${q.exampleSentenceWithDifferentPronoun}`);
      }
    });
  } else {
    console.error("Failed to generate beginner questions:", result2.error);
  }

  // Example 3: Advanced level questions
  console.log("\n3. Generating 2 advanced questions...");
  const result3 = await generateConjugationQuestions(2, "advanced");

  if (result3.success && result3.questions) {
    console.log(`Generated ${result3.questions.length} advanced questions:`);
    result3.questions.forEach((q, index) => {
      console.log(
        `${index + 1}. ${q.verbInInfiniteTense} → ${q.conjugatedVerbAnswer}`
      );
      console.log(`   Tense: ${q.conjugationTense}`);
      if (q.sentenceWithVerb) {
        console.log(`   Example: ${q.sentenceWithVerb}`);
      }
    });
  } else {
    console.error("Failed to generate advanced questions:", result3.error);
  }
}

/**
 * Interactive example for testing different parameters
 */
export async function interactiveExample() {
  const difficulties = ["beginner", "intermediate", "advanced"];
  const counts = [1, 3, 5, 10];

  console.log("\n=== Interactive Spanish Conjugation Testing ===\n");

  for (const difficulty of difficulties) {
    for (const count of counts) {
      console.log(`Testing ${count} ${difficulty} questions...`);

      const result = await generateConjugationQuestions(count, difficulty);

      if (result.success && result.questions) {
        console.log(
          `✅ Successfully generated ${result.questions.length} questions`
        );
        console.log(
          `   Token usage: ${result.metadata?.usage.totalTokens} tokens`
        );

        // Show first question as example
        if (result.questions.length > 0) {
          const firstQ = result.questions[0];
          console.log(
            `   Sample: ${firstQ.verbInInfiniteTense} → ${firstQ.conjugatedVerbAnswer}`
          );
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }

      console.log("---");

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Export the main function for use in other files
export { generateConjugationQuestions };

// Example of how to use this in a React component
export const SpanishQuizComponent = () => {
  const [questions, setQuestions] = useState<ConjugationQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQuestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateConjugationQuestions(5, "intermediate");

      if (result.success && result.questions) {
        setQuestions(result.questions);
      } else {
        setError(result.error || "Failed to generate questions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Spanish Conjugation Quiz</h2>

      <button
        onClick={handleGenerateQuestions}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Questions"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Generated Questions:</h3>
          {questions.map((question, index) => (
            <div key={question.id} className="mb-4 p-3 border rounded">
              <div className="font-medium">
                {index + 1}. Conjugate "{question.verbInInfiniteTense}"
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Answer: {question.conjugatedVerbAnswer}
              </div>
              {question.sentenceWithVerb && (
                <div className="text-sm text-gray-700 mt-1">
                  Example: {question.sentenceWithVerb}
                </div>
              )}
              {question.exampleSentenceWithDifferentPronoun && (
                <div className="text-sm text-gray-700 mt-1">
                  Alternative: {question.exampleSentenceWithDifferentPronoun}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
