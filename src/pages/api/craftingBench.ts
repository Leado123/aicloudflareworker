// src/pages/api/craftingBench.ts
// 
// ⚠️ DEPRECATED: This endpoint has been replaced by the type-safe API system.
// Please use the following type-safe endpoints instead:
// - /api/modes/craftingTable/extractText
// - /api/modes/craftingTable/generateNotes  
// - /api/modes/craftingTable/generateFlashcards
// This file will be removed in a future version.
// 
// Migration guide:
// - Import { modeAPI } from '../../util/modeAPIClient'
// - Use: await modeAPI.craftingTable.generateNotes({ content, extraCommands })
// - Use: await modeAPI.craftingTable.generateFlashcards({ content, extraCommands })
// - See TYPE_SAFE_API_SYSTEM.md for full documentation

export const prerender = false;

import type { APIContext } from 'astro';

export async function POST({ request }: APIContext) {
    return new Response(JSON.stringify({
        error: "This endpoint is deprecated. Please use the type-safe API endpoints for crafting table operations",
        migration: {
            extractText: "/api/modes/craftingTable/extractText",
            generateNotes: "/api/modes/craftingTable/generateNotes",
            generateFlashcards: "/api/modes/craftingTable/generateFlashcards",
            documentation: "See TYPE_SAFE_API_SYSTEM.md for migration guide"
        }
    }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function GET({ request }: APIContext) {
    return new Response(JSON.stringify({
        error: "This endpoint is deprecated. Please use the type-safe API endpoints for crafting table operations",
        migration: {
            extractText: "/api/modes/craftingTable/extractText",
            generateNotes: "/api/modes/craftingTable/generateNotes", 
            generateFlashcards: "/api/modes/craftingTable/generateFlashcards",
            documentation: "See TYPE_SAFE_API_SYSTEM.md for migration guide"
        }
    }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' }
    });
}
