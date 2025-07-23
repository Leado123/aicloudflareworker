import { type Conversation } from "@/util/modeDefinitions";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@nanostores/react";
import { LucideArrowDown, LucideArrowRight, LucidePlus, LucidePaperclip, LucideSearch, LucideCornerDownLeft, LucideUpload, LucideGlobe2, LucideGlobe } from "lucide-react";
import React, { useRef, useState } from "react";
import { isAtBottomAtom, scrollToBottomSignal } from "./messages";
import { Button } from "./ui/button";

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
  // Add new props for proper new conversation handling
  clearMessages?: () => void;
  setCurrentConversation?: (id: string | null) => void;
  // Attachment handling props
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  // Search handling props
  isSearchEnabled: boolean;
  setIsSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ChatBar({
  conversationEmpty: $conversationEmpty,
  createConversation,
  submitMessage,
  input,
  handleInputChange,
  clearMessages,
  setCurrentConversation,
  attachedFiles,
  setAttachedFiles,
  isSearchEnabled,
  setIsSearchEnabled,
}: ChatBarProps) {
  const $isAtBottom = useStore(isAtBottomAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewConversation = () => {
    // Clear the current messages first to reset the chat state
    if (clearMessages) {
      clearMessages();
    }
    
    // Clear the current conversation to show empty state
    if (setCurrentConversation) {
      setCurrentConversation(null);
    }
    
    // Don't create a new conversation here - it will be created automatically
    // when the user sends their first message in the empty state
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      submitMessage(e);
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleSearchToggle = () => {
    setIsSearchEnabled(!isSearchEnabled);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Create a synthetic form event to submit the suggestion
    const syntheticEvent = {
      preventDefault: () => {},
      target: {},
    } as React.FormEvent<HTMLFormElement>;
    
    // Set the input value and submit
    const event = {
      target: { value: suggestion },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    handleInputChange(event);
    
    // Submit after a brief delay to ensure state updates
    setTimeout(() => {
      submitMessage(syntheticEvent);
    }, 50);
  };

  const suggestions = [
    { icon: "🎲", label: "Surprise me" },
    { icon: "💡", label: "Brainstorm" },
    { icon: "✍️", label: "Help me write" },
    { icon: "🔍", label: "Analyze images" },
    { icon: "⋯", label: "More" },
  ];

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
          : `absolute bottom-0 left-0 right-0 w-full p-4 flex flex-col items-center gap-4`
      }
    >
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

      <div className="w-full max-w-4xl">
        {/* Main input form with height */}
        <form onSubmit={handleFormSubmit} className="w-full">
          <div className="bg-white border border-gray-200 rounded-4xl shadow-sm hover:shadow-md transition-shadow duration-200 p-2">
            
            {/* Attached files display box */}
            {attachedFiles.length > 0 && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">Attached Files:</div>
                <div className="space-y-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-blue-600">
                          <LucidePaperclip className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {file.type} • {Math.round(file.size / 1024)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove file"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search mode indicator */}
            {isSearchEnabled && (
              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <LucideGlobe className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">Search mode enabled</span>
                <button
                  type="button"
                  onClick={() => setIsSearchEnabled(false)}
                  className="ml-auto text-blue-600 hover:text-blue-800"
                  title="Disable search"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input section */}
            <div className="flex flex-col gap-2">
              {/* Multiline textarea */}

                <textarea
                  className="w-full resize-none outline-none text-base p-2 focus:ring-0"
                  placeholder="Ask anything..."
                  value={input}
                  autoFocus
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      (e.target as HTMLTextAreaElement).form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  style={{
                    maxHeight: "120px", // 3 * ~40px line-height
                    overflowY: "auto",
                  }}
                  onInput={e => {
                    const textarea = e.currentTarget;
                    // Calculate the base scrollHeight for a single row if not already set
                    if (!(textarea as any)._baseScrollHeight) {
                      (textarea as any)._baseScrollHeight = textarea.scrollHeight;
                    }
                    textarea.rows = 1; // Always reset to 1 before measuring
                    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight || "20", 10);
                    const maxRows = 3;
                    const baseScrollHeight = (textarea as any)._baseScrollHeight || 0;
                    const lines = Math.floor((textarea.scrollHeight - baseScrollHeight) / lineHeight) + 1;
                    textarea.rows = Math.max(1, Math.min(maxRows, lines));
                  }}
                />

              {/* Button row */}
              <div className="flex items-center justify-between">
                {/* Left side icons */}
                <div className="flex items-center gap-2 [&>button]:text-sm [&>button]:text-neutral-600 [&>button]:p-2 [&>button]:pl-3 [&>button]:pr-3 [&>button]:flex [&>button]:font-medium [&>button]:place-items-center [&>button]:gap-2 [&>button]:border [&>button]:rounded-3xl [&>button]:transition-colors [&>button:hover]:bg-gray-100">
                  <button
                    type="button"
                    onClick={handleFileAttach}
                    title="Attach file"
                  >
                    <LucideUpload className="w-4 h-4" />
                    <text>Upload</text>
                  </button>
                  <button
                    type="button"
                    onClick={handleSearchToggle}
                    className={`hover:text-gray-700 ${isSearchEnabled ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
                    title={isSearchEnabled ? "Disable search" : "Enable search"}
                  >
                    <LucideGlobe className="w-4 h-4" />
                    <text>Search</text>
                  </button>
                </div>

                {/* Right side buttons */}
                <div className="flex items-center gap-2">
                  {/* Enter hint */}
                  <div className="flex items-center text-xs text-gray-400 space-x-1">
                    <LucideCornerDownLeft className="w-3 h-3" />
                    <span>Enter to send</span>
                  </div>
                  
                  {/* Submit button */}
                  <button
                    type="submit"
                    className={`p-3 rounded-lg transition-all ${
                      input.trim() 
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!input.trim()}
                    title="Send message"
                  >
                    <LucideArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </form>

        {/* Suggestion buttons */}
        {$conversationEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap gap-2 mt-4 justify-center"
          >
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion.label)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border-gray-200 hover:border-gray-300 transition-colors"
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.label}</span>
              </Button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Privacy notice */}
      <p className="text-xs text-gray-500 text-center max-w-2xl mt-2">
        We can see all of your chat requests, we can do what we want with it.
        Therefore, beware of the content you send like passwords or secrets.
      </p>
    </motion.div>
  );
}
