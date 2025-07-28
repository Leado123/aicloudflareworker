import { useState, createContext, useContext } from "react";
import TopBar from "./topbar";
import Sidebar from "./sidebar";
import Content from "./content";
import DualModeLayout from "./DualModeLayout";
import StoreManager from "./StoreManager";
import type { ModeKey } from "@/util/modes";
import type { BibifySearchResult } from "@/util/bibifyClient";

// Create context for dual mode state
const DualModeContext = createContext<{
  isDualMode: boolean;
  setIsDualMode: (isDual: boolean) => void;
  desiredRightMode: ModeKey | null;
  setDesiredRightMode: (mode: ModeKey | null) => void;
  openDualModeWith: (rightMode: ModeKey) => void;
  openCitationModeWithResults: (results: BibifySearchResult[], query: string) => void;
  citationResults: { results: BibifySearchResult[]; query: string } | null;
}>({
  isDualMode: false,
  setIsDualMode: () => {},
  desiredRightMode: null,
  setDesiredRightMode: () => {},
  openDualModeWith: () => {},
  openCitationModeWithResults: () => {},
  citationResults: null,
});

export const useDualMode = () => useContext(DualModeContext);

export default function MainLayout() {
  const [isDualMode, setIsDualMode] = useState(false);
  const [desiredRightMode, setDesiredRightMode] = useState<ModeKey | null>(null);
  const [citationResults, setCitationResults] = useState<{ results: BibifySearchResult[]; query: string } | null>(null);

  const openDualModeWith = (rightMode: ModeKey) => {
    setDesiredRightMode(rightMode);
    setIsDualMode(true);
  };

  const openCitationModeWithResults = (results: BibifySearchResult[], query: string) => {
    setCitationResults({ results, query });
    setDesiredRightMode('citation');
    setIsDualMode(true);
  };

  return (
    <DualModeContext.Provider value={{ 
      isDualMode, 
      setIsDualMode, 
      desiredRightMode, 
      setDesiredRightMode,
      openDualModeWith,
      openCitationModeWithResults,
      citationResults
    }}>
      <div className="w-full h-full gap-2 flex">
        <Sidebar />
        <div className="flex-1 flex p-2 pl-0.5 gap-2 flex-col min-w-0 transition-all duration-300 ease-in-out">
          <TopBar />
          <StoreManager>
            {isDualMode ? (
              <DualModeLayout 
                onCloseDualMode={() => {
                  setIsDualMode(false);
                  setCitationResults(null); // Clear citation results when closing
                }}
                initialRightMode={desiredRightMode}
                citationResults={citationResults}
              />
            ) : (
              <Content />
            )}
          </StoreManager>
        </div>
      </div>
    </DualModeContext.Provider>
  );
} 