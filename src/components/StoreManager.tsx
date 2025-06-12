import { useEffect, useState } from 'react';
import { conversations, currentConversationId } from '@/util/store';

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
            } catch (error) {
                console.warn('Failed to load conversations from localStorage:', error);
                // Fallback to default values on error
                conversations.set([]);
                currentConversationId.set(null);
                localStorage.setItem('conversations', JSON.stringify([]));
                localStorage.removeItem('currentConversationId');
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

        return () => {
            unsubscribeConversations();
            unsubscribeCurrentId();
        };
    }, [isHydrated]);

    if (!isHydrated) {
        // Return a consistent loading state to prevent hydration mismatches
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return <>{children}</>;
}