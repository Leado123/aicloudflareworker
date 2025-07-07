import { LucideMessageCircle, LucidePlus, LucideX, LucideSparkles, LucidePencilRuler, LucideHome, LucideFlag, LucideSettings, LucideMenu, LucideChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useModeEntities, useModeSwitcher } from "./ModeProvider";
import type { Conversation, CraftingBench, Document, BaseEntity } from "@/util/modeDefinitions";
import { allModes, type ModeKey } from "@/util/modes";
import { useState, useEffect } from "react";

export default function SideBar() {
    const { currentMode, switchMode } = useModeSwitcher();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isAutoHidden, setIsAutoHidden] = useState(false);
    const [windowWidth, setWindowWidth] = useState(0);

    // Check window size and auto-hide sidebar if needed
    useEffect(() => {
        const checkWindowSize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            
            // Auto-hide on smaller screens (sidepanel/half-screen mode)
            const shouldAutoHide = width < 1024; // Adjust this breakpoint as needed
            setIsAutoHidden(shouldAutoHide);
        };

        // Check on mount
        checkWindowSize();
        
        // Listen for resize events
        window.addEventListener('resize', checkWindowSize);
        
        return () => window.removeEventListener('resize', checkWindowSize);
    }, []);

    // Determine if sidebar should be shown
    const shouldShowSidebar = !isAutoHidden && !isCollapsed;

    // Get icon for mode
    const getModeIcon = (modeKey: ModeKey) => {
        switch (modeKey) {
            case 'chat':
                return <LucideMessageCircle size={16} />;
            case 'craftingTable':
                return <LucideSparkles size={16} />;
            case 'write':
                return <LucidePencilRuler size={16} />;
            case 'calculator':
                return <LucideSparkles size={16} />;
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
        <div className="relative">
            <AnimatePresence mode="wait">
                {shouldShowSidebar && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 256, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="w-64 p-2 pt-2 border-r flex flex-col h-full relative">
                            <div className="pb-2 flex place-items-center rounded-lg">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                    <LucideChevronLeft size={16} />
                                </Button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {Object.keys(allModes)
                                    .filter(modeKey => modeKey !== 'calculator') // Exclude calculator since it doesn't use entities
                                    .map((modeKey) => (
                                        <ModeEntityList key={modeKey} modeKey={modeKey as ModeKey} />
                                    ))}
                            </div>

                            <div className="pt-2 border-t">
                                <text className="text-xs text-gray-500">
                                    All data stored locally ✨
                                </text>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle button when sidebar is collapsed on desktop */}
            {!isAutoHidden && isCollapsed && (
                <div className="w-12 p-1 pt-2 flex flex-col h-full">
                    <div className="pb-2 flex place-items-center rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                        >
                            <LucideMenu size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating toggle button when auto-hidden */}
            {isAutoHidden && (
                <div className="fixed top-2 left-2 z-30">
                    <div className="pb-2 flex place-items-center rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="h-8 w-8 p-0 bg-white border shadow-sm rounded-full hover:bg-gray-100"
                        >
                            <LucideMenu size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Overlay sidebar for small screens */}
            <AnimatePresence>
                {isAutoHidden && !isCollapsed && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 z-40"
                            onClick={() => setIsCollapsed(true)}
                        />
                        
                        {/* Sidebar */}
                        <motion.div
                            initial={{ x: -256, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -256, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed top-0 left-0 h-full z-50"
                        >
                            <div className="w-64 h-full bg-white p-2 pt-2 border-r flex flex-col shadow-lg relative">
                                <div className="pb-2 flex place-items-center rounded-lg">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsCollapsed(true)}
                                        className="h-8 w-8 p-0 hover:bg-gray-100"
                                    >
                                        <LucideX size={16} />
                                    </Button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-4">
                                    {Object.keys(allModes)
                                        .filter(modeKey => modeKey !== 'calculator')
                                        .map((modeKey) => (
                                            <ModeEntityList key={modeKey} modeKey={modeKey as ModeKey} />
                                        ))}
                                </div>

                                <div className="pt-2 border-t">
                                    <text className="text-xs text-gray-500">
                                        All data stored locally ✨
                                    </text>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}