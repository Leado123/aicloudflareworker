import { type Conversation } from "@/util/modeDefinitions";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
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
    

    // Use Intersection Observer to detect when we're at the bottom
    const { ref: bottomSentinelRef, inView: isAtBottom } = useInView({
        threshold: 0,
        rootMargin: '0px',
    });

    // Update the nanostore when the bottom visibility changes
    useEffect(() => {
        isAtBottomAtom.set(isAtBottom);
        console.log('Bottom sentinel inView:', isAtBottom);
    }, [isAtBottom]);

    // Listen to scroll signal from ChatBar button
    useEffect(() => {
        console.log('Scroll signal changed:', $scrollToBottomSignal);
        if ($scrollToBottomSignal > 0) {
            console.log('Attempting to scroll to bottom...');
            
            // Find the actual scrollable parent container
            const messagesElement = scrollAreaRef.current;
            const scrollableParent = messagesElement?.parentElement;
            
            console.log('Messages element:', messagesElement);
            console.log('Scrollable parent:', scrollableParent);
            
            if (scrollableParent) {
                console.log('Parent scrollHeight:', scrollableParent.scrollHeight);
                console.log('Parent clientHeight:', scrollableParent.clientHeight);
                
                // Only use smooth scroll - no immediate jump
                scrollableParent.scrollTo({
                    top: scrollableParent.scrollHeight,
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
        if ($currentConversation?.messages && isAtBottom && scrollAreaRef.current) {
            setTimeout(() => {
                if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTo({
                        top: scrollAreaRef.current.scrollHeight,
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
                scrollToBottomSignal.set(scrollToBottomSignal.get() + 1);
            }
        }
    }, [$currentConversation?.messages]);

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

                {/* Bottom sentinel element - when this is visible, we're at the bottom */}
                <div className={`h-50`}></div>
                <div 
                    ref={bottomSentinelRef} 
                    className="h-1 w-full" 
                    style={{ height: '1px' }}
                />
            </div>
        </div>
    );
}