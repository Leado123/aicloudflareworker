import React, { useState, createContext, useContext, useEffect } from "react";
import TopBar from "./Topbar/component";
import Sidebar from "./Sidebar/component";
import DualModeLayout from "./DualModeLayout/component";
import StoreManager from "./StoreManager/component";
import { ModeProvider } from "./ModeProvider/component";
import { motion } from "framer-motion";
import type { ModeKey } from "@/util/modes";
import type { BibifySearchResult } from "@/util/bibifyClient";

// Create context for dual mode state
const DualModeContext = createContext<{
  isDualMode: boolean;
  setIsDualMode: (isDual: boolean) => void;
  desiredRightMode: ModeKey | null;
  setDesiredRightMode: (mode: ModeKey | null) => void;
  openDualModeWith: (rightMode: ModeKey) => void;
  openCitationModeWithResults: (
    results: BibifySearchResult[],
    query: string,
  ) => void;
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

export const useDualMode = () => {
  const ctx = useContext(DualModeContext);
  if (!ctx) throw new Error("useDualMode must be used within MainLayout");
  return ctx;
};

export default function MainLayout() {
  const [isDualMode, setIsDualMode] = useState(false);
  const [desiredRightMode, setDesiredRightMode] = useState<ModeKey | null>(
    null,
  );
  const [citationResults, setCitationResults] = useState<{
    results: BibifySearchResult[];
    query: string;
  } | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Track window size and sidebar state for layout calculations
  useEffect(() => {
    const checkWindowSize = () => {
      setWindowWidth(window.innerWidth);
    };

    checkWindowSize();
    window.addEventListener("resize", checkWindowSize);

    // Listen for sidebar state changes
    const handleSidebarToggle = () => {
      setSidebarCollapsed((prev) => !prev);
    };

    // Access the sidebar toggle listeners (we'll add this to the sidebar component)
    (window as unknown as Record<string, unknown>).sidebarStateListeners =
      (window as unknown as Record<string, unknown>).sidebarStateListeners ||
      [];
    (
      (window as unknown as Record<string, unknown>)
        .sidebarStateListeners as Array<() => void>
    ).push(handleSidebarToggle);

    return () => {
      window.removeEventListener("resize", checkWindowSize);
      if (
        (window as unknown as Record<string, unknown>).sidebarStateListeners
      ) {
        (window as unknown as Record<string, unknown>).sidebarStateListeners = (
          (window as unknown as Record<string, unknown>)
            .sidebarStateListeners as Array<() => void>
        ).filter((listener) => listener !== handleSidebarToggle);
      }
    };
  }, []);

  // Calculate content margin based on sidebar state
  const isSmallScreen = windowWidth < 1024;
  const sidebarPosition =
    isSmallScreen || sidebarCollapsed ? "floating" : "layout";
  const contentMarginLeft = sidebarPosition === "layout" ? "256px" : "0px";

  const openDualModeWith = (rightMode: ModeKey) => {
    setDesiredRightMode(rightMode);
    setIsDualMode(true);
  };

  const openCitationModeWithResults = (
    results: BibifySearchResult[],
    query: string,
  ) => {
    setCitationResults({ results, query });
    setDesiredRightMode("citation");
    setIsDualMode(true);
  };

  return (
    <DualModeContext.Provider
      value={{
        isDualMode,
        setIsDualMode,
        desiredRightMode,
        setDesiredRightMode,
        openDualModeWith,
        openCitationModeWithResults,
        citationResults,
      }}
    >
      <div className="w-full h-full gap-2 flex">
        {/* Animated layout spacer for the sidebar (contracts to 0 in hover mode) */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ width: sidebarPosition === "layout" ? 256 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.9 }}
          className="shrink-0"
        />
        {/* Always-floating, non-layout Sidebar */}
        <Sidebar />
        <div
          className="flex-1 flex p-2 pl-0.5 gap-2 flex-col min-w-0 min-h-0 transition-all duration-300 ease-out"
        >
          <TopBar />
          <StoreManager>
            <ModeProvider>
              <DualModeLayout
                onCloseDualMode={() => {
                  setIsDualMode(false);
                  setCitationResults(null);
                }}
                initialRightMode={desiredRightMode}
                citationResults={citationResults}
                isActive={isDualMode}
              />
            </ModeProvider>
          </StoreManager>
        </div>
      </div>
    </DualModeContext.Provider>
  );
}
