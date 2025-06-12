import { ReactFlow } from "@xyflow/react";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { LucideNotebookPen, LucideWalletCards } from "lucide-react";
import { useRef } from "react";

export default function CraftingTableMode() {
    const fileSourceRef = useRef(null);
    const notesRef = useRef(null);
    const flaschardsRef = useRef(null);

    return (
        <div className="w-full h-full flex-1 grid grid-rows-2">
            <div className="w-full flex place-items-center justify-center gap-4">
                <FilePond></FilePond>
            </div>
            <div className="w-full flex place-items-center justify-center gap-4">
                <div>notesRef</div>
                <div>flashcardsRes</div>
            </div>
        </div>
    )
}