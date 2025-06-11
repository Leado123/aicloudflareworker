import { LucideMessageCircle, LucidePlus, LucideX } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function SideBar() {
    return (
        <div className="w-64 gap-2 p-2 flex flex-col h-full">
            <div className=" flex place-items-center justify-center rounded-lg">
                <text className="font-bold text-xl flex-1">sharesyllabus ai</text>
                <button>
                    <LucidePlus />
                </button>
            </div>
            

            <div className="p-2 gap-2 border rounded-lg flex text-sm flex-col">
                <text>conversations (locally stored ✨)</text>
                <div className="border flex cursor-pointer hover:bg-gray-100 rounded-md p-2 items-center">
                    <button className="truncate cursor-pointer block">
                        a very insightful conversation
                    </button>
                    <motion.button
                        className="ml-auto flex-shrink-0 cursor-pointer text-gray-300 hover:text-black"
                    >
                        <LucideX size={16} />
                    </motion.button>
                </div>
            </div>
            <div>

            </div>
        </div>
    );
}