import ShinyText from "@/blocks/TextAnimations/ShinyText/ShinyText";
import { ModeComponentProps, type Conversation } from "@/util/modeDefinitions";
import { useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import GradientText from "./gradienttext";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";
import { useModeAPI } from "@/util/modeAPIClient";

export default function ChatMode({ 
    entities: conversations, 
    currentEntity: currentConversation, 
    isEmpty: conversationEmpty,
    createEntity: createConversation,
    updateEntity: updateConversation
}: ModeComponentProps<Conversation>) {
    
    // Access to type-safe API client
    const modeAPI = useModeAPI();

    // Example: Generate title for conversation when first message is added
    useEffect(() => {
        if (currentConversation && 
            currentConversation.messages.length === 1 && 
            currentConversation.title === "New Chat") {
            
            const firstMessage = currentConversation.messages[0];
            if (firstMessage.role === 'user' && typeof firstMessage.content === 'string') {
                // Use the type-safe API to generate a title
                modeAPI.chat.generateTitle({ message: firstMessage.content })
                    .then(result => {
                        updateConversation(currentConversation.id, { title: result.title });
                    })
                    .catch(error => {
                        console.error('Failed to generate title:', error);
                    });
            }
        }
    }, [currentConversation?.messages?.length]);

    return (
        <div className="w-full h-full flex-1 flex">
            {/* Render current conversation */}
            {conversationEmpty ? (
                <div className="w-full h-full flex-1 relative">
                    <ChatBar 
                        currentConversation={currentConversation}
                        conversationEmpty={conversationEmpty}
                        updateConversation={updateConversation}
                        createConversation={createConversation}
                    />
                </div>
            ) : (
                <div className="w-full h-full flex-1 relative">
                    <ScrollArea className="w-full h-full">
                        <Messages currentConversation={currentConversation} />
                    </ScrollArea>
                    <ChatBar 
                        currentConversation={currentConversation}
                        conversationEmpty={conversationEmpty}
                        updateConversation={updateConversation}
                        createConversation={createConversation}
                    />
                </div>
            )}
        </div>
    );
}