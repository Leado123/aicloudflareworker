// Universal Mode Provider - Handles data fetching, storage, and state management for all modes
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { atom } from 'nanostores';
import { 
    ModeDefinition, 
    BaseEntity, 
    createModeStores, 
    createStorageManager,
    ModeComponentProps 
} from '@/util/modeDefinitions';
import { allModes, type ModeKey } from '@/util/modes';

// Global mode state
export const currentMode = atom<ModeKey>('chat');

// Mode context type
interface ModeContextValue<T extends BaseEntity> {
    mode: ModeDefinition<T>;
    stores: ReturnType<typeof createModeStores<T>>;
    props: ModeComponentProps<T>;
}

// Create context - we'll use any here since we need to support multiple types
const ModeContext = createContext<ModeContextValue<any> | null>(null);

// Hook to use the current mode context
export function useMode<T extends BaseEntity>(): ModeContextValue<T> {
    const context = useContext(ModeContext);
    if (!context) {
        throw new Error('useMode must be used within a ModeProvider');
    }
    return context;
}

// Store instances for each mode
const globalModeStores = new Map<ModeKey, any>();
const storageManagers = new Map<ModeKey, any>();

// Initialize stores and storage managers for all modes
Object.entries(allModes).forEach(([key, mode]) => {
    const stores = createModeStores(mode as any);
    const storage = createStorageManager(mode as any);
    
    globalModeStores.set(key as ModeKey, stores);
    storageManagers.set(key as ModeKey, storage);
});

// Props for the ModeProvider
interface ModeProviderProps {
    children: ReactNode;
}

// Universal Mode Provider component
export function ModeProvider({ children }: ModeProviderProps) {
    const [isHydrated, setIsHydrated] = useState(false);
    const $currentMode = useStore(currentMode);
    
    // Get current mode definition and stores
    const mode = allModes[$currentMode];
    const stores = globalModeStores.get($currentMode)!;
    const storage = storageManagers.get($currentMode)!;

    // Initialize all modes on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Load saved mode
            try {
                const savedMode = localStorage.getItem('currentMode');
                if (savedMode && savedMode in allModes) {
                    currentMode.set(savedMode as ModeKey);
                }
            } catch (error) {
                console.warn('Failed to load current mode:', error);
            }

            // Initialize all mode stores
            Object.entries(allModes).forEach(([key, modeDefinition]) => {
                const stores = globalModeStores.get(key as ModeKey)!;
                const storage = storageManagers.get(key as ModeKey)!;

                try {
                    // Load entities
                    const entities = storage.load();
                    stores.entities.set(entities);

                    // Load current entity ID
                    const currentId = storage.loadCurrentId();
                    if (currentId && entities.some((e: any) => e.id === currentId)) {
                        stores.currentEntityId.set(currentId);
                    }
                } catch (error) {
                    console.warn(`Failed to initialize ${modeDefinition.name} mode:`, error);
                }
            });

            setIsHydrated(true);
        }
    }, []);

    // Set up storage subscriptions after hydration
    useEffect(() => {
        if (!isHydrated) return;

        const unsubscribers: (() => void)[] = [];

        // Save current mode
        const unsubscribeMode = currentMode.subscribe((mode) => {
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('currentMode', mode);
                } catch (error) {
                    console.warn('Failed to save current mode:', error);
                }
            }
        });
        unsubscribers.push(unsubscribeMode);

        // Set up storage subscriptions for all modes
        Object.entries(allModes).forEach(([key, modeDefinition]) => {
            const stores = globalModeStores.get(key as ModeKey)!;
            const storage = storageManagers.get(key as ModeKey)!;

            // Subscribe to entities changes
            const unsubscribeEntities = stores.entities.subscribe((entities: any) => {
                storage.save(entities);
            });

            // Subscribe to current entity ID changes
            const unsubscribeCurrentId = stores.currentEntityId.subscribe((id: any) => {
                storage.saveCurrentId(id);
            });

            unsubscribers.push(unsubscribeEntities, unsubscribeCurrentId);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [isHydrated]);

    // Get current mode data
    const entities = useStore(stores.entities);
    const currentEntity = useStore(stores.currentEntity);
    const isEmpty = useStore(stores.isEmpty);

    // Create props for the mode component
    const modeProps: ModeComponentProps<any> = {
        entities,
        currentEntity,
        isEmpty,
        createEntity: stores.createEntity,
        updateEntity: stores.updateEntity,
        deleteEntity: stores.deleteEntity,
        setCurrentEntity: stores.setCurrentEntity,
        addEntity: stores.addEntity
    };

    const contextValue: ModeContextValue<any> = {
        mode,
        stores,
        props: modeProps
    };

    if (!isHydrated) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <ModeContext.Provider value={contextValue}>
            {children}
        </ModeContext.Provider>
    );
}

// Hook to get entities for a specific mode
export function useModeEntities<T extends BaseEntity>(modeKey: ModeKey) {
    const stores = globalModeStores.get(modeKey);
    if (!stores) {
        throw new Error(`No stores found for mode: ${modeKey}`);
    }
    
    return {
        entities: useStore(stores.entities),
        currentEntity: useStore(stores.currentEntity),
        isEmpty: useStore(stores.isEmpty),
        createEntity: stores.createEntity,
        updateEntity: stores.updateEntity,
        deleteEntity: stores.deleteEntity,
        setCurrentEntity: stores.setCurrentEntity,
        addEntity: stores.addEntity
    };
}

// Hook to switch modes
export function useModeSwitcher() {
    return {
        currentMode: useStore(currentMode),
        switchMode: (newMode: ModeKey ) => currentMode.set(newMode), //
        availableModes: Object.keys(allModes) as ModeKey[]
    };
}

// Component that renders the current mode
export function CurrentModeRenderer() {
    const { mode, props } = useMode();
    const ModeComponent = mode.component;
    
    return <ModeComponent {...props} />;
}
