import { ModeComponentProps, type Conversation } from "@/util/modeDefinitions";
import { useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";
import type { CoreMessage, Message } from "ai";
import { generateEntityTitle, getModeByKey } from "@/util/modes";

export default function ChatMode({
  currentEntity: currentConversation,
  isEmpty: conversationEmpty,
  createEntity: createConversation,
  updateEntity: updateConversation,
}: ModeComponentProps<Conversation>) {
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
    initialMessages: (currentConversation?.messages as CoreMessage[] as Message[]) || [],
    // Associate the chat with the current conversation ID for context.
    id: currentConversation?.id,

    onError: (error) => {
      console.error("CHATMODE CLIENT ERROR:", error);
    },

    // onFinish is the most reliable place to save the conversation state,
    // as it's called after the AI response is fully streamed.
    onFinish: (message) => {
      // The `messages` array from the hook might not be updated yet, so we
      // manually construct the final list with the message from the callback.
      const finalMessages = [...messages, message];

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
