import { useEffect, useState } from 'react';
import { conversations, currentConversationId, contentMode, CONTENT_MODE, craftingBenches, currentCraftingBenchId, storedDataToFile } from '@/util/store';

interface StoreManagerProps {
    children: React.ReactNode;
}

export default function StoreManager({ children }: StoreManagerProps) {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Initialize stores on client-side only
        // This prevents hydration mismatches
        if (typeof window !== 'undefined') {
            // Load from localStorage if available
            try {
                const savedConversations = localStorage.getItem('conversations');
                const savedCurrentId = localStorage.getItem('currentConversationId');
                const savedContentMode = localStorage.getItem('contentMode');
                const savedCraftingBenches = localStorage.getItem('craftingBenches');
                const savedCurrentBenchId = localStorage.getItem('currentCraftingBenchId');
                
                let conversationsArray: any[] = [];
                if (savedConversations && savedConversations !== 'null') {
                    conversationsArray = JSON.parse(savedConversations);
                    conversations.set(conversationsArray);
                } else {
                    // Initialize with empty array if no saved conversations
                    conversations.set([]);
                    localStorage.setItem('conversations', JSON.stringify([]));
                }
                
                if (savedCurrentId && savedCurrentId !== 'null' && savedCurrentId !== '') {
                    // Check if the conversation still exists
                    const conversationExists = conversationsArray.some(conv => conv.id === savedCurrentId);
                    if (conversationExists) {
                        currentConversationId.set(savedCurrentId);
                    } else {
                        // Clear invalid conversation ID
                        currentConversationId.set(null);
                        localStorage.removeItem('currentConversationId');
                    }
                } else {
                    // Initialize with null if no saved current conversation ID
                    currentConversationId.set(null);
                    localStorage.removeItem('currentConversationId');
                }

                // Load crafting benches and reconstruct files
                let benchesArray: any[] = [];
                if (savedCraftingBenches && savedCraftingBenches !== 'null') {
                    benchesArray = JSON.parse(savedCraftingBenches);
                    // Reconstruct File objects from stored data
                    benchesArray = benchesArray.map(bench => ({
                        ...bench,
                        files: (bench.storedFiles || []).map((storedFile: any) => storedDataToFile(storedFile)),
                        storedFiles: bench.storedFiles || [],
                        notes: bench.notes || "",
                        flashcards: bench.flashcards || [],
                        lastNotesUpdate: bench.lastNotesUpdate ? new Date(bench.lastNotesUpdate) : undefined,
                        lastFlashcardsUpdate: bench.lastFlashcardsUpdate ? new Date(bench.lastFlashcardsUpdate) : undefined
                    }));
                    
                    // Debug logging for loaded content
                    const benchesWithContent = benchesArray.filter(b => b.notes || b.flashcards.length > 0);
                    if (benchesWithContent.length > 0) {
                        console.log('Loaded crafting benches with content:', benchesWithContent.map(b => ({
                            id: b.id,
                            title: b.title,
                            hasNotes: !!b.notes,
                            notesLength: b.notes?.length || 0,
                            flashcardsCount: b.flashcards.length,
                            lastNotesUpdate: b.lastNotesUpdate,
                            lastFlashcardsUpdate: b.lastFlashcardsUpdate
                        })));
                    }
                    
                    craftingBenches.set(benchesArray);
                } else {
                    craftingBenches.set([]);
                    localStorage.setItem('craftingBenches', JSON.stringify([]));
                }

                if (savedCurrentBenchId && savedCurrentBenchId !== 'null' && savedCurrentBenchId !== '') {
                    // Check if the crafting bench still exists
                    const benchExists = benchesArray.some(bench => bench.id === savedCurrentBenchId);
                    if (benchExists) {
                        currentCraftingBenchId.set(savedCurrentBenchId);
                    } else {
                        currentCraftingBenchId.set(null);
                        localStorage.removeItem('currentCraftingBenchId');
                    }
                } else {
                    currentCraftingBenchId.set(null);
                    localStorage.removeItem('currentCraftingBenchId');
                }

                // Load content mode from localStorage
                if (savedContentMode && Object.values(CONTENT_MODE).includes(savedContentMode as any)) {
                    contentMode.set(savedContentMode as typeof CONTENT_MODE[keyof typeof CONTENT_MODE]);
                } else {
                    // Initialize with default chat mode
                    contentMode.set(CONTENT_MODE.CHAT);
                    localStorage.setItem('contentMode', CONTENT_MODE.CHAT);
                }
            } catch (error) {
                console.warn('Failed to load data from localStorage:', error);
                // Fallback to default values on error
                conversations.set([]);
                currentConversationId.set(null);
                craftingBenches.set([]);
                currentCraftingBenchId.set(null);
                contentMode.set(CONTENT_MODE.CHAT);
                localStorage.setItem('conversations', JSON.stringify([]));
                localStorage.setItem('craftingBenches', JSON.stringify([]));
                localStorage.removeItem('currentConversationId');
                localStorage.removeItem('currentCraftingBenchId');
                localStorage.setItem('contentMode', CONTENT_MODE.CHAT);
            }
            
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;

        // Save to localStorage when conversations change
        const unsubscribeConversations = conversations.subscribe((convs) => {
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('conversations', JSON.stringify(convs));
                } catch (error) {
                    console.warn('Failed to save conversations to localStorage:', error);
                }
            }
        });

        // Save current conversation ID to localStorage
        const unsubscribeCurrentId = currentConversationId.subscribe((id) => {
            if (typeof window !== 'undefined') {
                try {
                    if (id) {
                        localStorage.setItem('currentConversationId', id);
                    } else {
                        localStorage.removeItem('currentConversationId');
                    }
                } catch (error) {
                    console.warn('Failed to save current conversation ID to localStorage:', error);
                }
            }
        });

        // Save crafting benches to localStorage (only storedFiles, not File objects)
        const unsubscribeCraftingBenches = craftingBenches.subscribe((benches) => {
            if (typeof window !== 'undefined') {
                try {
                    // Only save serializable data (exclude File objects)
                    const serializedBenches = benches.map(bench => ({
                        id: bench.id,
                        title: bench.title,
                        storedFiles: bench.storedFiles,
                        notes: bench.notes,
                        flashcards: bench.flashcards,
                        lastNotesUpdate: bench.lastNotesUpdate?.toISOString(),
                        lastFlashcardsUpdate: bench.lastFlashcardsUpdate?.toISOString()
                    }));
                    localStorage.setItem('craftingBenches', JSON.stringify(serializedBenches));
                    
                    // Debug logging for notes and flashcards
                    const benchesWithContent = serializedBenches.filter(b => b.notes || b.flashcards.length > 0);
                    if (benchesWithContent.length > 0) {
                        console.log('Saved crafting benches with content:', benchesWithContent.map(b => ({
                            id: b.id,
                            title: b.title,
                            hasNotes: !!b.notes,
                            notesLength: b.notes?.length || 0,
                            flashcardsCount: b.flashcards.length,
                            lastNotesUpdate: b.lastNotesUpdate,
                            lastFlashcardsUpdate: b.lastFlashcardsUpdate
                        })));
                    }
                } catch (error) {
                    console.warn('Failed to save crafting benches to localStorage:', error);
                }
            }
        });

        // Save current crafting bench ID to localStorage
        const unsubscribeCurrentBenchId = currentCraftingBenchId.subscribe((id) => {
            if (typeof window !== 'undefined') {
                try {
                    if (id) {
                        localStorage.setItem('currentCraftingBenchId', id);
                    } else {
                        localStorage.removeItem('currentCraftingBenchId');
                    }
                } catch (error) {
                    console.warn('Failed to save current crafting bench ID to localStorage:', error);
                }
            }
        });

        // Save content mode to localStorage
        const unsubscribeContentMode = contentMode.subscribe((mode) => {
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('contentMode', mode);
                } catch (error) {
                    console.warn('Failed to save content mode to localStorage:', error);
                }
            }
        });

        return () => {
            unsubscribeConversations();
            unsubscribeCurrentId();
            unsubscribeCraftingBenches();
            unsubscribeCurrentBenchId();
            unsubscribeContentMode();
        };
    }, [isHydrated]);

    if (!isHydrated) {
        // Return a consistent loading state to prevent hydration mismatches
        return (
            <></>
        );
    }

    return <>{children}</>;
}