import { conversations, currentConversationId, type Conversation } from "@/util/store";
import { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

export default function StoreManager() {
    useEffect(() => {
        // This logic runs only on the client
        const savedConversations = localStorage.getItem("conversations");
        if (savedConversations) {
            try {
                conversations.set(JSON.parse(savedConversations));
            } catch (error) {
                console.error("Failed to parse conversations from localStorage:", error);
            }
        }

        // Create default conversations if none exist
        let defaultConversationId: string | null = null;
        if (!savedConversations || JSON.parse(savedConversations).length === 0) {
            const defaultConversation: Conversation = {
                id: uuidv4(),
                title: "Default Conversation",
                messages: [],
            };
            defaultConversationId = defaultConversation.id;
            console.log("Default conversation created:", defaultConversation); // Log default conversation creation
            conversations.set([defaultConversation]);
            localStorage.setItem("conversations", JSON.stringify([defaultConversation]));
        }

        // Load currentConversationId from localStorage
        const savedCurrentConversationId = localStorage.getItem("currentConversationId");
        if (savedCurrentConversationId && savedCurrentConversationId !== "") {
            currentConversationId.set(savedCurrentConversationId);
        } else if (defaultConversationId) {
            // If we just created a default conversation, set it as current
            currentConversationId.set(defaultConversationId);
        } else {
            // If we have conversations but no saved current ID, set to first conversation
            const parsedConversations = savedConversations ? JSON.parse(savedConversations) : [];
            if (parsedConversations.length > 0) {
                currentConversationId.set(parsedConversations[0].id);
            } else {
                currentConversationId.set(null);
            }
        }

        // Sync conversations atom changes to localStorage
        conversations.subscribe((currentConversations) => {
            try {
                localStorage.setItem("conversations", JSON.stringify(currentConversations));
            } catch (error) {
                console.error("Failed to save conversations to localStorage:", error);
            }
        });

        // Sync currentConversationId atom changes to localStorage
        currentConversationId.subscribe((currentId) => {
            try {
                localStorage.setItem("currentConversationId", currentId || "");
            } catch (error) {
                console.error("Failed to save currentConversationId to localStorage:", error);
            }
        });

        console.log("Saved conversations from localStorage:", savedConversations); // Log saved conversations
        console.log("Saved currentConversationId from localStorage:", savedCurrentConversationId); // Log saved currentConversationId
        console.log("Default conversation ID created:", defaultConversationId); // Log if a default conversation was created
        console.log("Current conversation ID set to:", currentConversationId.get()); // Log the final currentConversationId
    }, []);

    return null; // This component does not render anything
}