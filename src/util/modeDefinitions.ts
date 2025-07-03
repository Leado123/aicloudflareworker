// Mode Definition System - Unified interface for all application modes
import { atom, computed } from "nanostores";
import { type CoreMessage } from "ai";
import { ComponentType } from "react";
import type { APIAction } from "./apiDefinitions";

// Base types for all modes
export interface BaseEntity {
    id: string;
    title: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Core data types
export interface Conversation extends BaseEntity {
    messages: CoreMessage[];
}

export interface StoredFileData {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    data: string; // base64 encoded file content
}

export interface FlashCard {
    id: string;
    front: string;
    back: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    lastReviewed?: Date;
}

export interface CraftingBench extends BaseEntity {
    files: File[]; // Runtime files for display
    storedFiles: StoredFileData[]; // Serializable file data for persistence
    notes: string;
    flashcards: FlashCard[];
    lastNotesUpdate?: Date;
    lastFlashcardsUpdate?: Date;
}

export interface Document extends BaseEntity {
    content: string;
    wordCount?: number;
    lastSaved?: Date;
    version?: number;
}

// Generic mode store structure
export interface ModeStore<T extends BaseEntity> {
    entities: T[];
    currentEntityId: string | null;
    currentEntity: T | null;
    isEmpty: boolean;
}

// Mode definition interface
export interface ModeDefinition<T extends BaseEntity> {
    name: string;
    key: string;
    icon: string;
    displayName: string;
    component: ComponentType<ModeComponentProps<T>>;
    dataType: new () => T;
    defaultEntity: () => Omit<T, 'id'>;
    serialize: (entity: T) => any;
    deserialize: (data: any) => T;
    isEmpty: (entity: T) => boolean;
    apiActions?: Record<string, APIAction>; // Add API actions
}

// Props that every mode component will receive
export interface ModeComponentProps<T extends BaseEntity> {
    entities: T[];
    currentEntity: T | null;
    isEmpty: boolean;
    createEntity: (data?: Partial<T>) => string;
    updateEntity: (id: string, updates: Partial<T>) => void;
    deleteEntity: (id: string) => void;
    setCurrentEntity: (id: string | null) => void;
    addEntity: (entity: T) => void;
}

// Storage manager interface
export interface StorageManager<T extends BaseEntity> {
    save: (entities: T[]) => void;
    load: () => T[];
    saveCurrentId: (id: string | null) => void;
    loadCurrentId: () => string | null;
}

// Create storage manager for a mode
export function createStorageManager<T extends BaseEntity>(
    mode: ModeDefinition<T>
): StorageManager<T> {
    const entitiesKey = `${mode.key}_entities`;
    const currentIdKey = `${mode.key}_currentId`;

    return {
        save: (entities: T[]) => {
            if (typeof window !== 'undefined') {
                try {
                    const serialized = entities.map(entity => mode.serialize(entity));
                    localStorage.setItem(entitiesKey, JSON.stringify(serialized));
                } catch (error) {
                    console.warn(`Failed to save ${mode.name} entities:`, error);
                }
            }
        },

        load: (): T[] => {
            if (typeof window !== 'undefined') {
                try {
                    const saved = localStorage.getItem(entitiesKey);
                    if (saved && saved !== 'null') {
                        const parsed = JSON.parse(saved);
                        return parsed.map((data: any) => mode.deserialize(data));
                    }
                } catch (error) {
                    console.warn(`Failed to load ${mode.name} entities:`, error);
                }
            }
            return [];
        },

        saveCurrentId: (id: string | null) => {
            if (typeof window !== 'undefined') {
                try {
                    if (id) {
                        localStorage.setItem(currentIdKey, id);
                    } else {
                        localStorage.removeItem(currentIdKey);
                    }
                } catch (error) {
                    console.warn(`Failed to save current ${mode.name} ID:`, error);
                }
            }
        },

        loadCurrentId: (): string | null => {
            if (typeof window !== 'undefined') {
                try {
                    const saved = localStorage.getItem(currentIdKey);
                    return saved && saved !== 'null' ? saved : null;
                } catch (error) {
                    console.warn(`Failed to load current ${mode.name} ID:`, error);
                }
            }
            return null;
        }
    };
}

// Create nanostores for a mode
export function createModeStores<T extends BaseEntity>(mode: ModeDefinition<T>) {
    const entities = atom<T[]>([]);
    const currentEntityId = atom<string | null>(null);

    const currentEntity = computed(
        [entities, currentEntityId],
        (entitiesArray, id) => entitiesArray.find(e => e.id === id) ?? null
    );

    const isEmpty = computed(
        [currentEntity],
        (entity) => !entity || mode.isEmpty(entity)
    );

    // Actions
    const addEntity = (entity: T) => {
        const current = entities.get();
        entities.set([...current, entity]);
    };

    const createEntity = (data?: Partial<T>): string => {
        const id = crypto.randomUUID();
        const newEntity = {
            id,
            ...mode.defaultEntity(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        } as T;

        addEntity(newEntity);
        setCurrentEntity(id);
        return id;
    };

    const updateEntity = (id: string, updates: Partial<T>) => {
        const current = entities.get();
        entities.set(
            current.map(entity =>
                entity.id === id
                    ? { ...entity, ...updates, updatedAt: new Date() }
                    : entity
            )
        );
    };

    const deleteEntity = (id: string) => {
        const current = entities.get();
        entities.set(current.filter(entity => entity.id !== id));

        if (currentEntityId.get() === id) {
            currentEntityId.set(null);
        }
    };

    const setCurrentEntity = (id: string | null) => {
        currentEntityId.set(id);
    };

    return {
        // Stores
        entities,
        currentEntityId,
        currentEntity,
        isEmpty,
        // Actions
        addEntity,
        createEntity,
        updateEntity,
        deleteEntity,
        setCurrentEntity
    };
}

// Helper function to generate a title from content
export function generateTitleFromContent(content: string, maxLength: number = 20): string {
    const trimmed = content.trim().substring(0, maxLength);
    return trimmed.length < content.trim().length ? trimmed + "..." : trimmed;
}

// Utility functions for file handling
export async function fileToStoredData(file: File): Promise<StoredFileData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1]; // Remove data:mime;base64, prefix
            resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                data: base64Data
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function storedDataToFile(storedData: StoredFileData): File {
    const byteCharacters = atob(storedData.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    return new File([byteArray], storedData.name, {
        type: storedData.type,
        lastModified: storedData.lastModified
    });
}
