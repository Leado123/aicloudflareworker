import { currentConversation } from "@/util/store";
import { useStore } from "@nanostores/react";
import { useEffect, useRef } from "react";
import Markdown from "./markdown";

export default function Messages() {
    const $currentConversation = useStore(currentConversation);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
    }, [$currentConversation?.messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            className={`p-3 ${
                                message.role === 'user' 
                                    ? 'bg-purple-100 rounded-2xl max-w-2/3 rounded-tr-md ml-auto' 
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
                                        <Markdown>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</Markdown>
                                    ) : (
                                        typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                );
            }) || <div className="text-gray-500 text-center">No messages yet.</div>}
            <div ref={messagesEndRef} className="h-30" />
        </div>
    );
}