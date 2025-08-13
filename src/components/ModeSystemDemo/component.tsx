// Simple demo to test the unified mode system
import React from 'react';
import type { ModeComponentProps, BaseEntity } from '@/util/modeDefinitions';
import { UniversalModeComponent, EntityListSidebar, StatusFooter } from '../UniversalModeComponent/component';
import { ModeProvider, useModeSwitcher } from '../ModeProvider/component';

interface DemoComponentProps<T extends BaseEntity> extends ModeComponentProps<T> {}

function ModeDemo() {
    const { currentMode, switchMode, availableModes } = useModeSwitcher();

    return (
        <div className="h-screen flex flex-col">
            <div className="p-4 border-b bg-gray-50">
                <h1 className="text-xl font-bold mb-2">Unified Mode System Demo</h1>
                <div className="flex gap-2">
                    {availableModes.map(mode => (
                        <button
                            key={mode}
                            onClick={() => switchMode(mode)}
                            className={`px-3 py-1 rounded ${
                                currentMode === mode 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1">
                <UniversalModeComponent
                    renderSidebar={(props) => <EntityListSidebar {...props} />}
                    renderFooter={(props) => <StatusFooter {...props} />}
                />
            </div>
        </div>
    );
}

export default function ModeSystemDemo() {
    return (
        <ModeProvider>
            <ModeDemo />
        </ModeProvider>
    );
}
