// Citation API using Bibify service
// Documentation: https://gitlab.com/bibify/bibserver/-/wikis/home
import { bibifyClient, searchMultipleTerms } from "@/util/bibifyClient";
import type { BibifySearchResult, BibifyDetailResponse } from "@/util/bibifyClient";

import { APIContext, APIRoute } from "astro";
import z from "zod";

const citationRequestSchema = z.object({
    searchQuery: z.string().optional(),
    id: z.string().optional(), // Changed from md5 to id for bibify
    type: z.string().optional(), // 'book', 'article', 'thesis', etc.
    year_start: z.number().optional(),
    year_end: z.number().optional(),
    language: z.string().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
});

export async function POST({ request }: APIContext) {
    try {
        const body = await request.json();
        const citationRequest = citationRequestSchema.parse(body);

        // If ID is provided, fetch detailed information about that specific document
        if (citationRequest.id) {
            try {
                const detailedInfo = await bibifyClient.getDetails(citationRequest.id);
                
                if (!detailedInfo) {
                    return new Response(JSON.stringify({ 
                        error: "Document not found",
                        details: `No document found with ID: ${citationRequest.id}`
                    }), { status: 404 });
                }

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
                    error: "Failed to fetch document details",
                    details: error instanceof Error ? error.message : "Unknown error"
                }), { status: 404 });
            }
        }

        // If search query is provided, search for documents
        if (citationRequest.searchQuery) {
            try {
                const searchOptions = {
                    type: citationRequest.type,
                    year_start: citationRequest.year_start,
                    year_end: citationRequest.year_end,
                    language: citationRequest.language,
                    page: citationRequest.page || 1,
                    per_page: citationRequest.per_page || 10,
                };

                // Use multi-term search to handle queries like "DSM 5 tr and Hamlet"
                const searchResults = await searchMultipleTerms(
                    citationRequest.searchQuery,
                    searchOptions
                );

                return new Response(JSON.stringify({
                    success: true,
                    type: 'search',
                    data: searchResults.results,
                    count: searchResults.total,
                    pagination: {
                        page: searchResults.page,
                        per_page: searchResults.per_page,
                        total: searchResults.total
                    },
                    searchTerms: searchResults.searchTerms, // Include parsed search terms
                    message: searchResults.searchTerms.length > 1 
                        ? `Found results for ${searchResults.searchTerms.length} search terms: ${searchResults.searchTerms.join(', ')}`
                        : `Found results for: ${searchResults.searchTerms[0]}`
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ 
                    error: "Failed to search citations",
                    details: error instanceof Error ? error.message : "Unknown error"
                }), { status: 500 });
            }
        }

        // If neither ID nor search query is provided
        return new Response(JSON.stringify({ 
            error: "Either 'searchQuery' or 'id' must be provided" 
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
        const id = url.searchParams.get('id');
        const type = url.searchParams.get('type');
        const format = url.searchParams.get('format') as 'bibtex' | 'apa' | 'mla' | 'chicago' | null;

        // Special case: get citation in specific format
        if (id && format) {
            const citation = await bibifyClient.getCitation(id, format);
            
            if (!citation) {
                return new Response(JSON.stringify({
                    error: "Citation not found",
                    details: `No citation found for ID: ${id} in format: ${format}`
                }), { status: 404 });
            }

            return new Response(citation, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        if (id) {
            // Fetch detailed information by ID
            const detailedInfo = await bibifyClient.getDetails(id);
            
            if (!detailedInfo) {
                return new Response(JSON.stringify({
                    error: "Document not found",
                    details: `No document found with ID: ${id}`
                }), { status: 404 });
            }
            
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
            // Search for documents using multi-term search
            const searchResults = await searchMultipleTerms(searchQuery, {
                type: type || undefined,
                page: 1,
                per_page: 10
            });
            
            return new Response(JSON.stringify({
                success: true,
                type: 'search',
                data: searchResults.results,
                count: searchResults.total,
                pagination: {
                    page: searchResults.page,
                    per_page: searchResults.per_page,
                    total: searchResults.total
                },
                searchTerms: searchResults.searchTerms,
                message: searchResults.searchTerms.length > 1 
                    ? `Found results for ${searchResults.searchTerms.length} search terms: ${searchResults.searchTerms.join(', ')}`
                    : `Found results for: ${searchResults.searchTerms[0]}`
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ 
            error: "Query parameter 'q' (search) or 'id' must be provided",
            examples: {
                search: "/api/citation?q=machine learning&type=article",
                detailed: "/api/citation?id=abc123",
                citation: "/api/citation?id=abc123&format=apa"
            }
        }), { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), { status: 500 });
    }
}