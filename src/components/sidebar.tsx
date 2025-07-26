import { LucideMessageCircle, LucidePlus, LucideX, LucideSparkles, LucidePencilRuler, LucideHome, LucideFlag, LucideSettings, LucideMenu, LucideChevronLeft, LucideTrash, LucideSearch, LucideInbox, LucideChevronDown, LucideChevronRight, LucideCalendar, LucideSend, LucideHelpCircle, LucideBookOpen, LucideTable, LucideRss } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useModeEntities, useModeSwitcher } from "./ModeProvider";
import type { Conversation, CraftingBench, Document, BaseEntity } from "@/util/modeDefinitions";
import { allModes, type ModeKey } from "@/util/modes";
import { useState, useEffect, useRef } from "react";

// Create a simple signal for sidebar state
let sidebarToggleListeners: Array<() => void> = [];

export const toggleSidebarFromTopbar = () => {
    sidebarToggleListeners.forEach(listener => listener());
};

interface SidebarSection {
    title: string;
    collapsible: boolean;
    items: SidebarItem[];
    actions?: SidebarAction[];
}

interface SidebarItem {
    id: string;
    title: string;
    icon: string;
    notificationCount?: number;
}

interface SidebarAction {
    id: string;
    title: string;
    icon: string;
}

// Define sidebar position states
type SidebarPosition = "layout" | "floating";

