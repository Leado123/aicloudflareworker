import { ModeComponentProps, type Conversation } from "@/util/modeDefinitions";
import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import ChatBar from "../ChatBar/component";
import Messages from "../Messages/component";
import { ScrollArea } from "../ui/scroll-area";
import type { CoreMessage, Message } from "ai";
import { generateEntityTitle, getModeByKey } from "@/util/modes";
import { useMode } from "../ModeProvider/component";
import { useStore } from "@nanostores/react";

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
  setCurrentEntity: setCurrentConversation,
}: ModeComponentProps<Conversation>) {
  const messagesRef = useRef<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(false);
  const addCitationsToConversation = (entries: any[]) => {
    if (!currentConversation) return;
    const existing = Array.isArray((currentConversation as any).citations) ? (currentConversation as any).citations : [];
    const merged = [...existing, ...entries];
    updateConversation(currentConversation.id, { citations: merged } as any);
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    append,
    isLoading,
  } = useChat({
    api: "/api/chat",
    // Load messages from the current conversation if it exists.
    initialMessages:
      (currentConversation?.messages as CoreMessage[] as Message[]) || [],
    // Associate the chat with the current conversation ID for context.
    id: currentConversation?.id,

    onError: (error) => {
      console.error("CHATMODE CLIENT ERROR:", error);
    },

    // Custom fetch function to handle file uploads and search state
    fetch: async (url, options) => {
      const hasFiles = attachedFiles.length > 0;
      const hasSearchEnabled = isSearchEnabled;

      if (hasFiles || hasSearchEnabled) {
        // Create FormData for file upload or search state
        const formData = new FormData();

        // Add messages data
        if (options?.body) {
          formData.append("messages", options.body as string);
        }

        // Add search state
        formData.append("enableSearch", isSearchEnabled.toString());

        // Add files if any
        if (hasFiles) {
          attachedFiles.forEach((file) => {
            formData.append("files", file);
          });
          // Clear attached files after sending
          setAttachedFiles([]);
        }

        return fetch(url, {
          ...options,
          body: formData,
          headers: {
            // Remove content-type header to let the browser set it with boundary
            ...Object.fromEntries(
              Object.entries(options.headers || {}).filter(
                ([key]) => key.toLowerCase() !== "content-type"
              )
            ),
          },
        });
      } else if (options?.body) {
        // Standard JSON request but include search state
        const body = JSON.parse(options.body as string);
        body.enableSearch = isSearchEnabled;

        return fetch(url, {
          ...options,
          body: JSON.stringify(body),
        });
      }

      return fetch(url, options);
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
  }, [currentConversation, setMessages]); // Changed from currentConversation?.id to currentConversation

  // Create a starter conversation when landing with empty storage
  useEffect(() => {
    if (!currentConversation && messagesRef.current.length === 0) {
      const id = createConversation({ title: 'New Chat', messages: [] } as any);
      setCurrentConversation(id);
    }
  }, [currentConversation, createConversation, setCurrentConversation]);

  // This handler is for when the user clicks a suggested prompt.
  const handleSuggestedPrompt = (prompt: string) => {
    append({ role: "user", content: prompt });
  };

  // Function to clear messages from the useChat hook
  const clearMessages = () => {
    setMessages([]);
  };

  // Always render the conversation area so the layout is visible even when empty.
  const showConversation = true;
  const isChatBarCentered = conversationEmpty && !isLoading && messages.length === 0;

  return (
    <div className="w-full h-full flex-1 flex min-w-0 min-h-0">
      <div className="w-full h-full flex-1 min-w-0 min-h-0 flex flex-col relative">
        <div className="flex-1 min-h-0">
          <ScrollArea className="w-full h-full">
            <Messages
              messages={messages}
              submitMessage={handleSuggestedPrompt}
              isLoading={isLoading}
              onSaveCitationsToChat={addCitationsToConversation}
            />
          </ScrollArea>
        </div>
        {/* Citations under chat */}
        {currentConversation && (currentConversation as any).citations?.length > 0 && (
          <div className="px-4 pb-2">
            <div className="max-w-4xl mx-auto bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-sm font-medium text-emerald-900 mb-2">Citations in this chat</div>
              <div className="flex gap-2 flex-wrap">
                {(currentConversation as any).citations.slice(-6).map((c: any, i: number) => (
                  <span key={i} className="text-xs bg-white border border-emerald-200 rounded px-2 py-1">
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <ChatBar
          currentConversation={currentConversation}
          conversationEmpty={isChatBarCentered}
          createConversation={(data) => {
            // Ensure a conversation exists when user clicks new or starts typing on empty state
            const id = createConversation({ title: data?.title || 'New Chat', messages: [] } as any);
            setCurrentConversation(id);
            return id;
          }}
          input={input}
          handleInputChange={(e) => {
            // If there is no conversation yet and user begins typing, create one immediately
            if (!currentConversation && messagesRef.current.length === 0) {
              const id = createConversation({ title: 'New Chat', messages: [] } as any);
              setCurrentConversation(id);
            }
            handleInputChange(e);
          }}
          submitMessage={handleSubmit}
          clearMessages={clearMessages}
          setCurrentConversation={setCurrentConversation}
          appendMessage={append}
          attachedFiles={attachedFiles}
          setAttachedFiles={setAttachedFiles}
          isSearchEnabled={isSearchEnabled}
          setIsSearchEnabled={setIsSearchEnabled}
        />
      </div>
    </div>
  );
}
