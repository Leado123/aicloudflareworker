// Dynamic API route for mode-specific actions
// Handles requests to /api/modes/[mode]/[action]

export const prerender = false;

import type { APIContext } from 'astro';
import type { APIRequest, APIResponse } from '../../../../util/apiDefinitions';
import { isValidAPIRequest, isValidModeAction, createAPIResponse, createAPIError } from '../../../../util/apiDefinitions';
import { chatAPIHandlers } from '../chat/handlers';
import { craftingTableAPIHandlers } from '../craftingTable/handlers';
import { writingAPIHandlers } from '../write/handlers';

// Map of mode handlers
const modeHandlers = {
    chat: chatAPIHandlers,
    craftingTable: craftingTableAPIHandlers,
    write: writingAPIHandlers
} as const;

export async function POST({ request, params }: APIContext) {
    try {
        const { mode, action } = params;

        // Validate mode
        if (!mode || !isValidModeAction(mode, action || '')) {
            return new Response(JSON.stringify(createAPIError('Invalid mode specified')), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate action
        if (!action) {
            return new Response(JSON.stringify(createAPIError('Action not specified')), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        let requestData: APIRequest;
        try {
            const body = await request.json();
            if (!isValidAPIRequest(body)) {
                return new Response(JSON.stringify(createAPIError('Invalid request format')), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            requestData = body;
        } catch (error) {
            return new Response(JSON.stringify(createAPIError('Invalid JSON in request body')), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get mode handlers
        const handlers = modeHandlers[mode as keyof typeof modeHandlers];
        if (!handlers) {
            return new Response(JSON.stringify(createAPIError(`No handlers found for mode: ${mode}`)), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get specific action handler
        const actionHandler = handlers[action as keyof typeof handlers] as any;
        if (!actionHandler) {
            return new Response(JSON.stringify(createAPIError(`Action '${action}' not found for mode '${mode}'`)), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate input if validator exists
        if (actionHandler.validate && !actionHandler.validate(requestData.payload)) {
            return new Response(JSON.stringify(createAPIError(`Invalid input for action '${action}'`)), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Execute the handler
        try {
            const result = await actionHandler.handler(requestData.payload);
            return new Response(JSON.stringify(createAPIResponse(result)), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (handlerError) {
            console.error(`Handler error for ${mode}/${action}:`, handlerError);
            return new Response(JSON.stringify(createAPIError(
                `Handler failed: ${handlerError instanceof Error ? handlerError.message : 'Unknown error'}`
            )), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('API Route Error:', error);
        return new Response(JSON.stringify(createAPIError(
            `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle unsupported methods
export async function GET({ params }: APIContext) {
    return new Response(JSON.stringify(createAPIError('GET method not supported. Use POST for API calls.')), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function PUT({ params }: APIContext) {
    return new Response(JSON.stringify(createAPIError('PUT method not supported. Use POST for API calls.')), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function DELETE({ params }: APIContext) {
    return new Response(JSON.stringify(createAPIError('DELETE method not supported. Use POST for API calls.')), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}
