import { type Conversation } from "@/util/modeDefinitions";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@nanostores/react";
import { LucideArrowDown, LucideArrowRight, LucidePlus, LucidePaperclip, LucideSearch, LucideCornerDownLeft, LucideUpload, LucideGlobe2, LucideGlobe, LucideCornerUpRight, LucideFile, LucideBookOpen } from "lucide-react";
import React, { useRef, useState, useMemo } from "react";
import {
  RichTextarea,
  type RichTextareaHandle,
} from "rich-textarea";
import { createPortal } from "react-dom";
import { isAtBottomAtom, scrollToBottomSignal } from "../Messages/component";
import { Button } from "../ui/button";
import { useModeSwitcher } from "../ModeProvider/component";
import { useDualMode } from "../MainLayout";

// --------------------- Slash command constants ----------------------
type CommandItem = { label: string; description: string };

const SLASH_REG = /\/([^\s/]*)$/;
const COMMANDS: CommandItem[] = [
  { label: "cite", description: "Search academic citations" },
  { label: "file", description: "Upload files" },
];
const MAX_LIST_LENGTH = 5;

// --------------------- Fancy command chip component ----------------------
interface CommandChipProps {
  label: string;
  onDelete: () => void;
}

function CommandChip({ label, onDelete }: CommandChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-medium rounded-md cursor-pointer hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-sm"
      onClick={onDelete}
      title="Click to remove"
    >
      <span className="text-xs">/</span>
      {label}
      <span className="text-xs opacity-70">×</span>
    </span>
  );
}

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
  // Add append function for direct message sending
  appendMessage?: (message: { role: "user"; content: string }) => void;
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
  appendMessage,
  attachedFiles,
  setAttachedFiles,
  isSearchEnabled,
  setIsSearchEnabled,
}: ChatBarProps) {
  const $isAtBottom = useStore(isAtBottomAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { switchMode } = useModeSwitcher();
  const { openDualModeWith } = useDualMode();

  /* ---------------- RichTextarea slash command logic ---------------- */
  const richRef = useRef<RichTextareaHandle>(null);
  const [popupPos, setPopupPos] = useState<{
    top: number;
    left: number;
    caret: number;
  } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  const currentWord = popupPos ? input.slice(0, popupPos.caret).match(SLASH_REG)?.[1] ?? "" : "";

  const filteredCommands = useMemo(
    () =>
      COMMANDS.filter((c) =>
        c.label.toLowerCase().startsWith(currentWord.toLowerCase())
      ).slice(0, MAX_LIST_LENGTH),
    [currentWord]
  );

  const completeCommand = (i: number) => {
    if (!richRef.current || !popupPos) return;
    const selected = filteredCommands[i];
    if (!selected) return;
    
    // Handle special commands
    if (selected.label === "file") {
      handleFileAttach();
      setPopupPos(null);
      setSlashIndex(0);
      return;
    }
    
    // Insert a short marker that matches chip width
    const chipMarker = `[${selected.label}]`;
    richRef.current.setRangeText(
      `${chipMarker} `,
      popupPos.caret - currentWord.length - 1,
      popupPos.caret,
      "end"
    );
    
    // Sync to parent state
    const newValue = richRef.current.value;
    handleInputChange({
      target: { value: newValue },
    } as any);

    setPopupPos(null);
    setSlashIndex(0);
  };

  // Extract chips from input and clean the textarea value
  const chips = useMemo(() => {
    const matches = input.match(/\[([^\]]+)\]/g) || [];
    return matches.map(match => match.match(/\[([^\]]+)\]/)?.[1]).filter(Boolean) as string[];
  }, [input]);

  const cleanInput = useMemo(() => {
    const cleaned = input.replace(/\[([^\]]+)\]/g, '');
    // Remove leading space that might be left after chip removal
    return cleaned.replace(/^\s+/, '');
  }, [input]);

  const handleChipDelete = (label: string) => {
    if (!label) return;
    const newValue = input.replace(`[${label}]`, '');
    handleInputChange({
      target: { value: newValue },
    } as any);
  };

  const handleBackspaceOnEmpty = () => {
    if (cleanInput === '' && chips.length > 0) {
      const lastChip = chips[chips.length - 1];
      if (lastChip) {
        handleChipDelete(lastChip);
      }
    }
  };

  const handleRichKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle backspace on empty textarea to remove last chip
    if (e.key === "Backspace" && cleanInput === '' && chips.length > 0) {
      e.preventDefault();
      handleBackspaceOnEmpty();
      return;
    }

    // Handle popup navigation
    if (popupPos && filteredCommands.length > 0) {
      switch (e.code) {
        case "ArrowUp":
          e.preventDefault();
          setSlashIndex((prev) => (prev <= 0 ? filteredCommands.length - 1 : prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSlashIndex((prev) => (prev >= filteredCommands.length - 1 ? 0 : prev + 1));
          break;
        case "Enter":
          e.preventDefault();
          completeCommand(slashIndex);
          break;
        case "Escape":
          e.preventDefault();
          setPopupPos(null);
          setSlashIndex(0);
          break;
        default:
          break;
      }
      return;
    }

    // Handle enter-to-send when popup not visible
    if (e.key === "Enter" && !e.shiftKey && !popupPos) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  };

  // Custom input change handler that preserves chips
  const handleInputChangeWithChips = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCleanValue = e.target.value;
    
    // If we have existing chips, preserve them by reconstructing the full value
    if (chips.length > 0) {
      const chipPrefix = chips.map(chip => `[${chip}]`).join(' ');
      const fullValue = chipPrefix + (newCleanValue ? ' ' + newCleanValue : '');
      
      // Create a synthetic event with the full value including chips
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: fullValue }
      };
      handleInputChange(syntheticEvent as any);
    } else {
      // No chips, just pass through the change normally
      handleInputChange(e as any);
    }
  };

  const handleRichSelectionChange = (r: any) => {
    if (r.focused && SLASH_REG.test(input.slice(0, r.selectionStart))) {
      setPopupPos({ top: r.top + r.height, left: r.left, caret: r.selectionStart });
      setSlashIndex(0);
    } else {
      setPopupPos(null);
      setSlashIndex(0);
    }
  };

  // Check if user is typing something that suggests they want citations
  const showCitationHint = input.toLowerCase().startsWith("cite") && input.length >= 4;

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
    // Clean the input by removing chip brackets and converting to clean text
    const cleanedInput = input.replace(/\[([^\]]+)\]/g, '$1').trim();
    if (cleanedInput) {
      if (appendMessage) {
        // Use append for direct message sending with clean content
        appendMessage({ role: "user", content: cleanedInput });
        // Clear the input
        handleInputChange({
          target: { value: "" }
        } as React.ChangeEvent<HTMLTextAreaElement>);
      } else {
        // Fallback to form submission
        const changeEvent = {
          target: { value: cleanedInput }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        handleInputChange(changeEvent);
        submitMessage(e);
      }
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
      preventDefault: () => { },
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

  // Dynamic className based on conversation state
  const containerClassName = $conversationEmpty
    ? "absolute inset-0 flex flex-col items-center justify-center px-4"
    : "absolute bottom-0 left-0 right-0 bg-white from-opacity-0 to-opacity-100 w-full p-2 flex flex-col items-center gap-2";

  return (

    <motion.div
      layout
      className={containerClassName}

    >
      {/* Branding only in empty state */}
      {$conversationEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-wrap mb-10 gap-2 mt-4 justify-center"
        >
          <text className="text-2xl font-bold">SS STUDIO</text>
        </motion.div>
      )}

      {/* Scroll to bottom button only in non-empty state and not at bottom */}
      {!$conversationEmpty && (
        <AnimatePresence>
          {!$isAtBottom && (
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
      )}

      <div className="w-full max-w-4xl">
        {/* Citation hint */}
        <AnimatePresence>
          {showCitationHint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-24 left-4 right-4 z-10"
            >
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <LucideBookOpen className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-emerald-800">Citation Mode Detected</span>
                    <p className="text-sm text-emerald-700 mt-1">
                      I'll search for academic sources and citations for your query.
                      Results will also be available in Citation Mode for detailed exploration.
                    </p>
                    <button
                      onClick={() => {
                        openDualModeWith('citation');
                      }}
                      className="mt-2 text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
                    >
                      Open Citation Manager
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input form */}
        <form onSubmit={handleFormSubmit} className="w-full">
          <div className={`${input.trim()
            ? "bg-gradient-to-b from-blue-50 to-white border-blue-400 border-2  shadow-lg"
            : "bg-white border border-gray-200"} 
          rounded-4xl shadow-sm transition-all hover:shadow-md duration-200 p-2`}>
            {/* Attached files display box */}
            {attachedFiles.length > 0 && (
              <div className="p-2 gap-2 rounded-3xl">
                <div className="text-sm font-medium text-gray-700">Attached Files:</div>
                <div className="gap-2 flex w-full overflow-x-scroll">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 justify-between bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex gap-2 items-center">
                        <div className="text-gray-600">
                          <LucideFile className="w-4 h-4" />
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


            {/* Input section */}
            <div className="flex flex-col gap-2">
              {/* Multiline textarea */}
              <div className="flex items-center w-full">
                  {/* Chips container - only show if chips exist */}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1 flex-shrink-0 mr-2">
                      {chips.map((chip, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-blue-50 to-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-full cursor-pointer hover:from-red-50 hover:to-red-100 hover:border-red-200 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => handleChipDelete(chip)}
                          title="Click to remove"
                        >
                          <span className="text-xs font-semibold">/</span>
                          <span className="text-xs">{chip}</span>
                          <span className="text-xs opacity-60 hover:opacity-100">×</span>
                        </div>
                      ))}
                    </div>
                  )}
                
                {/* Textarea */}
                <RichTextarea
                  ref={richRef}
                  className="resize-none placeholder:text-gray-400 outline-none font-medium drop-shadow-lg text-base p-2 focus:ring-0 flex-1 w-full"
                  placeholder="Type '/' for commands..."
                  value={cleanInput}
                  autoFocus
                  onChange={handleInputChangeWithChips}
                  onKeyDown={handleRichKeyDown}
                  onSelectionChange={handleRichSelectionChange}
                  rows={1}
                  style={{
                    minHeight: '2.5rem',
                    maxHeight: '120px',
                    lineHeight: '1.5rem',
                    overflowY: 'auto',
                    width: '100%',
                    display: 'block'
                  }}
                />
              </div>
              {/* Command suggestion overlay */}
              {popupPos && filteredCommands.length > 0 &&
                createPortal(
                  <motion.div
                    initial={{ 
                      opacity: 0, 
                      scaleX: 0,
                      scaleY: 0,
                      transformOrigin: "left bottom"
                    }}
                    animate={{ 
                      opacity: 1, 
                      scaleX: 1,
                      scaleY: 1
                    }}
                    exit={{ 
                      opacity: 0, 
                      scaleX: 0,
                      scaleY: 0
                    }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8
                    }}
                    className="absolute rounded-bl-md rounded-2xl z-50 bg-white border border-gray-200 shadow-lg w-48 text-sm overflow-hidden"
                    style={{ 
                      bottom: window.innerHeight - popupPos.top + 22.5, 
                      left: popupPos.left,
                    }}
                  >
                    {filteredCommands.map((cmd, i) => (
                      <motion.div
                        key={cmd.label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ 
                          delay: 0.1 + i * 0.08,
                          duration: 0.2,
                          ease: "easeOut"
                        }}
                        className={`px-3 py-1.5 cursor-pointer flex items-center gap-2 hover:bg-gray-50 transition-all duration-150 ${i === slashIndex ? 'bg-gray-100' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          completeCommand(i);
                        }}
                      >
                        <span className="text-xs text-gray-400">/</span>
                        <span className="font-medium text-gray-900">{cmd.label}</span>
                        <span className="text-xs text-gray-500 ml-auto">{cmd.description}</span>
                      </motion.div>
                    ))}
                  </motion.div>,
                  document.body
                )}
              {/* Button row */}
              <div className="flex items-center justify-between">
                {/* Left side icons */}
                <div className="flex items-center gap-2 [&>button]:bg-white 
                 [&>button]:shadow-sm [&>button]:text-sm 
                [&>button]:cursor-pointer [&>button]:text-neutral-800 [&>button]:p-2 [&>button]:pl-3 
                [&>button]:pr-3 [&>button]:flex [&>button]:font-medium [&>button]:place-items-center [&>button]:gap-2 
               [&>button]:border-neutral-700 [&>button]:border-b-4 [&>button]:border-1 [&>button]:rounded-3xl [&>button]:transition-colors [&>button]:duration-200 [&>button]:ease-in-out 
                [&>button:hover]:bg-yellow-50 [&>button:hover]:text-black">
                  <button
                    type="button"
                    onClick={handleFileAttach}
                    title="Attach file"
                    className="transition-colors"
                  >
                    <LucideUpload className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSearchToggle}
                    className={`transition-colors duration-200 ease-in-out hover:text-gray-700 ${isSearchEnabled
                      ? 'bg-blue-600 text-white border-blue-700 !bg-blue-600 !text-white'
                      : ''
                      }`}
                    style={isSearchEnabled ? { backgroundColor: '#2563eb', color: '#fff', borderColor: '#1d4ed8' } : undefined}
                    title={isSearchEnabled ? "Disable search" : "Enable search"}
                  >
                    <LucideGlobe className="w-4 h-4" />
                    <span>Search the Web</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openDualModeWith('citation');
                    }}
                    title="Open Citation Manager"
                    className="transition-colors"
                  >
                    <LucideBookOpen className="w-4 h-4" />
                    <span>Citations</span>
                  </button>
                </div>
                {/* Right side buttons */}
                <div className="flex items-center gap-2">
                  {/* Enter hint */}
                  <div className="flex items-center text-xs space-x-1">
                    <LucideCornerDownLeft strokeWidth={3} className="w-3 h-3" />
                    <span>Enter to send</span>
                  </div>
                  {/* Submit button */}
                  <button
                    type="submit"
                    className={`p-2 rounded-3xl transition-all ${input.trim()
                      ? "bg-gradient-to-b from-purple-500 border-purple-600 border-2 text-white shadow-lg"
                      : "bg-gradient-to-b from-neutral-500 text-neutral-600 border-neutral-600 border-2 cursor-not-allowed"
                      }`}
                    disabled={!input.trim()}
                    title="Send message"
                  >
                    <LucideArrowRight strokeWidth={3} className="w-5 h-5 drop-shadow-2xl" />
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

        {/* Suggestion buttons below chatbar when empty */}
        {$conversationEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap gap-2 mt-6 justify-center group"
          >
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.5 + index * 0.08,
                }}
                whileHover={{
                  scale: 1.06,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  transition: { duration: 0.18 },
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion.label)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.label}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Privacy notice */}
      <p className="text-xs text-gray-500 text-center max-w-2xl ">
        Your chat requests/responses can be used for R/D
      </p>
    </motion.div>

  );
}
