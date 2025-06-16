import ShinyText from "@/blocks/TextAnimations/ShinyText/ShinyText";
import { conversationEmpty, conversations, currentConversationId, type Conversation } from "@/util/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import GradientText from "./gradienttext";
import ChatBar from "./chatBar";
import Messages from "./messages";
import { ScrollArea } from "./ui/scroll-area";
import RotatingText from "@/blocks/TextAnimations/RotatingText/RotatingText";


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
                            <LayoutGroup>
                                <motion.p layout className="text-4xl font-bold flex place-items-center">
                                    <motion.span layout transition={{ type: "spring", damping: 30, stiffness: 400 }}>You can&nbsp;</motion.span>
                                    <RotatingText
                                        texts={['ask a question', 'generate Notion notes', 'make Quizlet flashcards', 'make Knowt flashcards']}
                                        mainClassName="bg-black p-2 text-white rounded-lg"
                                        staggerFrom={"last"} // @ts-expect-error
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}// @ts-expect-error
                                        exit={{ y: "-110%" }}
                                        staggerDuration={0.025}
                                        splitBy="words"
                                        splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                        rotationInterval={2000}
                                    />
                                </motion.p>
                            </LayoutGroup>
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