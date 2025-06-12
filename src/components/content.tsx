import { contentMode } from "@/util/store";
import { useStore } from "@nanostores/react";
import ChatMode from "./chatMode";
import GradientText from "./gradienttext";
import CraftingTableMode from "./craftingTableMode";

export default function Content() {

    const $contentMode = useStore(contentMode);

    return (
        <div className="border flex-1 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none z-0">
                
            </div>
            <div className="relative z-10 flex flex-col h-full justify-end">
                {$contentMode === "chat" && (
                    <ChatMode />
                )}
                {$contentMode === "craftingTable" && (
                    <CraftingTableMode />
                )}
                {$contentMode === "write" && (
                    <div className="p-4">
                        <h1 className="text-xl font-bold">AI Essay Editor</h1>
                        {/* AI Essay Editor component goes here */}
                    </div>
                )}
            </div>
        </div>
    )
}

