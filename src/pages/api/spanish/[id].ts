import { prisma } from "@/lib/prisma";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ID parameter is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const spanishEntity = await prisma.spanishEntities.findUnique({
      where: {
        id: id as string,
      },
      include: {
        conjugationQuestions: true,
        genderedWordQuestions: true,
      },
    });

    if (!spanishEntity) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Spanish quiz not found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

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
    console.error("Error fetching Spanish quiz:", error);

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
