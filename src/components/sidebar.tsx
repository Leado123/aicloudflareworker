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

// Create a simple signal for sidebar state
let sidebarToggleListeners: Array<() => void> = [];

export const toggleSidebarFromTopbar = () => {
    sidebarToggleListeners.forEach(listener => listener());
};

function SideBar() {
    const { currentMode, switchMode } = useModeSwitcher();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isAutoHidden, setIsAutoHidden] = useState(false);
    const [windowWidth, setWindowWidth] = useState(0);

    // In calculator mode, sidebar should always overlay (never take up layout space)
    const isCalculatorMode = currentMode === 'calculator';
    
    // Determine if sidebar should be shown 
    // On desktop: show unless completely hidden from topbar
    // On mobile: use overlay system
    const shouldShowSidebar = !isAutoHidden && !isCollapsed;

    // Check window size and auto-hide sidebar if needed
    useEffect(() => {
        const checkWindowSize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            
            // In calculator mode, never auto-hide (always use overlay)
            // For other modes, auto-hide on smaller screens
            const shouldAutoHide = !isCalculatorMode && width < 1024;
            setIsAutoHidden(shouldAutoHide);
        };

        // Check on mount
        checkWindowSize();
        
        // Listen for resize events
        window.addEventListener('resize', checkWindowSize);
        
        // Listen for topbar toggle
        const handleTopbarToggle = () => {
            setIsCollapsed(prev => !prev);
        };
        sidebarToggleListeners.push(handleTopbarToggle);
        
        return () => {
            window.removeEventListener('resize', checkWindowSize);
            // Remove the listener
            sidebarToggleListeners = sidebarToggleListeners.filter(listener => listener !== handleTopbarToggle);
        };
    }, [isCalculatorMode]); // Add isCalculatorMode to dependencies

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
            <div className="gap-2 rounded-lg flex text-sm text-slate-600 flex-col">
                <div className="flex items-center justify-between">
                    <div className="flex p-2 items-center text-slate-600 text-xs gap-2">
                        
                        <text className="font-medium ">{mode.displayName}</text>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNewEntity();
                        }}
                        className="h-6 w-6 p-0 hover:text-gray-800"
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
                                className={`flex cursor-pointer gap-2 justify-center hover:bg-gray-200 rounded-md p-2 items-center ${
                                    currentMode === modeKey ? '' : ''
                                }`}
                                onClick={() => handleSelectEntity(entity.id)}
                            >
                                {getModeIcon(modeKey)}
                                <button className="truncate cursor-pointer block flex-1 text-left">
                                    {entity.title || `Untitled ${mode.displayName.toLowerCase()}`}
                                </button>
                                <motion.button
                                    className="ml-auto flex-shrink-0 cursor-pointer  hover:text-gray-700"
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
            {/* Regular sidebar for non-calculator modes */}
            {!isCalculatorMode && (
                <AnimatePresence mode="wait">
                    {shouldShowSidebar && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 256, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ 
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                mass: 0.8
                            }}
                            className="overflow-hidden"
                        >
                            <div className="w-64 bg-slate-50  text-gray-300 fixed p-2.5 pr-2 pb-2 border-r flex flex-col h-full">
                                <div className="pb-2 flex place-items-center rounded-lg">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsCollapsed(!isCollapsed)}
                                        className="h-8 w-8 p-0 rounded-full bg-white text-black border hover:bg-gray-100"
                                    >
                                        <LucideChevronLeft size={16} />
                                    </Button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto  space-y-4">
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
            )}

            {/* Overlay sidebar for calculator mode */}
            {isCalculatorMode && (
                <AnimatePresence>
                    {shouldShowSidebar && (
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
                                transition={{ 
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 35,
                                    mass: 0.9
                                }}
                                className="fixed top-0 left-0 h-full z-50"
                            >
                                <div className="w-64 h-full bg-gray-50 p-2 pt-2 border-r flex flex-col shadow-lg relative">
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
            )}

            {/* Toggle button when sidebar is completely hidden */}
            {isCollapsed && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-2.5 left-2.5 z-20"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(false)}
                        className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm border shadow-sm rounded-full hover:bg-gray-100"
                    >
                        <LucideMenu size={16} />
                    </Button>
                </motion.div>
            )}
        </div>
    );
}

export default SideBar;