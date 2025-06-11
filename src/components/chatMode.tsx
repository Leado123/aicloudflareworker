import ShinyText from "@/blocks/TextAnimations/ShinyText/ShinyText";
import { conversationEmpty, conversations, currentConversationId, type Conversation } from "@/util/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GradientText from "./gradienttext";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";


export default function ChatMode() {
    const $conversations = useStore(conversations);
    const $conversationEmpty = useStore(conversationEmpty);

    return (
        <div className="w-full h-full flex-1 flex">
            {/* Render current conversation */}
            {$conversationEmpty ? (
                <div className="w-full h-full flex-1 ">
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute w-full place-items-center bottom-[60%]"
                        >
                            <GradientText className="rounded-none text-4xl font-black">
                                Free AI Chat and Tools
                            </GradientText>
                            <text className="text-gray-500">
                                Powered by Gemini & College Success Club Prompt Engineering
                            </text>
                        </motion.div>
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex-1 overflow-y-scroll place-items-center">
                    <Messages />
                </div>
            )}
            <ChatBar />
        </div>
    );
}