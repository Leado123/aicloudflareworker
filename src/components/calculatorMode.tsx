// Calculator Mode Component - A simple calculator for quick calculations
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import type { ModeComponentProps } from '@/util/modeDefinitions';
import ElementMolarMass from './pubchemmolarmass';

// Simple calculator interface (no entities needed)
interface CalculatorProps extends Omit<ModeComponentProps<any>, 'currentEntity' | 'isEmpty' | 'createEntity' | 'updateEntity'> {
    // Calculator doesn't need entity management
}

export default function CalculatorMode(props: CalculatorProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    function handleIframeLoad() {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        iframeDoc.querySelectorAll('body *:not(#main)').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
    }

    return (
        <div className="flex-1 flex gap-2 h-full">
            <text className="absolute p-2 text-gray-400">thank you desmos!</text>
            <iframe className="w-1/4 border rounded-lg" ref={iframeRef} src="https://www.desmos.com/scientific" onLoad={handleIframeLoad} />
            <div className="flex-1 border rounded-lg p-2 overflow-y-auto h-full">
                <ElementMolarMass/>
                <iframe src="https://pubchem.ncbi.nlm.nih.gov/periodic-table/#view=table&embed=true" className="w-full h-[1000px]"></iframe>
            </div>
        </div>
    );
}
