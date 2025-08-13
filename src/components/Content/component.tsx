import { CurrentModeRenderer } from "../ModeProvider/component";

export default function Content() {
    return (
        <div className="flex-1 rounded-lg relative overflow-hidden min-h-0 h-full">
            <div className="absolute inset-0 pointer-events-none z-0">
                
            </div>
            <div className="relative z-10 flex flex-col h-full min-h-0">
                <CurrentModeRenderer />
            </div>
        </div>
    );
}

