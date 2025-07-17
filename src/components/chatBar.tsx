import { type Conversation } from "@/util/modeDefinitions";
import { motion } from "framer-motion";

import { Input } from "./ui/input";
import { useStore } from "@nanostores/react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { LucideArrowDown, LucideArrowRight, LucidePlus } from "lucide-react";
import { useEffect, useState } from "react";

import { isAtBottomAtom, scrollToBottomSignal } from "./messages";
import RotatingText from "@/blocks/TextAnimations/RotatingText/RotatingText";

interface ChatBarProps {
  currentConversation: Conversation | null;
  conversationEmpty: boolean;
  createConversation: (data: Partial<Conversation>) => string;
  submitMessage: (message: string) => void;
}

export default function ChatBar({
  currentConversation: $currentConversation,
  conversationEmpty: $conversationEmpty,
  createConversation,
  submitMessage,
}: ChatBarProps) {
  const $isAtBottom = useStore(isAtBottomAtom);

  const [inputValue, setInputValue] = useState("");

  console.log(
    "CHATBAR DEBUG - isAtBottom:",
    $isAtBottom,
    "conversationEmpty:",
    $conversationEmpty,
    "show button?",
    !$isAtBottom && !$conversationEmpty
  );

  const handleNewConversation = () => {
    createConversation({ title: "New Chat" });
    setInputValue("");
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      submitMessage(inputValue.trim());
      setInputValue("");
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
      {/* Initial text when conversation is empty - now part of ChatBar */}
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
        {" "}
        {/* Scroll to bottom button */}
        {/* Temporarily always show for debugging */}
        {!$conversationEmpty && !$isAtBottom && (
          <motion.button
            className="absolute top-[-4em] cursor-pointer p-3 rounded-full backdrop-blur-lg border shadow"
            onClick={() => {
              console.log("SCROLL BUTTON CLICKED");
              // Trigger scroll signal - Messages component will handle the actual scrolling
              const currentValue = scrollToBottomSignal.get();
              const newValue = currentValue + 1;
              console.log("Signal changing from", currentValue, "to", newValue);
              scrollToBottomSignal.set(newValue);
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            title={`Scroll to bottom (isAtBottom: ${$isAtBottom})`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LucideArrowDown className="w-5 h-5 text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className={`w-full max-w-4xl shadow flex bg-white flex-col border gap-2 rounded-3xl p-2 ${
          $conversationEmpty ? "" : ""
        }`}
      >
        <textarea
          className="outline-0 text-lg p-2 border-0 shadow-none resize-none"
          placeholder="Ask ShareSyllabus AI"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          rows={1}
          style={{ minHeight: "2.5em", maxHeight: "8em", overflowY: "auto" }}
          ref={(el) => {
            if (el) {
              // Auto-resize logic to mimic minRows/maxRows
              el.style.height = "auto";
              el.style.height =
                Math.min(
                  Math.max(el.scrollHeight, 2.5 * 16), // 2.5em in px (assuming 16px font)
                  8 * 16 // 8em in px
                ) + "px";
            }
          }}
        />
        <div className="flex text-gray-600 gap-2">
          <button
            className="cursor-pointer p-2 rounded-full hover:bg-gray-100"
            onClick={handleNewConversation}
            title="Start new conversation"
          >
            <LucidePlus />
          </button>
          <div className="flex-1"></div>
          <button
            className="cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded-full"
            onClick={handleSendMessage}
          >
            <LucideArrowRight />
          </button>
        </div>
      </div>

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
