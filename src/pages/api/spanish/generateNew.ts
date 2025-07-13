import { PrismaClient } from "@prisma/client";
import type { APIRoute } from "astro";

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ params, request }) => {
    
    

    return new Response(
    ); 
};