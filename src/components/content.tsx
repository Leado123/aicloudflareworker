import { ModeProvider, CurrentModeRenderer } from "./ModeProvider";

export default function Content() {
    return (
        <ModeProvider>
            <div className="flex-1 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-0">
                    
                </div>
                <div className="relative z-10 flex flex-col h-full justify-end">
                    <CurrentModeRenderer />
                </div>
            </div>
        </ModeProvider>
    );
}

