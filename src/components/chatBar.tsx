import { type Conversation } from "@/util/modeDefinitions";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@nanostores/react";
import { LucideArrowDown, LucideArrowRight, LucidePlus } from "lucide-react";
import React from "react";
import { isAtBottomAtom, scrollToBottomSignal } from "./messages";

interface ChatBarProps {
  currentConversation: Conversation | null;
  conversationEmpty: boolean;
  createConversation: (data: Partial<Conversation>) => string;
  submitMessage: (e: React.FormEvent<HTMLFormElement>) => void;
  input: string;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
}

export default function ChatBar({
  conversationEmpty: $conversationEmpty,
  createConversation,
  submitMessage,
  input,
  handleInputChange,
}: ChatBarProps) {
  const $isAtBottom = useStore(isAtBottomAtom);

  const handleNewConversation = () => {
    createConversation({ title: "New Chat" });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      submitMessage(e);
    }
  };

  return (
    <motion.div
      layout
      initial={{ y: 50 }}
      animate={{ y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className={
        $conversationEmpty
          ? `absolute inset-0 flex flex-col items-center justify-center px-4`
          : `absolute bottom-0 left-0 right-0 w-full p-2 flex flex-col items-center gap-2`
      }
    >
      {$conversationEmpty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="mb-2 text-center"
        >
          <h1 className="text-6xl font-medium">Chat</h1>
          <p className="text-gray-500 mt-4">
            SS Studio is a collection of various tools
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {!$conversationEmpty && !$isAtBottom && (
          <motion.button
            className="absolute top-[-4em] cursor-pointer p-3 rounded-full backdrop-blur-lg border shadow"
            onClick={() => {
              const currentValue = scrollToBottomSignal.get();
              scrollToBottomSignal.set(currentValue + 1);
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            title="Scroll to bottom"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LucideArrowDown className="w-5 h-5 text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleFormSubmit}
        className="w-full max-w-4xl shadow flex bg-white flex-col border gap-2 rounded-3xl p-2"
      >
        <textarea
          className="outline-0 text-lg p-2 border-0 shadow-none resize-none w-full"
          placeholder="Ask ShareSyllabus AI"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).form?.requestSubmit();
            }
          }}
          rows={1}
          style={{ minHeight: "2.5em", maxHeight: "10em", overflowY: "auto" }}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
        />
        <div className="flex text-gray-600 gap-2">
          <button
            type="button"
            className="cursor-pointer p-2 rounded-full hover:bg-gray-100"
            onClick={handleNewConversation}
            title="Start new conversation"
          >
            <LucidePlus />
          </button>
          <div className="flex-1"></div>
          <button
            type="submit"
            className="cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded-full disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            <LucideArrowRight />
          </button>
        </div>
      </form>

      {$conversationEmpty && (
        <p className="text-xs text-gray-700 mt-4 text-center max-w-2xl">
          We can see all of your chat requests, we can do what we want with it.
          Therefore, beware of the content you send like passwords or secrets.
        </p>
      )}

      {!$conversationEmpty && (
        <p className="text-xs text-gray-700">
          We can see all of your chat requests, we can do what we want with it.
          Therefore, beware of the content you send like passwords or secrets.
        </p>
      )}
    </motion.div>
  );
}
