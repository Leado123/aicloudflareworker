import { type Conversation } from "@/util/modeDefinitions";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "./markdown";
import { Button } from "./ui/button";
import { LucideThumbsDown, LucideThumbsUp } from "lucide-react";
import { AIResponse } from "./ui/kibo-ui/ai/response";
import { motion, LayoutGroup } from "framer-motion";
import type { CoreMessage, UIMessage } from "ai";

// Type guard to check if object has response property
function hasResponse(obj: any): obj is { response: string } {
  return obj && typeof obj === "object" && "response" in obj;
}

// Create a nanostore atom to track if messages are at the bottom
export const isAtBottomAtom = atom<boolean>(true);

// Create a signal to trigger scroll to bottom
export const scrollToBottomSignal = atom<number>(0);

interface MessagesProps {
  submitMessage: (message: string) => void;
  messages: UIMessage[];
}

export default function Messages({ submitMessage, messages }: MessagesProps) {
  const $scrollToBottomSignal = useStore(scrollToBottomSignal);
  const [isItStreaming, setIsItStreaming] = useState<boolean | null>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAtBottomState, setIsAtBottomState] = useState(true);

  // Manual scroll detection instead of intersection observer
  useEffect(() => {
    const handleScroll = () => {
      // Look for the ScrollArea viewport element (which is the actual scrolling container)
      const scrollAreaViewport =
        scrollAreaRef.current?.closest("[data-radix-scroll-area-viewport]") ||
        scrollAreaRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        );

      if (scrollAreaViewport) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaViewport;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // If content is shorter than container, we're always "at bottom"
        // Otherwise, check if we're within 10px of the bottom
        const isAtBottom =
          scrollHeight <= clientHeight || distanceFromBottom < 10;

        setIsAtBottomState(isAtBottom);
        isAtBottomAtom.set(isAtBottom);
      }
    };

    // Find the actual scrolling element (ScrollArea viewport)
    const scrollAreaViewport = document.querySelector(
      "[data-radix-scroll-area-viewport]"
    );

    if (scrollAreaViewport) {
      scrollAreaViewport.addEventListener("scroll", handleScroll);
      // Check initial state
      handleScroll();

      return () => {
        scrollAreaViewport.removeEventListener("scroll", handleScroll);
      };
    }
  }, [messages?.length]);

  // Listen to scroll signal from ChatBar button
  useEffect(() => {
    if ($scrollToBottomSignal > 0) {
      // Find the ScrollArea viewport element (which is the actual scrolling container)
      const scrollAreaViewport = document.querySelector(
        "[data-radix-scroll-area-viewport]"
      );

      if (scrollAreaViewport) {
        // Scroll the viewport element
        scrollAreaViewport.scrollTo({
          top: scrollAreaViewport.scrollHeight,
          behavior: "smooth",
        });
      }

      // Reset the signal after scrolling
      setTimeout(() => {
        scrollToBottomSignal.set(0);
      }, 100);
    }
  }, [$scrollToBottomSignal]);

  // Auto-scroll to bottom ONLY if user is already at bottom when new messages are added
  useEffect(() => {
    if (messages && isAtBottomState && scrollAreaRef.current) {
      setTimeout(() => {
        const scrollAreaViewport = document.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollAreaViewport) {
          scrollAreaViewport.scrollTo({
            top: scrollAreaViewport.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
    // Re-check scroll position when messages change, but do not scroll
    setTimeout(() => {
      const scrollAreaViewport = document.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollAreaViewport) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaViewport;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom =
          scrollHeight <= clientHeight || distanceFromBottom < 10;
        setIsAtBottomState(isAtBottom);
        isAtBottomAtom.set(isAtBottom);
      }
    }, 150);
  }, [messages?.length]);

  useEffect(() => {
    if (messages) {
      const lastMessage = messages[messages.length - 1];
      const isLastAssistantMessage =
        lastMessage?.role === "assistant" &&
        (lastMessage?.content === "" ||
          (lastMessage?.toolInvocations &&
            lastMessage.toolInvocations.some((inv) => inv.state === "call")));

      setIsItStreaming(isLastAssistantMessage);

      if (isLastAssistantMessage) {
        // Force scroll to bottom when streaming starts
        setTimeout(() => {
          const scrollAreaViewport = document.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (scrollAreaViewport) {
            scrollAreaViewport.scrollTo({
              top: scrollAreaViewport.scrollHeight,
              behavior: "smooth",
            });
          }
        }, 50);
      }
    }
  }, [messages]);

  // Auto-scroll during streaming ONLY if user is at bottom or near bottom
  useEffect(() => {
    if (isItStreaming && messages && isAtBottomState) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "assistant" && lastMessage?.content) {
        const scrollAreaViewport = document.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollAreaViewport) {
          scrollAreaViewport.scrollTo({
            top: scrollAreaViewport.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }
  }, [
    messages?.[messages?.length - 1]?.content,
    isItStreaming,
    isAtBottomState,
  ]);

  // Helper function to render tool invocations
  const renderToolInvocations = (toolInvocations: any[]) => {
    return toolInvocations.map((toolInvocation, index) => {
      const { toolName, toolCallId, state, args, result } = toolInvocation;

      if (toolName === "generateThreePrompts") {
        if (state === "result") {
          // Extract prompts from the args (what was passed to the tool)
          const prompts = args?.prompts || [];

          // Only render if we have actual prompts
          if (prompts.length === 0) return null;

          return (
            <motion.div
              key={toolCallId}
              className="mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: 0.2,
              }}
            >
              <div className="space-y-2">
                {prompts.map((prompt: string, promptIndex: number) => (
                  <motion.div
                    key={promptIndex}
                    className=""
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: 0.6 + promptIndex * 0.15,
                    }}
                  >
                    <Button
                      onClick={() => submitMessage(prompt)}
                      variant="outline"
                      className="text-left font-normal"
                    >
                      {prompt}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        } else if (state === "call") {
          return (
            <motion.div
              key={toolCallId}
              className="mt-4 p-4 bg-gray-50 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-gray-600">
                  Generating follow-up questions...
                </span>
              </div>
            </motion.div>
          );
        }
      }

      return null;
    });
  };

  return (
    <div
      ref={scrollAreaRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 place-items-center w-full"
      data-messages-container="true"
    >
      <div className="w-full max-w-4xl mx-auto">
        <LayoutGroup>
          {messages.map((message, index) => {
            const isLastAssistantMessage =
              message.role === "assistant" && index === messages.length - 1;
            const isLastMessage = index === messages.length - 1;

            return (
              <div
                key={index}
                className={`flex w-full mb-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } ${isLastMessage ? "" : ""}`}
              >
                <div
                  className={`p-3 max-w-full ${
                    message.role === "user"
                      ? "bg-purple-100 rounded-3xl rounded-tr-md ml-auto"
                      : "text-gray-900"
                  }`}
                >
                  <div className="whitespace-pre-line break-words">
                    {isLastAssistantMessage &&
                    isItStreaming &&
                    !message.content &&
                    !message.toolInvocations?.some(
                      (inv) => inv.state === "result"
                    ) ? (
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">
                          AI is thinking...
                        </span>
                      </div>
                    ) : message.role === "assistant" ? (
                      <div className="flex flex-col w-3.5xl">
                        {message.content && (
                          <AIResponse>{message.content}</AIResponse>
                        )}

                        {!isItStreaming && (
                          <div className="mt-2">
                            <Button variant="ghost" size="sm" className="mr-2">
                              <LucideThumbsUp />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <LucideThumbsDown />
                            </Button>
                          </div>
                        )}
                        {message.toolInvocations &&
                          message.toolInvocations.length > 0 && (
                            <div>
                              {renderToolInvocations(message.toolInvocations)}
                            </div>
                          )}
                      </div>
                    ) : typeof message.content === "string" ? (
                      message.content
                    ) : !message.content ? (
                      ""
                    ) : typeof message.content === "object" ? (
                      JSON.stringify(message.content)
                    ) : (
                      String(message.content)
                    )}
                  </div>
                </div>
              </div>
            );
          }) || (
            <div className="text-gray-500 text-center">No messages yet.</div>
          )}

          {/* Spacer for scroll area */}
          <motion.div
            className={`${isItStreaming ? "h-4/5" : "h-35"}`}
          ></motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
}
