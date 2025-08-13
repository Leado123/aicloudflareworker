// Calculator Mode Component - A simple calculator for quick calculations
import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import IframeResizer from "@iframe-resizer/react"
import type { ModeComponentProps } from '@/util/modeDefinitions';
import ElementMolarMass from '../PubchemMolarmass/component';

// Simple calculator interface (no entities needed)
interface CalculatorProps extends Omit<ModeComponentProps<any>, 'currentEntity' | 'isEmpty' | 'createEntity' | 'updateEntity'> {
    // Calculator doesn't need entity management
}

export default function CalcMode(props: CalculatorProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    // Debounce resize events to improve performance
    useEffect(() => {
        let resizeTimer: NodeJS.Timeout;

        const handleResize = () => {
            setIsResizing(true);
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                setIsResizing(false);
            }, 1000);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimer);
        };
    }, []);

    function handleIframeLoad() {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        iframeDoc.querySelectorAll('body *:not(#main)').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
    }

    return (
        <div className="flex-1 h-full">
            <text className="absolute p-2 text-gray-400 z-10">thank you desmos!</text>
            <div
                className={`flex flex-col md:flex-row h-full gap-2 transition-all duration-200 ${isResizing ? 'pointer-events-none' : ''}`}
                style={{
                    // Optimize for performance during transitions
                    willChange: isResizing ? 'transform, width' : 'auto',
                    backfaceVisibility: 'hidden',
                    perspective: 1000
                }}
            >
                {/* Calculator */}
                <div className={`border rounded-lg h-1/2 w-full md:w-1/3 md:h-full md:min-w-[300px] ${isResizing ? 'will-change-auto' : ''}`}>
                    <IframeResizer
                        license='GPLv3'
                        className="w-full h-full rounded-lg"
                        ref={iframeRef}
                        src="https://www.desmos.com/scientific"
                        onLoad={handleIframeLoad}
                        checkOrigin={false}
                        scrolling={false}
                    />
                </div>

                {/* Utilities */}
                <div className={`border rounded-lg p-2 overflow-y-auto flex-1 md:h-full md:min-w-[400px] ${isResizing ? 'will-change-auto' : ''}`}>
                    <ElementMolarMass/>
                    <IframeResizer
                        license='GPLv3'
                        src="https://pubchem.ncbi.nlm.nih.gov/periodic-table/#view=table&embed=true"
                        className="w-full h-[1000px]"
                        checkOrigin={false}
                        scrolling={true}
                    />
                </div>
            </div>
        </div>
    );
}
