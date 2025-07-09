import { type Conversation } from "@/util/modeDefinitions";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "./markdown";
import { Button } from "./ui/button";
import { LucideThumbsDown, LucideThumbsUp } from "lucide-react";
import { AIResponse } from "./ui/kibo-ui/ai/response";

// Create a nanostore atom to track if messages are at the bottom
export const isAtBottomAtom = atom<boolean>(true);

// Create a signal to trigger scroll to bottom
export const scrollToBottomSignal = atom<number>(0);

interface MessagesProps {
    currentConversation: Conversation | null;
}

export default function Messages({ currentConversation: $currentConversation }: MessagesProps) {
    const $scrollToBottomSignal = useStore(scrollToBottomSignal);
    const [isItStreaming, setIsItStreaming] = useState<boolean | null>(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [isAtBottomState, setIsAtBottomState] = useState(true);

    // Manual scroll detection instead of intersection observer
    useEffect(() => {
        const handleScroll = () => {
            const messagesElement = scrollAreaRef.current;
            if (messagesElement) {
                const { scrollTop, scrollHeight, clientHeight } = messagesElement;
                const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
                const isAtBottom = distanceFromBottom < 10; // 10px threshold
                
                setIsAtBottomState(isAtBottom);
                isAtBottomAtom.set(isAtBottom);
                console.log('Scroll detected - at bottom:', isAtBottom, 'distance:', distanceFromBottom);
            }
        };

        const messagesElement = scrollAreaRef.current;
        if (messagesElement) {
            messagesElement.addEventListener('scroll', handleScroll);
            // Check initial state
            handleScroll();
            
            return () => {
                messagesElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [$currentConversation?.messages?.length]);

    // Listen to scroll signal from ChatBar button
    useEffect(() => {
        console.log('Scroll signal changed:', $scrollToBottomSignal);
        if ($scrollToBottomSignal > 0) {
            console.log('Attempting to scroll to bottom...');
            
            const messagesElement = scrollAreaRef.current;
            
            if (messagesElement) {
                console.log('Messages element scrollHeight:', messagesElement.scrollHeight);
                console.log('Messages element clientHeight:', messagesElement.clientHeight);
                
                // Scroll the messages container itself
                messagesElement.scrollTo({
                    top: messagesElement.scrollHeight,
                    behavior: 'smooth'
                });
            }
            
            // Reset the signal after scrolling
            setTimeout(() => {
                scrollToBottomSignal.set(0);
            }, 100);
        }
    }, [$scrollToBottomSignal]);

    // Auto-scroll to bottom when new messages are added and user is already at bottom
    useEffect(() => {
        if ($currentConversation?.messages && isAtBottomState && scrollAreaRef.current) {
            setTimeout(() => {
                const messagesElement = scrollAreaRef.current;
                if (messagesElement) {
                    messagesElement.scrollTo({
                        top: messagesElement.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [$currentConversation?.messages?.length]);

    useEffect(() => {
        if ($currentConversation?.messages) {
            const lastMessage = $currentConversation.messages[$currentConversation.messages.length - 1];
            const isLastAssistantMessage = lastMessage?.role === 'assistant' && lastMessage?.content === "";
            setIsItStreaming(isLastAssistantMessage);
            if (isLastAssistantMessage) {
                // Force scroll to bottom when streaming starts
                setTimeout(() => {
                    const messagesElement = scrollAreaRef.current;
                    if (messagesElement) {
                        messagesElement.scrollTo({
                            top: messagesElement.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 50);
            }
        }
    }, [$currentConversation?.messages]);

    // Auto-scroll during streaming when content is being added
    useEffect(() => {
        if (isItStreaming && $currentConversation?.messages) {
            const lastMessage = $currentConversation.messages[$currentConversation.messages.length - 1];
            if (lastMessage?.role === 'assistant' && lastMessage?.content) {
                // Only scroll if user is near the bottom to avoid interrupting reading
                const messagesElement = scrollAreaRef.current;
                if (messagesElement) {
                    const { scrollTop, scrollHeight, clientHeight } = messagesElement;
                    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
                    
                    // If user is within 100px of bottom, auto-scroll
                    if (distanceFromBottom < 100) {
                        messagesElement.scrollTo({
                            top: messagesElement.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }
            }
        }
    }, [$currentConversation?.messages?.[$currentConversation?.messages?.length - 1]?.content, isItStreaming]); // Listen to content changes of last message

    return (
        <div
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 place-items-center w-full"
            data-messages-container="true"
        >
            <div className="w-full max-w-4xl mx-auto">
                {$currentConversation?.messages.map((message, index) => {
                    const isLastAssistantMessage = message.role === 'assistant' &&
                        index === $currentConversation.messages.length - 1;
                    const isLastMessage = index === $currentConversation.messages.length - 1;

                    return (
                        <div
                            key={index}
                            className={`flex w-full mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${isLastMessage ? 'min-h-[65vh]' : ''}`}
                        >
                            <div
                                className={`p-3 max-w-full ${message.role === 'user'
                                    ? 'bg-purple-100 rounded-3xl rounded-tr-md ml-auto'
                                    : 'text-gray-900'
                                    }`}
                            >
                                <div className="whitespace-pre-line break-words">
                                    {isLastAssistantMessage && isItStreaming ? (
                                        <div className="flex items-center space-x-1">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                            <span className="text-sm text-gray-500">AI is thinking...</span>
                                        </div>
                                    ) : (
                                        message.role === 'assistant' ? (
                                            <div className="flex flex-col">
                                                <AIResponse>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</AIResponse>
                                                {!isItStreaming &&
                                                    <div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="mt-2"
                                                        >
                                                            <LucideThumbsUp />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="mt-2"
                                                        >
                                                            <LucideThumbsDown />
                                                        </Button>
                                                    </div>
                                                }
                                            </div>
                                        ) : (
                                            typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) || <div className="text-gray-500 text-center">No messages yet.</div>}

                {/* Spacer for scroll area */}
                <div className="h-4"></div>
            </div>
        </div>
    );
}