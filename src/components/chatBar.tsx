import { Conversation, conversations, currentConversation, currentConversationId, conversationEmpty, updateConversation, createNewConversation, generateTitleFromMessage } from "@/util/store";
import { Input } from "./ui/input";
import { useStore } from "@nanostores/react";
import { motion } from "framer-motion";
import { LucideArrowRight, LucidePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { requestChatMessage, requestChatMessageStream } from "@/util/requestChatMessage";
import type { CoreMessage } from "ai";

export default function ChatBar() {
    console.log("ChatBar component loaded"); // Log component load

    const $currentConversation = useStore(currentConversation);
    const $conversationEmpty = useStore(conversationEmpty);

    const [inputValue, setInputValue] = useState("");    const handleNewConversation = () => {
        createNewConversation("New Chat");
        setInputValue("");
    };const requestChatResponse = async () => {
        if (!inputValue.trim()) {
            console.log("Input is empty.");
            return;
        }

        console.log("Sending user message:", inputValue.trim()); // Log user message
        console.log("Input value:", inputValue); // Log the current input value

        // If no current conversation exists, create a new one
        let conversationId = currentConversationId.get();
        let conversation = $currentConversation;
        
        if (!conversation || !conversationId) {
            console.log("No current conversation available, creating new one.");
            // Use the first message as the title
            const title = generateTitleFromMessage(inputValue.trim());
            conversationId = createNewConversation(title);
            // Get the newly created conversation
            conversation = conversations.get().find(c => c.id === conversationId) || null;
            if (!conversation) {
                console.error("Failed to create or find new conversation.");
                return;
            }
        }

        console.log("Current conversation:", conversation); // Log the current conversation object

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
            await requestChatMessageStream(updatedMessages, (chunk) => {
                fullResponse += chunk;
                
                // Update the AI message content in real-time
                const updatedStreamingMessages: CoreMessage[] = [...updatedMessages, { role: "assistant", content: fullResponse }];
                updateConversation(conversationId, { messages: updatedStreamingMessages });
            });

            console.log("AI response completed:", fullResponse);
        } catch (error) {
            console.error("Failed to fetch AI response:", error);
            
            // Remove the empty AI message if there was an error
            updateConversation(conversationId, { messages: updatedMessages });
        }
    };

    return (
        <motion.div
            layout
            className={`${$conversationEmpty ? `absolute bottom-[40%]` : `absolute bottom-0 left-0 right-0`} w-full p-2 gap-2 flex flex-col place-items-center`}
        >
            <div className="md:w-4xl flex backdrop-blur-md bg-[rgba(255,255,255,0.6)] flex-col border gap-2 rounded-3xl p-2">
                <input
                    className="outline-0 text-lg p-2 border-0 shadow-none"
                    placeholder="Ask ShareSyllabus AI"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            requestChatResponse();
                        }
                    }}
                />                <div className="flex text-gray-600 gap-2">
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
            <text className="text-xs text-gray-700">We can see all of your chat requests, we can do what we want with it. Therefore, beware of the content you send like passwords or secrets.</text>
        </motion.div>
    );
}