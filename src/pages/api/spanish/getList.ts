import { PrismaClient } from "@prisma/client";
import type { APIRoute } from "astro";

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ params, request }) => {
    let take = params.take ? parseInt(params.take) : 5;
    let skip = params.skip ? parseInt(params.skip) : 0;

    let results = await prisma.spanishEntities.findMany({
        take,
        skip,
        orderBy: {
            createdAt: 'desc'
        }
    })
    

    return new Response(
        JSON.stringify(results)
    ); 
};