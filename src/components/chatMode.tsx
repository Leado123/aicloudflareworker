import { ModeComponentProps, type Conversation } from "@/util/modeDefinitions";
import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";
import type { CoreMessage, Message } from "ai";
import { generateEntityTitle, getModeByKey } from "@/util/modes";

// Helper to prevent duplicate assistant messages
function isDuplicateAssistantMessage(messages: Message[], newMessage: Message) {
  if (messages.length === 0) return false;
  const last = messages[messages.length - 1];
  return (
    last.role === "assistant" &&
    newMessage.role === "assistant" &&
    last.content === newMessage.content
  );
}

export default function ChatMode({
  currentEntity: currentConversation,
  isEmpty: conversationEmpty,
  createEntity: createConversation,
  updateEntity: updateConversation,
}: ModeComponentProps<Conversation>) {
  const messagesRef = useRef<Message[]>([]);
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    append,
    isLoading,
  } = useChat({
    // Load messages from the current conversation if it exists.
    initialMessages:
      (currentConversation?.messages as CoreMessage[] as Message[]) || [],
    // Associate the chat with the current conversation ID for context.
    id: currentConversation?.id,

    onError: (error) => {
      console.error("CHATMODE CLIENT ERROR:", error);
    },

    // onFinish is the most reliable place to save the conversation state,
    // as it's called after the AI response is fully streamed.
    onFinish: (message) => {
      // Prevent duplicate assistant messages
      const finalMessages = [...messagesRef.current];
      if (!isDuplicateAssistantMessage(finalMessages, message)) {
        finalMessages.push(message);
      }

      if (currentConversation) {
        // If we were in an existing conversation, update it.
        updateConversation(currentConversation.id, {
          messages: finalMessages as any[],
        });
      } else {
        // If this was a new chat, create a new conversation entity now.
        const userMessage = finalMessages.find((m) => m.role === "user");
        const chatMode = getModeByKey("chat");

        const title =
          userMessage && chatMode
            ? generateEntityTitle(chatMode, userMessage.content as string)
            : "New Chat";

        createConversation({
          title,
          messages: finalMessages as any[],
        });
      }
    },
  });

  // Keep the ref in sync with the latest messages from the hook.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // This effect syncs the `useChat` hook with the app's global state
  // when the user switches between conversations.
  useEffect(() => {
    if (currentConversation) {
      setMessages((currentConversation.messages as Message[]) || []);
    } else {
      // If there's no active conversation (e.g., all were deleted),
      // clear the hook's message list to prepare for a new chat.
      setMessages([]);
    }
  }, [currentConversation?.id, setMessages]);

  // This handler is for when the user clicks a suggested prompt.
  const handleSuggestedPrompt = (prompt: string) => {
    append({ role: "user", content: prompt });
  };

  // The conversation view should be shown if a conversation is loaded,
  // or if a new chat is actively in progress (indicated by isLoading or
  // the presence of messages in the hook's state).
  const showConversation =
    !conversationEmpty || isLoading || messages.length > 0;

  return (
    <div className="w-full h-full flex-1 flex">
      {showConversation ? (
        <div className="w-full h-full flex-1 relative">
          <ScrollArea className="w-full h-full">
            <Messages
              messages={messages}
              submitMessage={handleSuggestedPrompt}
              isLoading={isLoading}
            />
          </ScrollArea>
          <ChatBar
            currentConversation={currentConversation}
            conversationEmpty={false} // The bar is at the bottom in this view
            createConversation={createConversation}
            input={input}
            handleInputChange={handleInputChange}
            submitMessage={handleSubmit} // Pass the default handler
          />
        </div>
      ) : (
        <div className="w-full h-full flex-1 relative">
          <ChatBar
            currentConversation={currentConversation}
            conversationEmpty={true} // The bar is in the center in this view
            createConversation={createConversation}
            input={input}
            handleInputChange={handleInputChange}
            submitMessage={handleSubmit}
          />
        </div>
      )}
    </div>
  );
}
