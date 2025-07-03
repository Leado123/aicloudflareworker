# Unified Mode System Documentation

This document explains the new unified mode system that standardizes all application modes with proper typing, automatic nanostores, localStorage management, and a standardized React component interface.

## Architecture Overview

The unified mode system consists of several key components:

1. **Mode Definitions** (`src/util/modeDefinitions.ts`) - Core types and interfaces
2. **Specific Modes** (`src/util/modes.ts`) - Definitions for Chat, Crafting Table, and Writing modes
3. **Mode Provider** (`src/components/ModeProvider.tsx`) - Universal data fetching and state management
4. **Universal Components** (`src/components/UniversalModeComponent.tsx`) - Standardized UI components
5. **Enhanced Store** (`src/util/enhancedStore.ts`) - Backward compatibility layer

## Core Types

### BaseEntity
All entities in the system extend from `BaseEntity`:

```typescript
interface BaseEntity {
    id: string;
    title: string;
    createdAt?: Date;
    updatedAt?: Date;
}
```

### Mode-Specific Types

- **Conversation**: Chat messages and metadata
- **CraftingBench**: Files, notes, and flashcards for study sessions
- **Document**: Writing content with versioning and word count

## Mode Definition Interface

Each mode implements the `ModeDefinition<T>` interface:

```typescript
interface ModeDefinition<T extends BaseEntity> {
    name: string;                    // Internal name
    key: string;                     // Storage key
    icon: string;                    // Icon identifier
    displayName: string;             // User-facing name
    component: ComponentType<ModeComponentProps<T>>;  // React component
    dataType: new () => T;           // Type constructor
    defaultEntity: () => Omit<T, 'id'>;  // Default entity factory
    serialize: (entity: T) => any;   // Serialization function
    deserialize: (data: any) => T;   // Deserialization function
    isEmpty: (entity: T) => boolean; // Empty check function
}
```

## Automatic Features

### Nanostores
Each mode automatically gets:
- `entities` - Array of all entities
- `currentEntityId` - ID of currently selected entity
- `currentEntity` - Computed current entity
- `isEmpty` - Computed empty state

### Actions
Each mode automatically gets these actions:
- `createEntity(data?: Partial<T>)` - Create new entity
- `updateEntity(id: string, updates: Partial<T>)` - Update entity
- `deleteEntity(id: string)` - Delete entity
- `setCurrentEntity(id: string | null)` - Set current entity
- `addEntity(entity: T)` - Add existing entity

### LocalStorage
Automatic persistence with:
- Entity serialization/deserialization
- Current entity ID tracking
- Error handling and fallbacks
- Hydration management

## Component Interface

All mode components receive standardized props via `ModeComponentProps<T>`:

```typescript
interface ModeComponentProps<T extends BaseEntity> {
    entities: T[];                           // All entities
    currentEntity: T | null;                 // Current entity
    isEmpty: boolean;                        // Is current entity empty
    createEntity: (data?: Partial<T>) => string;  // Create function
    updateEntity: (id: string, updates: Partial<T>) => void;  // Update function
    deleteEntity: (id: string) => void;     // Delete function
    setCurrentEntity: (id: string | null) => void;  // Set current function
    addEntity: (entity: T) => void;         // Add function
}
```

## Usage Examples

### Using the Mode System

```typescript
// Get mode-specific data
const { entities, currentEntity, isEmpty, createEntity } = useModeEntities<Conversation>('chat');

// Switch between modes
const { currentMode, switchMode } = useModeSwitcher();
switchMode('craftingTable');

// Use enhanced store functions (backward compatibility)
const { saveNotesToCraftingBench } = useCraftingBenchOperations();
```

### Creating a Mode Component

```typescript
export default function MyMode({ 
    entities, 
    currentEntity, 
    isEmpty,
    createEntity,
    updateEntity 
}: ModeComponentProps<MyEntityType>) {
    // Component implementation
    return (
        <div>
            {isEmpty ? (
                <EmptyState 
                    title="No content yet"
                    description="Create your first item"
                    actionLabel="Create"
                    onAction={() => createEntity()}
                />
            ) : (
                <div>Current: {currentEntity?.title}</div>
            )}
        </div>
    );
}
```

### Using Universal Components

```typescript
<UniversalModeComponent
    renderSidebar={(props) => <EntityListSidebar {...props} />}
    renderFooter={(props) => <StatusFooter {...props} />}
    className="p-4"
/>
```

## Mode Definitions

### Chat Mode
- **Entities**: Conversations with messages
- **Key Features**: Message history, AI responses
- **Empty State**: No messages in conversation

### Crafting Table Mode
- **Entities**: Study sessions with files, notes, flashcards
- **Key Features**: File upload, AI-generated content, streaming
- **Empty State**: No files uploaded

### Writing Mode
- **Entities**: Documents with content and versioning
- **Key Features**: Rich text editing, word count, version tracking
- **Empty State**: No content written

## Migration Guide

### From Old Store System

1. Replace direct store imports with mode hooks:
```typescript
// Old
const conversations = useStore(conversationsAtom);

// New
const { entities: conversations } = useModeEntities('chat');
```

2. Update component props:
```typescript
// Old
function MyComponent() {
    const data = useStore(someAtom);
    // ...
}

// New
function MyComponent(props: ModeComponentProps<MyType>) {
    const { entities, currentEntity } = props;
    // ...
}
```

3. Use enhanced store for complex operations:
```typescript
// Import enhanced functions
import { useCraftingBenchOperations } from '@/util/enhancedStore';

// Use in component
const { saveNotesToCraftingBench } = useCraftingBenchOperations();
```

## Benefits

1. **Type Safety**: Full TypeScript support with proper typing
2. **Consistency**: Standardized patterns across all modes
3. **Automatic Features**: Storage, state management, and actions generated automatically
4. **Modularity**: Easy to add new modes or modify existing ones
5. **Performance**: Optimized with computed values and selective re-renders
6. **Developer Experience**: Clear interfaces and helpful utilities

## File Structure

```
src/
├── util/
│   ├── modeDefinitions.ts    # Core types and interfaces
│   ├── modes.ts              # Specific mode definitions
│   └── enhancedStore.ts      # Backward compatibility
├── components/
│   ├── ModeProvider.tsx      # Universal provider
│   ├── UniversalModeComponent.tsx  # UI components
│   ├── chatMode.tsx         # Chat mode component
│   ├── craftingTableMode.tsx # Crafting mode component
│   └── writingMode.tsx      # Writing mode component
```

## Best Practices

1. **Always use the ModeProvider** at the root of your app
2. **Type your components** with ModeComponentProps<T>
3. **Use enhanced store functions** for complex operations
4. **Implement proper empty states** using the isEmpty prop
5. **Handle errors gracefully** in serialize/deserialize functions
6. **Use Universal Components** for consistent UI patterns

This unified system provides a robust foundation for scaling the application while maintaining type safety and developer productivity.
