import { type Conversation } from "@/util/modeDefinitions";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "./markdown";
import { Button } from "./ui/button";
import { LucideThumbsDown, LucideThumbsUp } from "lucide-react";
import { AIResponse } from "./ui/kibo-ui/ai/response";
import { motion, LayoutGroup } from "framer-motion";
import type { CoreMessage } from "ai";

// Define extended message type with metadata support
interface ExtendedCoreMessage {
  role: "user" | "assistant" | "system" | "function" | "tool" | "data";
  content: string | Record<string, any>;
  metadata?: {
    suggestedPrompts?: string[];
    [key: string]: any;
  };
}

// Type guard to check if object has response property
function hasResponse(obj: any): obj is { response: string } {
  return obj && typeof obj === "object" && "response" in obj;
}

// Create a nanostore atom to track if messages are at the bottom
export const isAtBottomAtom = atom<boolean>(true);

// Create a signal to trigger scroll to bottom
export const scrollToBottomSignal = atom<number>(0);

interface MessagesProps {
  currentConversation: Conversation | null;
  submitMessage: (message: string) => void;
}

export default function Messages({
  currentConversation: $currentConversation,
  submitMessage,
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
  }, [$currentConversation?.messages?.length]);

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
      $currentConversation?.messages &&
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
  }, [$currentConversation?.messages?.length]);

  useEffect(() => {
    if ($currentConversation?.messages) {
      const lastMessage =
        $currentConversation.messages[$currentConversation.messages.length - 1];
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
  }, [$currentConversation?.messages]);

  // Auto-scroll during streaming when content is being added
  useEffect(() => {
    if (isItStreaming && $currentConversation?.messages) {
      const lastMessage =
        $currentConversation.messages[$currentConversation.messages.length - 1];
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
    $currentConversation?.messages?.[$currentConversation?.messages?.length - 1]
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
          {$currentConversation?.messages.map((message, index) => {
            const isLastAssistantMessage =
              message.role === "assistant" &&
              index === $currentConversation.messages.length - 1;
            const isLastMessage =
              index === $currentConversation.messages.length - 1;

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
                        <AIResponse>
                          {/* Handle object format with response and suggestedNextPrompts */}
                          {typeof message.content === "string"
                            ? message.content
                            : message.content &&
                              typeof message.content === "object" &&
                              hasResponse(message.content)
                            ? message.content.response
                            : typeof message.content !== "string"
                            ? ""
                            : message.content}
                        </AIResponse>
                        {/* SUGGESTED PROMPTS UI */}
                        {typeof message.content === "object" &&
                          message.content !== null &&
                          "suggestedNextPrompts" in message.content &&
                          Array.isArray(message.content.suggestedNextPrompts) &&
                          message.content.suggestedNextPrompts.length > 0 && (
                            <div className="mt-4 flex flex-col gap-2">
                              <div className="text-xs text-gray-500 mb-1">
                                Suggested next prompts:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.content.suggestedNextPrompts.map(
                                  (prompt: string, i: number) => (
                                    <Button
                                      key={i}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => submitMessage(prompt)}
                                    >
                                      {prompt}
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        {/* Fallback to metadata for backwards compatibility */}
                        {(!message.content ||
                          typeof message.content !== "object" ||
                          !("suggestedNextPrompts" in message.content)) &&
                          (message as ExtendedCoreMessage).metadata
                            ?.suggestedPrompts &&
                          Array.isArray(
                            (message as ExtendedCoreMessage).metadata
                              ?.suggestedPrompts
                          ) &&
                          ((message as ExtendedCoreMessage).metadata
                            ?.suggestedPrompts?.length ?? 0) > 0 && (
                            <div className="mt-4 flex flex-col gap-2">
                              <div className="text-xs text-gray-500 mb-1">
                                Suggested next prompts:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(
                                  (message as ExtendedCoreMessage).metadata
                                    ?.suggestedPrompts || []
                                ).map((prompt: string, i: number) => (
                                  <Button
                                    key={i}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => submitMessage(prompt)}
                                  >
                                    {prompt}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
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
