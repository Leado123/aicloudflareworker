import { LucideMessageCircle, LucidePlus, LucideX, LucideSparkles, LucidePencilRuler } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useModeEntities, useModeSwitcher } from "./ModeProvider";
import type { Conversation, CraftingBench, Document, BaseEntity } from "@/util/modeDefinitions";
import { allModes, type ModeKey } from "@/util/modes";

export default function SideBar() {
    const { currentMode, switchMode } = useModeSwitcher();

    // Get icon for mode
    const getModeIcon = (modeKey: ModeKey) => {
        switch (modeKey) {
            case 'chat':
                return <LucideMessageCircle size={16} />;
            case 'craftingTable':
                return <LucideSparkles size={16} />;
            case 'write':
                return <LucidePencilRuler size={16} />;
            default:
                return <LucideMessageCircle size={16} />;
        }
    };

    // Component for rendering entities of a specific mode
    const ModeEntityList = ({ modeKey }: { modeKey: ModeKey }) => {
        const { 
            entities, 
            createEntity,
            setCurrentEntity,
            deleteEntity 
        } = useModeEntities<BaseEntity>(modeKey);

        const mode = allModes[modeKey];

        const handleNewEntity = () => {
            const newEntityId = createEntity({
                title: mode.defaultEntity().title
            });
            setCurrentEntity(newEntityId);
            switchMode(modeKey);
        };

        const handleSelectEntity = (entityId: string) => {
            setCurrentEntity(entityId);
            switchMode(modeKey);
        };

        const handleDeleteEntity = (entityId: string) => {
            deleteEntity(entityId);
        };

        return (
            <div className="gap-2 rounded-lg flex text-sm flex-col">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getModeIcon(modeKey)}
                        <text className="font-medium">{mode.displayName}</text>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNewEntity();
                        }}
                        className="h-6 w-6 p-0"
                    >
                        <LucidePlus size={14} />
                    </Button>
                </div>
                
                {entities.length === 0 ? (
                    <div className="text-gray-500 text-center py-2 text-xs">
                        No {mode.displayName.toLowerCase()} yet
                    </div>
                ) : (
                    <div className="space-y-1">
                        {[...entities].reverse().map((entity: BaseEntity) => (
                            <div 
                                key={entity.id} 
                                className={`border flex cursor-pointer hover:bg-gray-100 rounded-md p-2 items-center ${
                                    currentMode === modeKey ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                                onClick={() => handleSelectEntity(entity.id)}
                            >
                                <button className="truncate cursor-pointer block flex-1 text-left text-xs">
                                    {entity.title || `Untitled ${mode.displayName.toLowerCase()}`}
                                </button>
                                <motion.button
                                    className="ml-auto flex-shrink-0 cursor-pointer text-gray-300 hover:text-black"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEntity(entity.id);
                                    }}
                                >
                                    <LucideX size={14} />
                                </motion.button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-64 p-2 pt-0 border-r flex flex-col h-full">
            <div className="pb-2 flex place-items-center rounded-lg">
                <h2 className="text-lg font-semibold">Workspace</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
                {Object.keys(allModes).map((modeKey) => (
                    <ModeEntityList key={modeKey} modeKey={modeKey as ModeKey} />
                ))}
            </div>

            <div className="pt-2 border-t">
                <text className="text-xs text-gray-500">
                    All data stored locally ✨
                </text>
            </div>
        </div>
    );
}