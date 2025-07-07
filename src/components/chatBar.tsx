import { type Conversation } from "@/util/modeDefinitions";
import { Input } from "./ui/input";
import { useStore } from "@nanostores/react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { LucideArrowDown, LucideArrowRight, LucidePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { requestChatMessage, requestChatMessageStream } from "@/util/requestChatMessage";
import type { CoreMessage } from "ai";
import { isAtBottomAtom, scrollToBottomSignal } from "./messages";
import RotatingText from "@/blocks/TextAnimations/RotatingText/RotatingText";

interface ChatBarProps {
    currentConversation: Conversation | null;
    conversationEmpty: boolean;
    updateConversation: (id: string, updates: Partial<Conversation>) => void;
    createConversation: (data: Partial<Conversation>) => string;
}

export default function ChatBar({ 
    currentConversation: $currentConversation, 
    conversationEmpty: $conversationEmpty,
    updateConversation,
    createConversation
}: ChatBarProps) {
    const $isAtBottom = useStore(isAtBottomAtom);

    const [inputValue, setInputValue] = useState("");
    
    const generateTitleFromMessage = (message: string): string => {
        const truncated = message.trim().substring(0, 20);
        return truncated.length < message.trim().length ? truncated + "..." : truncated;
    };
    
    const handleNewConversation = () => {
        createConversation({ title: "New Chat" });
        setInputValue("");
    };
    
    const requestChatResponse = async () => {
        if (!inputValue.trim()) {
            console.log("Input is empty.");
            return;
        }

        console.log("=== STARTING NEW CHAT RESPONSE ===");
        console.log("Sending user message:", inputValue.trim()); // Log user message
        console.log("Input value:", inputValue); // Log the current input value

        // Get current conversation state
        let conversationId = $currentConversation?.id;
        let conversation = $currentConversation;

        console.log("Current conversation ID:", conversationId);
        console.log("Current conversation:", conversation);
        console.log("Conversation has", conversation?.messages?.length || 0, "messages");

        if (!conversation || !conversationId) {
            console.log("No current conversation available, creating new one.");
            const title = generateTitleFromMessage(inputValue.trim());
            conversationId = createConversation({ title });
            // The conversation will be updated by the mode system
            conversation = { id: conversationId, title, messages: [] };
            if (!conversation) {
                console.error("Failed to create or find new conversation.");
                return;
            }
        }

        console.log("Using conversation:", conversation);
        console.log("Conversation has", conversation.messages.length, "messages");

        // Check if this is the first message in an existing conversation and update title if needed
        const isFirstMessage = conversation.messages.length === 0;
        if (isFirstMessage && conversation.title === "New Chat") {
            const title = generateTitleFromMessage(inputValue.trim());
            updateConversation(conversationId, { title });
        }

        // Add the user's message to the current conversation
        const userMessage: CoreMessage = { role: "user", content: inputValue.trim() };
        const updatedMessages = [...conversation.messages, userMessage];

        updateConversation(conversationId, { messages: updatedMessages });

        // Clear the input field
        setInputValue("");

        try {
            // Create a placeholder AI message for streaming
            const aiMessage: CoreMessage = { role: "assistant", content: "" };
            const streamingMessages: CoreMessage[] = [...updatedMessages, aiMessage];

            // Update the conversation with the empty AI message to show streaming placeholder
            updateConversation(conversationId, { messages: streamingMessages });

            // Stream the AI response with real-time updates
            let fullResponse = "";
            console.log("Starting stream for conversation:", conversationId, "with", updatedMessages.length, "messages");
            
            await requestChatMessageStream(updatedMessages, (chunk) => {
                fullResponse += chunk;
                console.log("Received chunk:", chunk, "Full response so far:", fullResponse.length, "chars");

                // Use the current conversation ID
                if (!conversationId || typeof conversationId !== "string") {
                    console.error("Invalid or missing current conversation ID:", conversationId);
                    return;
                }

                console.log("Using conversation ID for update:", conversationId);

                // Update the AI message content in real-time
                const updatedStreamingMessages: CoreMessage[] = [...updatedMessages, { role: "assistant", content: fullResponse }];
                console.log("Updating conversation with", updatedStreamingMessages.length, "messages");
                updateConversation(conversationId, { messages: updatedStreamingMessages });
            });

            console.log("AI response completed:", fullResponse.length, "characters total");
        } catch (error) {
            console.error("Failed to fetch AI response:", error);

            // Remove the empty AI message if there was an error
            updateConversation(conversationId, { messages: updatedMessages });
        }
    };

    return (
        <motion.div
            layout
            className={$conversationEmpty ? 
                `absolute inset-0 flex flex-col items-center justify-center px-4` : 
                `absolute bottom-0 left-0 right-0 w-full p-2 flex flex-col items-center gap-2`}
        >
            {/* Initial text when conversation is empty - now part of ChatBar */}
            {$conversationEmpty && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="mb-8 text-center"
                >
                    <LayoutGroup>
                        <motion.p layout className="text-4xl flex flex-wrap place-items-center justify-center">
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
                    <p className="text-gray-500 mt-4">
                        Powered by Gemini & College Success Club Prompt Engineering
                    </p>
                </motion.div>
            )}

            <AnimatePresence> {/* Scroll to bottom button */}
                {!$isAtBottom && !$conversationEmpty ?
                    <motion.button 
                        className="absolute border top-[-4em] cursor-pointer p-3 rounded-full backdrop-blur-3xl hover:bg-white/20 transition-colors"
                        onClick={() => {
                            // Trigger scroll signal - Messages component will handle the actual scrolling
                            const currentValue = scrollToBottomSignal.get();
                            const newValue = currentValue + 1;
                            console.log('ChatBar button clicked, signal changing from', currentValue, 'to', newValue);
                            scrollToBottomSignal.set(newValue);
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        title="Scroll to bottom"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <LucideArrowDown />
                    </motion.button> : null
                }
            </AnimatePresence>
            
            <div className={`w-full max-w-4xl flex backdrop-blur-md bg-[rgba(255,255,255,0.6)] flex-col border gap-2 rounded-3xl p-2 ${$conversationEmpty ? '' : ''}`}>
                <textarea
                    className="outline-0 text-lg p-2 border-0 shadow-none resize-none"
                    placeholder="Ask ShareSyllabus AI"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            requestChatResponse();
                        }
                    }}
                    rows={1}
                    style={{ minHeight: "2.5em", maxHeight: "8em", overflowY: "auto" }}
                    ref={el => {
                        if (el) {
                            // Auto-resize logic to mimic minRows/maxRows
                            el.style.height = "auto";
                            el.style.height = Math.min(
                                Math.max(el.scrollHeight, 2.5 * 16), // 2.5em in px (assuming 16px font)
                                8 * 16 // 8em in px
                            ) + "px";
                        }
                    }}
                />
                <div className="flex text-gray-600 gap-2">
                    <button
                        className="cursor-pointer p-2 rounded-full hover:bg-gray-100"
                        onClick={handleNewConversation}
                        title="Start new conversation"
                    >
                        <LucidePlus />
                    </button>
                    <div className="flex-1"></div>
                    <button
                        className="cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded-full"
                        onClick={requestChatResponse}
                    >
                        <LucideArrowRight />
                    </button>
                </div>
            </div>
            
            {$conversationEmpty && (
                <p className="text-xs text-gray-700 mt-4 text-center max-w-2xl">
                    We can see all of your chat requests, we can do what we want with it. Therefore, beware of the content you send like passwords or secrets.
                </p>
            )}
            
            {!$conversationEmpty && (
                <p className="text-xs text-gray-700">
                    We can see all of your chat requests, we can do what we want with it. Therefore, beware of the content you send like passwords or secrets.
                </p>
            )}
        </motion.div>
    );
}