function SideBar() {
    const { currentMode, switchMode } = useModeSwitcher();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [windowWidth, setWindowWidth] = useState(0);
    const [isMouseInBounds, setIsMouseInBounds] = useState(false);
    const [previousSidebarState, setPreviousSidebarState] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Calculate sidebar position based on window size and collapse state
    const isSmallScreen = windowWidth < 1024;
    const sidebarPosition: SidebarPosition = (isSmallScreen || isCollapsed) ? "floating" : "layout";
    const shouldShowSidebar = sidebarPosition === "layout" || isMouseInBounds;

    // In calculator mode, sidebar should always be in drawer mode
    const isCalculatorMode = currentMode === 'calculator';

    // Toggle section collapse
    const toggleSection = (sectionTitle: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionTitle]: !prev[sectionTitle]
        }));
    };

    // Auto-hide function with timeout
    const scheduleAutoHide = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            if (sidebarPosition === "floating") {
                setIsMouseInBounds(false);
            }
        }, 500);
    };

    // Clear auto-hide timeout
    const clearAutoHide = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    // Enhanced mouse leave detection
    const handleMouseLeave = (e: React.MouseEvent) => {
        const rect = sidebarRef.current?.getBoundingClientRect();
        if (rect && e.clientX < rect.left) {
            setIsMouseInBounds(false);
            clearAutoHide();
        } else {
            scheduleAutoHide();
        }
    };

    // Global mouse move handler
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isMouseInBounds && sidebarPosition === "floating") {
            if (e.clientX > 300) {
                setIsMouseInBounds(false);
                clearAutoHide();
            }
        }
    };

    // Check window size and update sidebar position
    useEffect(() => {
        const checkWindowSize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
        };

        checkWindowSize();
        window.addEventListener('resize', checkWindowSize);

        const handleTopbarToggle = () => {
            setIsCollapsed(prev => !prev);
        };
        sidebarToggleListeners.push(handleTopbarToggle);

        return () => {
            window.removeEventListener('resize', checkWindowSize);
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            sidebarToggleListeners = sidebarToggleListeners.filter(listener => listener !== handleTopbarToggle);
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []); // Remove the dependencies that were causing the listener to be recreated

    // Separate useEffect for mouse move handler that needs dependencies
    useEffect(() => {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [isMouseInBounds, sidebarPosition]);

    // Handle calculator mode transitions
    useEffect(() => {
        if (isCalculatorMode) {
            setPreviousSidebarState(isCollapsed);
        } else {
            setIsCollapsed(previousSidebarState);
        }
    }, [isCalculatorMode]);

    // Notify that the component has mounted
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Document-level mouseleave to close sidebar if mouse leaves window
    useEffect(() => {
        const handleMouseLeaveWindow = (e: MouseEvent) => {
            if (!e.relatedTarget && sidebarPosition === "floating") {
                setIsMouseInBounds(false);
                clearAutoHide();
            }
        };
        document.addEventListener('mouseleave', handleMouseLeaveWindow);
        return () => {
            document.removeEventListener('mouseleave', handleMouseLeaveWindow);
        };
    }, [sidebarPosition]);

    // Get icon for different types
    const getIcon = (iconName: string, size: number = 16) => {
        switch (iconName) {
            case 'search':
                return <LucideSearch size={size} />;
            case 'home':
                return <LucideHome size={size} />;
            case 'inbox':
                return <LucideInbox size={size} />;
            case 'document':
                return <LucideBookOpen size={size} />;
            case 'todo-circle':
                return <LucideFlag size={size} />;
            case 'table':
                return <LucideTable size={size} />;
            case 'blog':
                return <LucideRss size={size} />;
            case 'chat':
                return <LucideMessageCircle size={size} />;
            case 'craftingTable':
                return <LucideSparkles size={size} />;
            case 'write':
                return <LucidePencilRuler size={size} />;
            case 'calculator':
                return <LucideSparkles size={size} />;
            case 'plus':
                return <LucidePlus size={size} />;
            case 'templates':
                return <LucideCalendar size={size} />;
            case 'import':
                return <LucideSend size={size} />;
            case 'help':
                return <LucideHelpCircle size={size} />;
            default:
                return <LucideBookOpen size={size} />;
        }
    };

    // Component for rendering entities of a specific mode
    const ModeEntityList = ({ modeKey, title, icon }: { modeKey: ModeKey; title: string; icon: string }) => {
        const {
            entities,
            currentEntity,
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
            <motion.div layout className="space-y-1">
                {entities.length === 0 ? (
                    <motion.button
                        layout
                        onClick={handleNewEntity}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        {getIcon(icon, 16)}
                        <span>New {title}</span>
                    </motion.button>
                ) : (
                    <>
                        {[...entities].reverse().map((entity: BaseEntity) => (
                            <motion.div
                                layout
                                key={entity.id}
                                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer group hover:bg-gray-100 transition-colors ${currentMode === modeKey && currentEntity === entity.id ? 'bg-gray-200' : ''
                                    }`}
                                onClick={() => handleSelectEntity(entity.id)}
                            >
                                {getIcon(icon, 16)}
                                <span className="flex-1 truncate text-gray-900">
                                    {entity.title || `Untitled ${title.toLowerCase()}`}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEntity(entity.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                                >
                                    <LucideTrash size={12} />
                                </button>
                            </motion.div>
                        ))}
                        <motion.button
                            layout
                            onClick={handleNewEntity}
                            className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                            <LucidePlus size={14} />
                            <span>Add new</span>
                        </motion.button>
                    </>
                )}
            </motion.div>
        );
    };

    // Primary Navigation Component
    const PrimaryNavigation = () => (
        <div className="px-2 py-3 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <LucideSearch size={16} />
                <span>Search</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <LucideHome size={16} />
                <span>Home</span>
                <span className="ml-auto bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">New</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <LucideInbox size={16} />
                <span>Inbox</span>
                <span className="ml-auto bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">1</span>
            </button>
        </div>
    );

    // Section Component
    const SidebarSectionComponent = ({ section }: { section: SidebarSection }) => {
        const isCollapsedSection = collapsedSections[section.title];

        return (
            <motion.div layout className="px-2 py-2">
                {section.collapsible ? (
                    <motion.button
                        layout
                        onClick={() => toggleSection(section.title)}
                        className="w-full flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        {isCollapsedSection ? <LucideChevronRight size={12} /> : <LucideChevronDown size={12} />}
                        <span className="uppercase tracking-wide">{section.title}</span>
                    </motion.button>
                ) : (
                    <motion.div layout className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {section.title}
                    </motion.div>
                )}

                <AnimatePresence initial={false}>
                    {(!section.collapsible || !isCollapsedSection) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                            className="overflow-hidden"
                            style={{ willChange: "height, opacity" }}
                        >
                            <motion.div layout className="mt-1 space-y-1">
                                {section.items.map((item) => (
                                    <motion.button
                                        layout
                                        key={item.id}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        {getIcon(item.icon, 16)}
                                        <span className="flex-1 text-left">{item.title}</span>
                                        {item.notificationCount && (
                                            <span className="bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                                                {item.notificationCount}
                                            </span>
                                        )}
                                    </motion.button>
                                ))}
                                {section.actions?.map((action) => (
                                    <motion.button
                                        layout
                                        key={action.id}
                                        className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                                    >
                                        {getIcon(action.icon, 14)}
                                        <span>{action.title}</span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    // Footer Toolbar Component
    const FooterToolbar = () => (
        <div className="px-3 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700">
                        <LucideCalendar size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700">
                        <LucideSend size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700">
                        <LucideHelpCircle size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );

    // Sample data based on the schema
    const sidebarSections: SidebarSection[] = [
        {
            title: "Workspace",
            collapsible: false,
            items: [],
            actions: []
        }
    ];

    // Add mode entities to workspace section
    const workspaceSection = sidebarSections.find(s => s.title === "Workspace");
    if (workspaceSection) {
        workspaceSection.items = Object.keys(allModes)
            .filter(modeKey => modeKey !== 'calculator')
            .map(modeKey => ({
                id: modeKey,
                title: allModes[modeKey as ModeKey].displayName,
                icon: modeKey
            }));
    }

    // Animation variants for different sidebar states
    const sidebarVariants = {
        layout: {
            position: "relative" as const,
            left: 0,
            top: 0,
            height: "100vh",
            width: 256,
            borderRadius: "0px",
            zIndex: 10
        },
        floating: {
            position: "fixed" as const,
            left: shouldShowSidebar ? 0 : -256,
            top: "3rem",
            height: "calc(100vh - 6rem)",
            width: 256,
            borderRadius: "0px 12px 12px 0px",
            zIndex: 40
        }
    };

    return (
        <>
            {/* Sidebar trigger zone for floating mode */}
            {sidebarPosition === "floating" && !shouldShowSidebar && (
                <div
                    className="fixed left-0 z-30"
                    style={{
                        width: 12,
                        height: "100vh",
                        top: "0",
                        backgroundColor: "transparent"
                    }}
                    onMouseEnter={() => {
                        setIsMouseInBounds(true);
                        clearAutoHide();
                    }}
                />
            )}

            {/* Single Sidebar Component with state-based animations */}
            <motion.div
                ref={sidebarRef}
                animate={sidebarVariants[sidebarPosition]}
                initial={sidebarVariants[sidebarPosition]}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                    mass: 0.9
                }}
                onMouseLeave={sidebarPosition === "floating" ? handleMouseLeave : undefined}
                className="overflow-hidden"
                style={{
                    willChange: "transform, width, height, border-radius",
                    opacity: shouldShowSidebar ? 1 : 0
                }}
            >
                <motion.div
                    layout
                    className="w-full h-full shadow-lg border-r bg-white flex flex-col relative"
                    style={{ 
                        willChange: "transform",
                        paddingTop: sidebarPosition === "layout" ? "3rem" : "0"
                    }}
                    onMouseEnter={() => {
                        if (sidebarPosition === "floating") {
                            clearAutoHide();
                        }
                    }}
                    onMouseMove={() => {
                        if (sidebarPosition === "floating") {
                            clearAutoHide();
                        }
                    }}
                >
                    {/* Close button - only visible when in floating mode */}
                    {sidebarPosition === "floating" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-2.5 right-2.5 z-10"
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    setIsCollapsed(true);
                                    if (e.clientX <= 100) {
                                        setIsMouseInBounds(true);
                                    }
                                }}
                                className="h-8 w-8 p-0 rounded-full bg-white text-black border hover:bg-gray-100 shadow-sm"
                            >
                                <LucideChevronLeft size={16} />
                            </Button>
                        </motion.div>
                    )}

                    {/* Primary Navigation */}
                    <PrimaryNavigation />

                    {/* Main Content Sections */}
                    <motion.div layout className="flex-1 overflow-y-auto">
                        {/* Workspace Section with Mode Entities */}
                        <motion.div layout className="px-2 py-2">
                            <motion.div layout className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Workspace
                            </motion.div>
                            <motion.div layout className="mt-1 space-y-3">
                                {Object.keys(allModes)
                                    .filter(modeKey => modeKey !== 'calculator')
                                    .map((modeKey) => (
                                        <ModeEntityList
                                            key={modeKey}
                                            modeKey={modeKey as ModeKey}
                                            title={allModes[modeKey as ModeKey].displayName}
                                            icon={modeKey}
                                        />
                                    ))}
                            </motion.div>
                        </motion.div>

                        {/* Other Sections */}
                        {sidebarSections
                            .filter(section => section.title !== "Workspace")
                            .map((section) => (
                                <SidebarSectionComponent key={section.title} section={section} />
                            ))}
                    </motion.div>

                    {/* Footer Toolbar */}
                    <FooterToolbar />
                </motion.div>
            </motion.div>
        </>
    );
}

export default SideBar;