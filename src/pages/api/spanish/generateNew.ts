import { prisma } from "@/lib/prisma";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json();
    const { name, questionIds } = body as {
      name: string;
      questionIds: string[];
    };

    if (!name || !questionIds || questionIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Name and questionIds are required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create a new Spanish entity with the selected questions
    const spanishEntity = await prisma.spanishEntities.create({
      data: {
        name,
        conjugationQuestions: {
          connect: questionIds.map((id) => ({ id })),
        },
      },
      include: {
        conjugationQuestions: true,
        genderedWordQuestions: true,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: spanishEntity,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating Spanish quiz:", error);

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
