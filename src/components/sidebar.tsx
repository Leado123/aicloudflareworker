import { LucideMessageCircle, LucidePlus, LucideX } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { conversations, currentConversation, currentConversationId, addConversation, setCurrentConversation, deleteConversation } from "@/util/store"
import { useStore } from "@nanostores/react";
import type { Conversation } from "@/util/store";
import { v4 } from "uuid";

export default function SideBar() {

    const $conversations = useStore(conversations);

    const handleNewConversation = () => {
        const newConversation: Conversation = {
            id: v4(),
            title: "Untitled conversation",
            messages: []
        };
        
        // Use the proper action to add conversation
        addConversation(newConversation);
        setCurrentConversation(newConversation.id);
    };

    const handleDeleteConversation = (conversationId: string) => {
        deleteConversation(conversationId);
    };

    const handleSelectConversation = (conversationId: string) => {
        setCurrentConversation(conversationId);
    };

    return (
        <div className="w-64 gap-2 p-2 flex flex-col h-full">
            <div className=" flex place-items-center justify-center rounded-lg">
                <text className="font-bold text-xl flex-1">sharesyllabus ai</text>
                <Button
                    variant="ghost"
                    onClick={(e) => {
                        e.preventDefault();
                        handleNewConversation();
                    }}>
                    <LucidePlus />
                </Button>
            </div>
            

            <div className="p-2 gap-2 border rounded-lg flex text-sm flex-col">
                <text>conversations (locally stored ✨)</text>
                {$conversations.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                        No conversations yet
                    </div>
                ) : (
                    <div className="space-y-1">
                        {[...$conversations].reverse().map((conversation: Conversation) => (
                            <div 
                                key={conversation.id} 
                                className="border flex cursor-pointer hover:bg-gray-100 rounded-md p-2 items-center"
                                onClick={() => handleSelectConversation(conversation.id)}
                            >
                                <button className="truncate cursor-pointer block flex-1 text-left">
                                    {conversation.title || "Untitled conversation"}
                                </button>
                                <motion.button
                                    className="ml-auto flex-shrink-0 cursor-pointer text-gray-300 hover:text-black"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteConversation(conversation.id);
                                    }}
                                >
                                    <LucideX size={16} />
                                </motion.button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div>

            </div>
        </div>
    );
}