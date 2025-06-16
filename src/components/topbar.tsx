import { LucideMessageCircle, LucidePencilRuler, LucideSparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { contentMode } from "@/util/store"
import { useStore } from "@nanostores/react";

export default function TopBar() {

    const $contentMode = useStore(contentMode);

    return (
        <Tabs value={$contentMode as "chat" | "craftingTable" | "write"} onValueChange={(e) => contentMode.set(e as "chat" | "craftingTable" | "write")} defaultValue={contentMode.get()} className="w-full flex place-items-center ">
            <TabsList>
                <TabsTrigger value="chat">
                    <LucideMessageCircle /> AI Chat
                </TabsTrigger>
                <TabsTrigger value="craftingTable">
                    <LucideSparkles /> Crafting Table
                </TabsTrigger>
                <TabsTrigger value="write">
                    <LucidePencilRuler /> AI Essay Editor
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}