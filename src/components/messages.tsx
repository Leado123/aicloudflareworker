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

// Type guards to check for different content formats
function hasResponse(obj: any): obj is { response: string } {
  return obj && typeof obj === "object" && "response" in obj;
}

function hasSuggestedPrompts(
  obj: any
): obj is { suggestedNextPrompts: string[] } {
  return (
    obj &&
    typeof obj === "object" &&
    "suggestedNextPrompts" in obj &&
    Array.isArray(obj.suggestedNextPrompts)
  );
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

      setIsItStreaming(
        typeof isLastAssistantMessage === 'undefined' ? null : Boolean(isLastAssistantMessage)
      );

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

      if (toolName === "searchWeb") {
        if (state === "result") {
          const searchResult = result;
          const searchQuery = searchResult?.query || args?.query || "";
          const searchResults = searchResult?.results || [];
          const searchSuccess = searchResult?.success;
          const searchError = searchResult?.error;

          return (
            <motion.div
              key={toolCallId}
              className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: 0.2,
              }}
            >
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium text-blue-900">Web Search Results</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Searched for: <strong>"{searchQuery}"</strong>
                </p>
              </div>

              {searchError ? (
                <div className="text-red-600 text-sm">
                  Search failed: {searchError}
                </div>
              ) : searchSuccess && searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result: any, resultIndex: number) => (
                    <motion.div
                      key={resultIndex}
                      className="bg-white border border-blue-200 rounded-md p-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: "easeOut",
                        delay: 0.3 + resultIndex * 0.1,
                      }}
                    >
                      <h4 className="font-medium text-gray-900 mb-1">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors"
                        >
                          {result.title || "Untitled"}
                        </a>
                      </h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {result.content || "No description available"}
                      </p>
                      <div className="flex items-center justify-between">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {result.url}
                        </a>
                        {result.engines && result.engines.length > 0 && (
                          <span className="text-xs text-gray-500">
                            via {result.engines.join(", ")}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600 text-sm">
                  No search results found.
                </div>
              )}
            </motion.div>
          );
        } else if (state === "call") {
          const searchQuery = args?.query || "";
          return (
            <motion.div
              key={toolCallId}
              className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-gray-600">
                  Searching the web{searchQuery ? ` for "${searchQuery}"` : ""}...
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
                          <AIResponse className="no-markdown-margin">{message.content}</AIResponse>
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
