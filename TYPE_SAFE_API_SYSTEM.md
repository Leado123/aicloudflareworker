# Type-Safe Mode API System

This document explains how to use the type-safe API system that allows modes to make validated requests to the server.

## Overview

The type-safe API system provides:
- **Type Safety**: All API calls are fully typed with TypeScript
- **Validation**: Both client and server-side input/output validation
- **Dynamic Routing**: Automatic route handling for `/api/modes/[mode]/[action]`
- **Error Handling**: Consistent error types and messages
- **Mode Isolation**: Each mode defines its own API actions

## Architecture

```
Client (Mode Component)
    ↓ (uses modeAPI.chat.generateTitle())
Type-Safe API Client
    ↓ (POST /api/modes/chat/generateTitle)
Dynamic API Route
    ↓ (validates & routes)
Mode-Specific Handler
    ↓ (executes logic)
Response
```

## Usage in Components

### 1. Import the API client

```tsx
import { useModeAPI } from '@/util/modeAPIClient';

export default function MyModeComponent() {
    const modeAPI = useModeAPI();
    
    // Now you have access to all mode APIs
}
```

### 2. Make type-safe API calls

```tsx
// Chat API calls
const result = await modeAPI.chat.generateTitle({ 
    message: "Hello world" 
});
// result.title is typed as string

// Crafting Table API calls
const notes = await modeAPI.craftingTable.generateNotes({
    content: "Study material content",
    extraCommands: "Focus on key concepts"
});
// notes.notes is typed as string

// Writing API calls  
const improved = await modeAPI.write.improveText({
    text: "Original text",
    instructions: "Make it more formal"
});
// improved.improvedText and improved.suggestions are properly typed
```

### 3. Handle errors

```tsx
import { ModeAPIError } from '@/util/modeAPIClient';

try {
    const result = await modeAPI.chat.generateTitle({ message: "test" });
    console.log(result.title);
} catch (error) {
    if (error instanceof ModeAPIError) {
        console.error(`${error.mode}/${error.action}: ${error.message}`);
    } else {
        console.error('Unknown error:', error);
    }
}
```

## Available API Actions

### Chat Mode APIs

| Action | Input | Output | Description |
|--------|-------|--------|-------------|
| `generateTitle` | `{ message: string }` | `{ title: string }` | Generate a conversation title |
| `streamResponse` | `{ messages: CoreMessage[], conversationId: string }` | `{ response: string }` | Get AI response |
| `analyzeConversation` | `{ conversationId: string }` | `{ summary: string; topics: string[] }` | Analyze conversation |

### Crafting Table Mode APIs

| Action | Input | Output | Description |
|--------|-------|--------|-------------|
| `processFiles` | `{ files: File[], action: 'notes' \| 'flashcards' }` | `{ content: string }` | Process uploaded files |
| `generateNotes` | `{ content: string, extraCommands?: string }` | `{ notes: string }` | Generate study notes |
| `generateFlashcards` | `{ content: string, extraCommands?: string }` | `{ flashcards: Array<{front: string, back: string}> }` | Generate flashcards |
| `extractText` | `{ files: File[] }` | `{ extractedText: string[] }` | Extract text from files |

### Writing Mode APIs

| Action | Input | Output | Description |
|--------|-------|--------|-------------|
| `improveText` | `{ text: string, instructions?: string }` | `{ improvedText: string; suggestions: string[] }` | Improve text quality |
| `generateOutline` | `{ topic: string, requirements?: string }` | `{ outline: string; sections: string[] }` | Generate document outline |
| `checkGrammar` | `{ text: string }` | `{ corrections: Array<{original: string, suggested: string, reason: string}> }` | Check grammar |

## Adding New API Actions

### 1. Define types in `apiDefinitions.ts`

```typescript
export interface MyModeAPIActions {
    newAction: APIAction<
        { input: string },
        { output: string }
    >;
}
```

### 2. Create handler in `pages/api/modes/myMode/handlers.ts`

```typescript
export const myModeAPIHandlers: MyModeAPIActions = {
    newAction: {
        name: 'newAction',
        handler: async (input: { input: string }) => {
            // Your logic here
            return { output: "processed: " + input.input };
        },
        validate: (input: any): input is { input: string } => {
            return typeof input?.input === 'string';
        }
    }
};
```

### 3. Add to mode definition in `modes.ts`

```typescript
apiActions: {
    newAction: {
        name: 'newAction',
        handler: async () => { throw new Error('Handler only available on server side'); }
    }
}
```

### 4. Update API client interface

```typescript
export interface ModeAPIClient {
    myMode: {
        newAction(input: { input: string }): Promise<{ output: string }>;
    };
}
```

### 5. Implement in API client

```typescript
myMode = {
    newAction: (input: { input: string }) =>
        this.makeRequest<{ input: string }, { output: string }>('myMode', 'newAction', input)
};
```

## Testing

Use the API demo page at `/api-demo` to test your API actions:

```bash
npm run dev
# Navigate to http://localhost:4321/api-demo
```

Or test programmatically:

```typescript
import { testAPIEndpoint } from '@/util/modeAPIClient';

// Only works in development
await testAPIEndpoint('chat', 'generateTitle', { message: 'test' });
```

## Best Practices

1. **Always validate inputs** - Use the `validate` function in handlers
2. **Handle errors gracefully** - Use try/catch and proper error types  
3. **Keep actions focused** - Each action should do one thing well
4. **Document your APIs** - Update this file when adding new actions
5. **Test thoroughly** - Use the demo page and write unit tests

## Server-side Implementation Details

The dynamic API route `/api/modes/[mode]/[action].ts` handles:
- Route parameter validation
- Request body parsing and validation  
- Handler lookup and execution
- Error handling and response formatting
- HTTP method validation (only POST supported)

Each mode has its own handler file with typed action definitions that are automatically registered with the routing system.
