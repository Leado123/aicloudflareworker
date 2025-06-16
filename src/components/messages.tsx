import { currentConversation } from "@/util/store";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import Markdown from "./markdown";
import { Button } from "./ui/button";
import { LucideThumbsDown, LucideThumbsUp } from "lucide-react";

// Create a nanostore atom to track if messages are at the bottom
export const isAtBottomAtom = atom<boolean>(true);

// Create a signal to trigger scroll to bottom
export const scrollToBottomSignal = atom<number>(0);

export default function Messages() {
    const $currentConversation = useStore(currentConversation);
    const $scrollToBottomSignal = useStore(scrollToBottomSignal);
    const [isStreaming, setIsStreaming] = useState(false);
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

   

    return (
        <div
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            data-messages-container="true"
        >
            {$currentConversation?.messages.map((message, index) => {
                const isLastAssistantMessage = message.role === 'assistant' &&
                    index === $currentConversation.messages.length - 1;
                const isStreaming = isLastAssistantMessage && message.content === "";

                return (
                    <div
                        key={index}
                        className={`flex w-3xl ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`p-3 ${message.role === 'user'
                                ? 'bg-purple-100 rounded-3xl max-w-2/3 rounded-tr-md ml-auto'
                                : 'text-gray-900'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">
                                {isStreaming ? (
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
                                            <Markdown>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</Markdown>
                                            {!isStreaming &&
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
            <div className="h-30"></div>
            <div 
                ref={bottomSentinelRef} 
                className="h-1 w-full" 
                style={{ height: '1px' }}
            />
        </div>
    );
}