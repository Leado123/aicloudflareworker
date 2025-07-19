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

export default function Messages({
  submitMessage,
  messages,
}: MessagesProps) {
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

      console.log("SCROLL DEBUG - found viewport:", !!scrollAreaViewport);

      if (scrollAreaViewport) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaViewport;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // If content is shorter than container, we're always "at bottom"
        // Otherwise, check if we're within 10px of the bottom
        const isAtBottom =
          scrollHeight <= clientHeight || distanceFromBottom < 10;

        console.log("SCROLL DEBUG:", {
          isAtBottom,
          distanceFromBottom,
          scrollTop,
          scrollHeight,
          clientHeight,
        });

        setIsAtBottomState(isAtBottom);
        isAtBottomAtom.set(isAtBottom);
      }
    };

    // Find the actual scrolling element (ScrollArea viewport)
    const scrollAreaViewport = document.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    console.log(
      "SETUP SCROLL LISTENER - found viewport:",
      !!scrollAreaViewport
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
    console.log("SCROLL SIGNAL CHANGED:", $scrollToBottomSignal);
    if ($scrollToBottomSignal > 0) {
      console.log("ATTEMPTING TO SCROLL TO BOTTOM...");

      // Find the ScrollArea viewport element (which is the actual scrolling container)
      const scrollAreaViewport = document.querySelector(
        "[data-radix-scroll-area-viewport]"
      );

      if (scrollAreaViewport) {
        console.log("Element found, scrolling...", {
          scrollHeight: scrollAreaViewport.scrollHeight,
          clientHeight: scrollAreaViewport.clientHeight,
        });
        // Scroll the viewport element
        scrollAreaViewport.scrollTo({
          top: scrollAreaViewport.scrollHeight,
          behavior: "smooth",
        });
      } else {
        console.log("NO SCROLL AREA VIEWPORT FOUND");
      }

      // Reset the signal after scrolling
      setTimeout(() => {
        scrollToBottomSignal.set(0);
      }, 100);
    }
  }, [$scrollToBottomSignal]);

  // Auto-scroll to bottom when new messages are added and user is already at bottom
  useEffect(() => {
    if (
      messages &&
      isAtBottomState &&
      scrollAreaRef.current
    ) {
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

    // Also re-check scroll position when messages change
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
      const lastMessage =
        messages[messages.length - 1];
      const isLastAssistantMessage =
        lastMessage?.role === "assistant" && lastMessage?.content === "";
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

  // Auto-scroll during streaming when content is being added
  useEffect(() => {
    if (isItStreaming && messages) {
      const lastMessage =
        messages[messages.length - 1];
      if (lastMessage?.role === "assistant" && lastMessage?.content) {
        // Only scroll if user is near the bottom to avoid interrupting reading
        const scrollAreaViewport = document.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollAreaViewport) {
          const { scrollTop, scrollHeight, clientHeight } = scrollAreaViewport;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

          // If user is within 100px of bottom, auto-scroll
          if (distanceFromBottom < 100) {
            scrollAreaViewport.scrollTo({
              top: scrollAreaViewport.scrollHeight,
              behavior: "smooth",
            });
          }
        }
      }
    }
  }, [
    messages?.[messages?.length - 1]
      ?.content,
    isItStreaming,
  ]); // Listen to content changes of last message

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
              message.role === "assistant" &&
              index === messages.length - 1;
            const isLastMessage =
              index === messages.length - 1;

            return (
              <div
                key={index}
                className={`flex w-full mb-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } ${isLastMessage ? "min-h-[65vh]" : ""}`}
              >
                <div
                  className={`p-3 max-w-full ${
                    message.role === "user"
                      ? "bg-purple-100 rounded-3xl rounded-tr-md ml-auto"
                      : "text-gray-900"
                  }`}
                >
                  
                  <div className="whitespace-pre-line break-words">
                    {isLastAssistantMessage && isItStreaming ? (
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
                      <div className="flex flex-col">
                          <AIResponse>{message.content}</AIResponse>
                          {message.toolInvocations?.map((toolInvocation, index) => {
                            const { toolName, toolCallId, state } = toolInvocation;
                            if (state === 'result') {
                              if (toolName === 'generateThreePrompts') {
                                const { result } = toolInvocation;
                                return (
                                  <div key={toolCallId}>
                                    {result.toString()}
                                  </div>
                                );
                              }
                            } else {
                              return (
                                <div key={toolCallId}>
                                  {toolName === 'generateThreePrompts' ? (
                                    <div>Loading three prompts...</div>
                                  ) : null}
                                </div>
                              );
                            }
                          })}
                       
                        {!isItStreaming && (
                          <div>
                            <Button variant="ghost" size="sm" className="mt-2">
                              <LucideThumbsUp />
                            </Button>
                            <Button variant="ghost" size="sm" className="mt-2">
                              <LucideThumbsDown />
                            </Button>
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
            className={`${isItStreaming ? "h-4/5" : ""}`}
          ></motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
}
