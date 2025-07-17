import ShinyText from "@/blocks/TextAnimations/ShinyText/ShinyText";
import { ModeComponentProps, type Conversation } from "@/util/modeDefinitions";
import { useEffect } from "react";
import type { CoreMessage } from "ai";
import { requestChatMessageStream } from "@/util/requestChatMessage";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import GradientText from "./gradienttext";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";
import { useModeAPI } from "@/util/modeAPIClient";
import type { ExtendedCoreMessage } from "@/util/store";

// Custom message types for internal use
interface MessageWithMetadata {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    suggestedPrompts?: string[];
    showSuggestedPrompts?: boolean;
  };
}

export default function ChatMode({
  entities: conversations,
  currentEntity: currentConversation,
  isEmpty: conversationEmpty,
  createEntity: createConversation,
  updateEntity: updateConversation,
}: ModeComponentProps<Conversation>) {
  // Access to type-safe API client
  const modeAPI = useModeAPI();

  // Example: Generate title for conversation when first message is added
  useEffect(() => {
    if (
      currentConversation &&
      currentConversation.messages.length === 1 &&
      currentConversation.title === "New Chat"
    ) {
      const firstMessage = currentConversation.messages[0];
      if (
        firstMessage.role === "user" &&
        typeof firstMessage.content === "string"
      ) {
        // Use the type-safe API to generate a title
        modeAPI.chat
          .generateTitle({ message: firstMessage.content })
          .then((result) => {
            updateConversation(currentConversation.id, { title: result.title });
          })
          .catch((error) => {
            console.error("Failed to generate title:", error);
          });
      }
    }
  }, [currentConversation?.messages?.length]);

  const generateTitleFromMessage = (message: string): string => {
    const truncated = message.trim().substring(0, 20);
    return truncated.length < message.trim().length
      ? truncated + "..."
      : truncated;
  };

  const submitMessage = async (messageContent: string) => {
    if (!messageContent.trim()) {
      return;
    }

    let conversationId = currentConversation?.id;
    let conversationMessages = currentConversation?.messages || [];

    // If no conversation, create one
    if (!conversationId) {
      const title = generateTitleFromMessage(messageContent);
      conversationId = createConversation({ title });
      conversationMessages = [];
    } else if (
      currentConversation?.title === "New Chat" &&
      conversationMessages.length === 0
    ) {
      // If it's the first message in a "New Chat", update the title
      const title = generateTitleFromMessage(messageContent);
      updateConversation(conversationId, { title });
    }

    // Create a new user message
    const userMessage: CoreMessage = { role: "user", content: messageContent };

    // Save the user message in the UI conversation
    const uiMessages = [...conversationMessages, userMessage];
    updateConversation(conversationId, { messages: uiMessages });

    // Format messages for API by ensuring content is always a string
    const apiMessages = conversationMessages.map((msg) => {
      try {
        // Handle assistant messages with object content (structured responses)
        if (
          msg.role === "assistant" &&
          typeof msg.content === "object" &&
          msg.content !== null
        ) {
          // Extract just the text response from assistant messages with object content
          if ("response" in msg.content) {
            return { role: msg.role, content: String(msg.content.response) };
          }
          return { role: msg.role, content: String(msg.content) };
        }

        // Ensure content is always a string for all message types
        if (typeof msg.content !== "string") {
          return {
            role: msg.role,
            content: String(msg.content || ""),
          } as CoreMessage;
        }

        return msg as CoreMessage;
      } catch (err) {
        console.error("Error formatting message for API:", err);
        // Fallback to safe string content
        return { role: msg.role, content: "" };
      }
    });

    // Add the new user message to the API message list
    apiMessages.push(userMessage);

    try {
      // Show placeholder for AI typing
      const aiPlaceholderMessage: CoreMessage = {
        role: "assistant",
        content: "",
      };
      updateConversation(conversationId, {
        messages: [...uiMessages, aiPlaceholderMessage],
      });

      // Initialize response object
      let fullResponse: any = { response: "", suggestedNextPrompts: [] };

      console.log("Sending formatted messages to API:", apiMessages);
      // Stream the response from the API
      await requestChatMessageStream(apiMessages as CoreMessage[], (chunk) => {
        if (chunk.response !== undefined) {
          fullResponse.response = chunk.response;
        }
        if (chunk.suggestedNextPrompts !== undefined) {
          fullResponse.suggestedNextPrompts = chunk.suggestedNextPrompts;
        }

        if (conversationId) {
          // Update UI with structured response object
          const assistantMessage = {
            role: "assistant",
            content: fullResponse.response || "",
            metadata: {
              suggestedPrompts: fullResponse.suggestedNextPrompts || [],
              showSuggestedPrompts: true,
            },
          } as CoreMessage;
          updateConversation(conversationId, {
            messages: [...uiMessages, assistantMessage],
          });
        }
      });
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      console.error("Error in submitMessage:", error);
      if (conversationId) {
        // Revert to state before placeholder message
        updateConversation(conversationId, { messages: uiMessages });

        // Create a user-friendly error message
        let friendlyMessage =
          "I'm sorry, I couldn't process your request right now.";
        let technicalDetails = "";

        if (error instanceof Error) {
          // If it's an invalid prompt error, give more helpful guidance
          if (
            error.message.includes("Invalid prompt") ||
            error.message.includes("messages must be")
          ) {
            friendlyMessage =
              "I'm having trouble with this conversation format. Let's start fresh with a new question.";
          } else if (
            error.message.includes("quota") ||
            error.message.includes("rate limit")
          ) {
            friendlyMessage =
              "I've reached my usage limit. Please try again in a moment.";
          } else {
            // For other errors, just give a general message
            friendlyMessage =
              "Something went wrong. Let's try a different approach.";
          }
          technicalDetails = error.message;
        }

        updateConversation(conversationId, {
          messages: [
            ...uiMessages,
            {
              role: "assistant",
              content: friendlyMessage,
              metadata: {
                suggestedPrompts: [
                  "Let me ask something else",
                  "Could you explain that differently?",
                  "Tell me more about this topic",
                ],
                showSuggestedPrompts: true,
              },
            } as any,
          ],
        });
      }
    }
  };

  return (
    <div className="w-full h-full flex-1 flex">
      {/* Render current conversation */}
      {conversationEmpty ? (
        <div className="w-full h-full flex-1 relative">
          <ChatBar
            currentConversation={currentConversation}
            conversationEmpty={conversationEmpty}
            createConversation={createConversation}
            submitMessage={submitMessage}
          />
        </div>
      ) : (
        <div className="w-full h-full flex-1 relative">
          <ScrollArea className="w-full h-full">
            <Messages
              currentConversation={currentConversation}
              submitMessage={submitMessage}
            />
          </ScrollArea>
          <ChatBar
            currentConversation={currentConversation}
            conversationEmpty={conversationEmpty}
            createConversation={createConversation}
            submitMessage={submitMessage}
          />
        </div>
      )}
    </div>
  );
}
