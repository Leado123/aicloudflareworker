import { prisma } from "@/lib/prisma";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const url = new URL(request.url);
    const take = parseInt(url.searchParams.get("take") || "10");
    const skip = parseInt(url.searchParams.get("skip") || "0");

    const results = await prisma.spanishEntities.findMany({
      take,
      skip,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        conjugationQuestions: true,
        genderedWordQuestions: true,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        metadata: {
          count: results.length,
          take,
          skip,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching Spanish quizzes:", error);

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
