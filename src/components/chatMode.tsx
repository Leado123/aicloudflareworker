import ShinyText from "@/blocks/TextAnimations/ShinyText/ShinyText";
import { ModeComponentProps, type Conversation } from "@/util/modeDefinitions";
import { useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import GradientText from "./gradienttext";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";
import RotatingText from "@/blocks/TextAnimations/RotatingText/RotatingText";
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
                <div className="w-full h-full flex-1 ">
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute w-full place-items-center bottom-[60%]"
                        >
                            <LayoutGroup>
                                <motion.p layout className="text-4xl flex place-items-center">
                                    <motion.span layout transition={{ type: "spring", damping: 30, stiffness: 400 }}>You can&nbsp;</motion.span>
                                    <RotatingText
                                        texts={['ask a question', 'generate Notion notes', 'make Quizlet flashcards', 'make Knowt flashcards']}
                                        mainClassName="bg-black p-2 text-white rounded-lg"
                                        staggerFrom={"last"} // @ts-expect-error
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}// @ts-expect-error
                                        exit={{ y: "-110%" }}
                                        staggerDuration={0.025}
                                        splitBy="words"
                                        splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                        rotationInterval={2000}
                                    />
                                </motion.p>
                            </LayoutGroup>
                            <text className="text-gray-500">
                                Powered by Gemini & College Success Club Prompt Engineering
                            </text>

                        </motion.div>
                    </AnimatePresence>
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