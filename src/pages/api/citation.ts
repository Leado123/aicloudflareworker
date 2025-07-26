// design a schema for calling stuff within this api route
// make sure to follow this schema when requesting stuff from this server
import ArchiveOfAnna from "archive_of_anna";

import { APIContext, APIRoute } from "astro";
import z from "zod";

const citationRequestSchema = z.object({
    searchQuery: z.string().optional(),
    md5: z.string().optional(),
    lang: z.string().optional(),
    content: z.string().optional(),
    ext: z.string().optional(),
    sort: z.string().optional(),
});

export async function POST({ request }: APIContext) {
    try {
        const body = await request.json();
        const citationRequest = citationRequestSchema.parse(body);

        // If MD5 is provided, fetch detailed information about that specific book
        if (citationRequest.md5) {
            try {
                const detailedInfo = await ArchiveOfAnna.fetch_by_md5(citationRequest.md5);
                
                return new Response(JSON.stringify({
                    success: true,
                    type: 'detailed',
                    data: detailedInfo
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ 
                    error: "Failed to fetch book details",
                    details: error instanceof Error ? error.message : "Unknown error"
                }), { status: 404 });
            }
        }

        // If search query is provided, search for books
        if (citationRequest.searchQuery) {
            try {
                const searchResults = await ArchiveOfAnna.search(
                    citationRequest.searchQuery,
                    citationRequest.lang || '',
                    citationRequest.content || '',
                    citationRequest.ext || '',
                    citationRequest.sort || ''
                );

                return new Response(JSON.stringify({
                    success: true,
                    type: 'search',
                    data: searchResults,
                    count: searchResults.length
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ 
                    error: "Failed to search books",
                    details: error instanceof Error ? error.message : "Unknown error"
                }), { status: 500 });
            }
        }

        // If neither MD5 nor search query is provided
        return new Response(JSON.stringify({ 
            error: "Either 'searchQuery' or 'md5' must be provided" 
        }), { status: 400 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify({ 
                error: "Invalid request format",
                details: error.errors 
            }), { status: 400 });
        }

        return new Response(JSON.stringify({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), { status: 500 });
    }
}

// GET method for simple search queries
export async function GET({ request }: APIContext) {
    try {
        const url = new URL(request.url);
        const searchQuery = url.searchParams.get('q');
        const md5 = url.searchParams.get('md5');

        if (md5) {
            // Fetch detailed information by MD5
            const detailedInfo = await ArchiveOfAnna.fetch_by_md5(md5);
            
            return new Response(JSON.stringify({
                success: true,
                type: 'detailed',
                data: detailedInfo
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (searchQuery) {
            // Search for books
            const searchResults = await ArchiveOfAnna.search(searchQuery);
            
            return new Response(JSON.stringify({
                success: true,
                type: 'search',
                data: searchResults,
                count: searchResults.length
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ 
            error: "Query parameter 'q' (search) or 'md5' must be provided",
            examples: {
                search: "/api/citation?q=javascript programming",
                detailed: "/api/citation?md5=abc123def456..."
            }
        }), { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), { status: 500 });
    }
}