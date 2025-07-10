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
    const [isMouseNearLeft, setIsMouseNearLeft] = useState(false);
    const [previousSidebarState, setPreviousSidebarState] = useState(false); // Store previous state for calculator mode

    // In calculator mode, sidebar should always be in drawer mode
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
            
            // Auto-hide on smaller screens (sidepanel/half-screen mode)
            const shouldAutoHide = width < 1024;
            setIsAutoHidden(shouldAutoHide);
        };

        // Check on mount
        checkWindowSize();
        
        // Listen for resize events
        window.addEventListener('resize', checkWindowSize);
        
        // Mouse proximity detection for left edge - should work when sidebar is hidden
        const handleMouseMove = (e: MouseEvent) => {
            const isNearLeft = e.clientX <= 128; // Within 128px of left edge (half drawer width)
            setIsMouseNearLeft(isNearLeft);
        };

        // Add mouse listener when sidebar is not fully shown
        // This covers: collapsed in full-size mode OR auto-hidden in half-size mode
        if (isCollapsed || isAutoHidden) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        
        // Listen for topbar toggle
        const handleTopbarToggle = () => {
            setIsCollapsed(prev => !prev);
        };
        sidebarToggleListeners.push(handleTopbarToggle);
        
        return () => {
            window.removeEventListener('resize', checkWindowSize);
            window.removeEventListener('mousemove', handleMouseMove);
            // Remove the listener
            sidebarToggleListeners = sidebarToggleListeners.filter(listener => listener !== handleTopbarToggle);
        };
    }, [isCollapsed, isAutoHidden, shouldShowSidebar]); // Update dependencies

    // Handle calculator mode transitions
    useEffect(() => {
        if (isCalculatorMode) {
            // Entering calculator mode - save current state but don't force drawer mode
            setPreviousSidebarState(isCollapsed);
            // Calculator mode can now use both layout and drawer modes
        } else {
            // Exiting calculator mode - restore previous state
            setIsCollapsed(previousSidebarState);
        }
    }, [isCalculatorMode]); // Only run when calculator mode changes

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
            {/* Toggle buttons - always visible and static */}
            <div className="fixed top-2.5 left-2.5 z-50 flex items-center gap-2">
                {shouldShowSidebar ? (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                setIsCollapsed(true);
                                // If mouse is in hover area when collapsing, maintain hover state
                                if (e.clientX <= 128) {
                                    setIsMouseNearLeft(true);
                                }
                            }}
                            className="h-8 w-8 p-0 rounded-full bg-white text-black border hover:bg-gray-100 shadow-sm"
                        >
                            <LucideChevronLeft size={16} />
                        </Button>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border"
                        >
                            Workspace
                        </motion.div>
                    </>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(false)}
                        className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm border shadow-sm rounded-full hover:bg-gray-100"
                    >
                        <LucideMenu size={16} />
                    </Button>
                )}
            </div>

            {/* Ghost sidebar - invisible but affects layout */}
            {!isAutoHidden && (
                <motion.div
                    animate={{
                        width: shouldShowSidebar ? 256 : 0
                    }}
                    transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 40,
                        mass: 0.8
                    }}
                    className="invisible overflow-hidden"
                    style={{ height: "100%" }}
                />
            )}

            {/* Visible floating sidebar - shows in different scenarios */}
            <motion.div
                key="morphing-sidebar"
                animate={{
                    opacity: shouldShowSidebar || isMouseNearLeft ? 1 : 0,
                    x: shouldShowSidebar || isMouseNearLeft ? 0 : -256,
                    height: shouldShowSidebar && !isAutoHidden ? "100vh" : "calc(100vh - 6rem)",
                    top: shouldShowSidebar && !isAutoHidden ? "0" : "3rem"
                }}
                initial={{
                    opacity: shouldShowSidebar ? 1 : 0,
                    x: shouldShowSidebar ? 0 : -256,
                    height: shouldShowSidebar && !isAutoHidden ? "100vh" : "calc(100vh - 6rem)",
                    top: shouldShowSidebar && !isAutoHidden ? "0" : "3rem"
                }}
                transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                    mass: 0.9
                }}
                className="fixed left-0 z-40"
                onMouseLeave={() => {
                    // Only hide on mouse leave if sidebar is not permanently shown
                    if (!shouldShowSidebar) {
                        setIsMouseNearLeft(false);
                    }
                }}
            >
                <motion.div 
                    className="w-64 h-full shadow-sm bg-gray-50 text-gray-300 flex flex-col relative"
                    animate={{
                        borderRadius: shouldShowSidebar && !isAutoHidden ? "0px" : "0px 12px 12px 0px",
                        paddingTop: shouldShowSidebar && !isAutoHidden ? "3rem" : "2.5rem",
                        paddingLeft: "10px",
                        paddingRight: "8px",
                        paddingBottom: "8px",
                    }}
                    initial={{
                        borderRadius: shouldShowSidebar && !isAutoHidden ? "0px" : "0px 12px 12px 0px",
                        paddingTop: shouldShowSidebar && !isAutoHidden ? "3rem" : "2.5rem",
                        paddingLeft: "10px",
                        paddingRight: "8px",
                        paddingBottom: "8px"
                    }}
                    transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 35
                    }}
                >
                    {/* Sidebar title - shows when not in full layout mode */}
                    <div className="pb-2 flex place-items-center rounded-lg">
                        {(!shouldShowSidebar || isAutoHidden) && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ 
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 35,
                                    delay: 0.1
                                }}
                                className="w-full text-center text-sm font-medium text-gray-700 py-1"
                            >
                                Workspace
                            </motion.div>
                        )}
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
                </motion.div>
            </motion.div>
        </div>
    );
}

export default SideBar;