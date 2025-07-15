import type { APIRoute } from "astro";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ request }) => {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  };

  // Helper function to run a test
  const runTest = async (name: string, testFn: () => Promise<any>) => {
    try {
      const result = await testFn();
      testResults.tests.push({
        name,
        status: "PASSED",
        result,
      });
      testResults.summary.passed++;
    } catch (error) {
      testResults.tests.push({
        name,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      testResults.summary.failed++;
    }
    testResults.summary.total++;
  };

  // Test 1: Database connection
  await runTest("Database Connection", async () => {
    await prisma.$connect();
    return "Database connected successfully";
  });

  // Test 2: Create test Spanish entity
  let testEntityId: string | null = null;
  await runTest("Create Spanish Entity", async () => {
    const entity = await prisma.spanishEntities.create({
      data: {
        name: `Test Quiz - ${new Date().toISOString()}`,
        conjugationQuestions: {
          create: [
            {
              conjugatedVerbAnswer: "hablé",
              conjugationTense: "Preterite",
              verbInInfiniteTense: "hablar",
              hasGerund: false,
              sentenceWithVerb: "Yo hablé con mi amigo ayer.",
              exampleSentenceWithDifferentPronoun: "Ella habló con su madre.",
            },
            {
              conjugatedVerbAnswer: "comiendo",
              conjugationTense: "PresentProgressive",
              verbInInfiniteTense: "comer",
              hasGerund: true,
              sentenceWithVerb: "Estoy comiendo una manzana.",
              exampleSentenceWithDifferentPronoun: "Él está comiendo pizza.",
            },
          ],
        },
      },
      include: {
        conjugationQuestions: true,
      },
    });
    testEntityId = entity.id;
    return {
      id: entity.id,
      name: entity.name,
      questionCount: entity.conjugationQuestions.length,
    };
  });

  // Test 3: Retrieve Spanish entities
  await runTest("Retrieve Spanish Entities", async () => {
    const entities = await prisma.spanishEntities.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        conjugationQuestions: true,
      },
    });
    return {
      count: entities.length,
      latestEntity: entities[0]?.name || "No entities found",
    };
  });

  // Test 4: Get specific Spanish entity
  if (testEntityId) {
    await runTest("Get Specific Spanish Entity", async () => {
      const entity = await prisma.spanishEntities.findUnique({
        where: { id: testEntityId },
        include: {
          conjugationQuestions: true,
        },
      });
      return {
        found: !!entity,
        name: entity?.name,
        questionCount: entity?.conjugationQuestions.length || 0,
      };
    });
  }

  // Test 5: Test ConjugationTense enum values
  await runTest("ConjugationTense Enum Values", async () => {
    const testQuestion = await prisma.conjugationQuestion.create({
      data: {
        conjugatedVerbAnswer: "corrió",
        conjugationTense: "Preterite",
        verbInInfiniteTense: "correr",
        hasGerund: false,
        sentenceWithVerb: "Él corrió muy rápido.",
      },
    });

    const retrieved = await prisma.conjugationQuestion.findUnique({
      where: { id: testQuestion.id },
    });

    // Clean up
    await prisma.conjugationQuestion.delete({
      where: { id: testQuestion.id },
    });

    return {
      created: !!testQuestion,
      retrieved: !!retrieved,
      tenseMatch: retrieved?.conjugationTense === "Preterite",
    };
  });

  // Test 6: API Key connection (check if APIKeys table exists)
  await runTest("API Keys Table", async () => {
    const keyCount = await prisma.aPIKeys.count();
    return {
      tableExists: true,
      keyCount,
    };
  });

  // Clean up test data
  if (testEntityId) {
    await runTest("Cleanup Test Data", async () => {
      await prisma.spanishEntities.delete({
        where: { id: testEntityId },
      });
      return "Test entity deleted successfully";
    });
  }

  // Disconnect from database
  await prisma.$disconnect();

  return new Response(
    JSON.stringify({
      success: testResults.summary.failed === 0,
      message: `Tests completed: ${testResults.summary.passed}/${testResults.summary.total} passed`,
      ...testResults,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create-sample-quiz") {
      const entity = await prisma.spanishEntities.create({
        data: {
          name: `Sample Quiz - ${new Date().toLocaleDateString()}`,
          conjugationQuestions: {
            create: [
              {
                conjugatedVerbAnswer: "hablé",
                conjugationTense: "Preterite",
                verbInInfiniteTense: "hablar",
                hasGerund: false,
                sentenceWithVerb: "Yo hablé con mi amigo ayer.",
                exampleSentenceWithDifferentPronoun: "Ella habló con su madre.",
              },
              {
                conjugatedVerbAnswer: "comiendo",
                conjugationTense: "PresentProgressive",
                verbInInfiniteTense: "comer",
                hasGerund: true,
                sentenceWithVerb: "Estoy comiendo una manzana.",
                exampleSentenceWithDifferentPronoun: "Él está comiendo pizza.",
              },
              {
                conjugatedVerbAnswer: "viviré",
                conjugationTense: "Future",
                verbInInfiniteTense: "vivir",
                hasGerund: false,
                sentenceWithVerb: "Yo viviré en España el próximo año.",
                exampleSentenceWithDifferentPronoun: "Nosotros viviremos aquí.",
              },
            ],
          },
        },
        include: {
          conjugationQuestions: true,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Sample quiz created successfully",
          data: entity,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid action",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
