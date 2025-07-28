import { useState, useEffect, useRef } from "react";
import { useModeSwitcher, useModeEntities } from "./ModeProvider";
import { allModes, type ModeKey } from "@/util/modes";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { LucideX, LucideChevronRight, LucideMessageCircle, LucideSparkles, LucidePencilRuler, LucideCalculator, LucideBookOpen, LucideGripVertical } from "lucide-react";
import Content from "./content";
import type { BibifySearchResult } from "@/util/bibifyClient";

interface DualModeLayoutProps {
  onCloseDualMode: () => void;
  initialRightMode?: ModeKey | null;
  citationResults?: { results: BibifySearchResult[]; query: string } | null;
}

export default function DualModeLayout({ onCloseDualMode, initialRightMode, citationResults }: DualModeLayoutProps) {
  // Fix: Change variable name to avoid conflict
  const { currentMode: leftMode } = useModeSwitcher();
  const [selectedRightMode, setSelectedRightMode] = useState<ModeKey>(initialRightMode || 'write');
  const [leftWidth, setLeftWidth] = useState(50); // Percentage width for left panel
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set the initial right mode when it changes
  useEffect(() => {
    if (initialRightMode) {
      console.log("DualModeLayout: Setting right mode to", initialRightMode);
      if (initialRightMode === 'citation' && citationResults) {
        console.log("DualModeLayout: Citation results provided", citationResults);
      }
      setSelectedRightMode(initialRightMode);
    }
  }, [initialRightMode, citationResults]);

  // Update selected right mode when initialRightMode changes
  useEffect(() => {
    if (initialRightMode) {
      setSelectedRightMode(initialRightMode);
    }
  }, [initialRightMode]);

  // Handle mouse events for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain between 20% and 80%
    const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
    setLeftWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Get all mode props to avoid conditional hook calls
  const chatModeProps = useModeEntities('chat');
  const craftingTableModeProps = useModeEntities('craftingTable');
  const writeModeProps = useModeEntities('write');
  const calculatorModeProps = useModeEntities('calculator');
  const citationModeProps = useModeEntities('citation');

  // Get the right mode component and props if selected
  const RightModeComponent = selectedRightMode ? allModes[selectedRightMode].component : null;
  const rightModeProps = selectedRightMode ? {
    'chat': chatModeProps,
    'craftingTable': craftingTableModeProps,
    'write': writeModeProps,
    'calculator': calculatorModeProps,
    'citation': citationModeProps,
  }[selectedRightMode] : null;

  const getModeIcon = (modeKey: ModeKey) => {
    const iconClass = "w-6 h-6";
    switch (modeKey) {
      case 'chat':
        return <LucideMessageCircle className={iconClass} />;
      case 'craftingTable':
        return <LucideSparkles className={iconClass} />;
      case 'write':
        return <LucidePencilRuler className={iconClass} />;
      case 'calculator':
        return <LucideCalculator className={iconClass} />;
      case 'citation':
        return <LucideBookOpen className={iconClass} />;
      default:
        return <LucideMessageCircle className={iconClass} />;
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full flex gap-2">
      {/* Left side - Current mode */}
      <div 
        className="bg-white rounded-lg border border-gray-200 flex flex-col shadow-sm"
        style={{ width: `${leftWidth}%` }}
      >
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b border-blue-200 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500 rounded-md">
              {(() => {
                const Icon = getModeIcon(leftMode);
                return <div className="w-4 h-4 text-white">{Icon}</div>;
              })()}
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">
                {allModes[leftMode].displayName}
              </h3>
              <p className="text-xs text-blue-600">Primary workspace</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseDualMode}
            className="text-blue-700 hover:text-blue-900 hover:bg-blue-200 h-8 px-3"
          >
            <LucideX className="w-4 h-4 mr-1" />
            <span className="text-xs">Exit Dual Mode</span>
          </Button>
        </div>
        <div className="flex-1 rounded-b-lg overflow-hidden">
          <Content />
        </div>
      </div>

      {/* Resizable divider */}
      <div
        className={`w-2 flex items-center justify-center cursor-col-resize group hover:bg-gray-300 transition-all ${
          isDragging ? 'bg-gray-400 shadow-md' : 'bg-gray-200'
        } rounded-md`}
        onMouseDown={handleMouseDown}
      >
        <LucideGripVertical className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
      </div>

      {/* Right side - Mode selection or selected mode */}
      <div 
        className="bg-white rounded-lg border border-gray-200 flex flex-col shadow-sm"
        style={{ width: `${100 - leftWidth - 1}%` }} // Subtract 1% for divider space
      >
        {selectedRightMode && RightModeComponent && rightModeProps ? (
          // Show selected mode
          <>
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 border-b border-emerald-200 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-500 rounded-md">
                  {(() => {
                    const Icon = getModeIcon(selectedRightMode);
                    return <div className="w-4 h-4 text-white">{Icon}</div>;
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-900 text-sm">
                    {allModes[selectedRightMode].displayName}
                  </h3>
                  <p className="text-xs text-emerald-600">Secondary panel</p>
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-b-lg overflow-hidden">
              {selectedRightMode === 'citation' ? (
                <RightModeComponent 
                  {...rightModeProps} 
                  preloadedResults={citationResults}
                />
              ) : (
                <RightModeComponent {...rightModeProps} />
              )}
            </div>
          </>
        ) : (
          // Show mode selection panel
          <div className="h-full p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <LucideChevronRight className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2 text-gray-800">Choose Right Panel</h2>
                <p className="text-gray-600 text-sm">
                  Select a mode to display alongside your current {allModes[leftMode].displayName.toLowerCase()} session
                </p>
              </div>
              
              <div className="space-y-2">
                {Object.entries(allModes)
                  .filter(([key]) => key !== leftMode) // Don't show current mode
                  .map(([key, mode]) => (
                    <Card 
                      key={key}
                      className="cursor-pointer hover:shadow-lg transition-all hover:border-gray-300 hover:scale-[1.02] border-gray-200 bg-white"
                      onClick={() => setSelectedRightMode(key as ModeKey)}
                    >
                      <CardHeader className="pb-3 pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {getModeIcon(key as ModeKey)}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-medium">{mode.displayName}</CardTitle>
                              <CardDescription className="text-xs">
                                {key === 'chat' && 'AI conversations and assistance'}
                                {key === 'craftingTable' && 'Study materials and flashcards'}
                                {key === 'write' && 'Document editing and writing'}
                                {key === 'calculator' && 'Advanced calculations'}
                                {key === 'citation' && 'Academic sources and references'}
                              </CardDescription>
                            </div>
                          </div>
                          <LucideChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
              </div>

              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={onCloseDualMode}
                  size="sm"
                  className="text-gray-600 hover:bg-gray-100"
                >
                  Back to Single Mode
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 