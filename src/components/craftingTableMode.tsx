import { FilePond } from "react-filepond";
import "node_modules/filepond/dist/filepond.css";
import { LucideCopy, LucideNotebookPen, LucideThumbsDown, LucideThumbsUp, LucideWalletCards, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { ReactFlow } from "@xyflow/react"
import { FileDropZone } from "./ui/filedrop";
import XArrow from "react-xarrows";
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import TipTapEditor from './tiptapeditor';
import GradientText from "./gradienttext";
import { Separator } from "./ui/separator";
import { useStore } from "@nanostores/react";
import {
    currentCraftingBench,
    createNewCraftingBench,
    updateCraftingBench,
    removeFileFromCraftingBench,
    addFilesToCraftingBenchWithData,
    craftingBenchEmpty,
    saveNotesToCraftingBench,
    saveFlashcardsToCraftingBench,
    craftingBenches,
    type FlashCard
} from "../util/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Label } from "./ui/label";
import Markdown from "react-markdown";

export const CRAFTING_OPTIONS = {
    NOTES: "notes",
    FLASHCARDS: "flashcards",
} as const

export enum craftingBenchAction {
    MAKENOTES = "MAKENOTES",
    MAKEFLASHCARDS = "MAKEFLASHCARDS",
}

// Type definitions for API responses
interface CraftingBenchAPIResponse {
    success: boolean;
    data?: {
        text: string;
        [key: string]: any;
    };
    error?: string;
}

interface APIErrorResponse {
    error: string;
}

// Helper function to call the crafting bench API
async function callCraftingBenchAPI(action: craftingBenchAction, files: File[], extraCommands: string = ""): Promise<CraftingBenchAPIResponse> {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('extraCommands', extraCommands);

    files.forEach(file => {
        formData.append('files', file);
    });

    const response = await fetch('/api/craftingBench', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json() as APIErrorResponse;
        throw new Error(errorData.error || 'Failed to process files');
    }

    return await response.json() as CraftingBenchAPIResponse;
}

// Helper function to parse flashcards text into FlashCard objects
function parseFlashcardsText(text: string): FlashCard[] {
    const flashcards: FlashCard[] = [];

    // Split by double newlines or patterns that indicate separate cards
    const cardSections = text.split(/\n\s*\n/);

    for (const section of cardSections) {
        // Try to match Q: ... A: ... pattern
        const qMatch = section.match(/(?:\*\*)?Q(?:uestion)?(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);
        const aMatch = section.match(/(?:\*\*)?A(?:nswer)?(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);

        if (qMatch && aMatch) {
            flashcards.push({
                id: crypto.randomUUID(),
                front: qMatch[1].trim(),
                back: aMatch[1].trim()
            });
        } else {
            // Try to match front/back pattern
            const frontMatch = section.match(/(?:\*\*)?(?:Front|Question)(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);
            const backMatch = section.match(/(?:\*\*)?(?:Back|Answer)(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);

            if (frontMatch && backMatch) {
                flashcards.push({
                    id: crypto.randomUUID(),
                    front: frontMatch[1].trim(),
                    back: backMatch[1].trim()
                });
            } else {
                // Try simple line-by-line parsing (odd lines = front, even lines = back)
                const lines = section.split('\n').filter(line => line.trim());
                for (let i = 0; i < lines.length - 1; i += 2) {
                    if (lines[i] && lines[i + 1]) {
                        flashcards.push({
                            id: crypto.randomUUID(),
                            front: lines[i].trim(),
                            back: lines[i + 1].trim()
                        });
                    }
                }
            }
        }
    }

    return flashcards;
}

export default function CraftingTableMode() {
    const fileSourceRef = useRef(null);
    const notesRef = useRef(null);
    const flashcardsRef = useRef(null);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [notesContent, setNotesContent] = useState<string>("");
    const [flashcardsContent, setFlashcardsContent] = useState<string>("");
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);

    const bench = useStore(currentCraftingBench);
    const isEmpty = useStore(craftingBenchEmpty);

    const [craftingType, setCraftingType] = useState<keyof typeof CRAFTING_OPTIONS>("NOTES");

    // Create a new crafting bench if none exists
    useEffect(() => {
        if (!bench) {
            createNewCraftingBench("Study Session");
        }
    }, [bench]);

    // Load existing notes and flashcards when bench changes
    useEffect(() => {
        if (bench) {
            console.log("Loading content from bench:", {
                benchId: bench.id,
                notesLength: bench.notes?.length || 0,
                flashcardsCount: bench.flashcards?.length || 0
            });
            setNotesContent(bench.notes || "");
            // For flashcards, we'll format them as text for now
            if (bench.flashcards && bench.flashcards.length > 0) {
                const flashcardsText = bench.flashcards.map(card =>
                    `**Q:** ${card.front}\n**A:** ${card.back}\n`
                ).join('\n');
                setFlashcardsContent(flashcardsText);
            } else {
                setFlashcardsContent("");
            }
        }
    }, [bench, bench?.notes, bench?.flashcards]); // Watch for changes in notes and flashcards specifically

    // Remove auto-regeneration when switching tabs - user can manually regenerate if needed

    const onFilesSelected = async (files: File[]) => {
        console.log("Selected files:", files);
        if (bench && files.length > 0) {
            setIsProcessingFiles(true);
            try {
                // Use the new async function to add files with data
                await addFilesToCraftingBenchWithData(bench.id, files);
                console.log("Files processed and saved successfully");

                // Generate content using API
                setIsGeneratingContent(true);
                const actionType = craftingType === "NOTES" ? craftingBenchAction.MAKENOTES : craftingBenchAction.MAKEFLASHCARDS;

                const result = await callCraftingBenchAPI(actionType, files, "");

                if (result.success && result.data) {
                    const generatedText = result.data.text || "";
                    console.log("Generated content:", {
                        type: craftingType,
                        contentLength: generatedText.length,
                        benchId: bench.id
                    });

                    if (craftingType === "NOTES") {
                        // Update local state immediately
                        setNotesContent(generatedText);
                        // Save to store
                        saveNotesToCraftingBench(bench.id, generatedText);
                        console.log("Updated notes content in state and store");
                    } else {
                        // Parse flashcards text and save as FlashCard objects
                        const parsedFlashcards = parseFlashcardsText(generatedText);
                        // Update local state immediately
                        setFlashcardsContent(generatedText);
                        // Save to store
                        saveFlashcardsToCraftingBench(bench.id, parsedFlashcards);
                        console.log(`Parsed ${parsedFlashcards.length} flashcards from generated text`);
                        console.log("Updated flashcards content in state and store");
                    }
                    console.log("Content generated successfully");
                } else {
                    console.error("Error generating content:", result.error);
                }

            } catch (error) {
                console.error("Error processing files:", error);
            } finally {
                setIsProcessingFiles(false);
                setIsGeneratingContent(false);
            }
        }

    }

    const removeFile = async (fileIndex: number) => {
        if (bench) {
            // Remove file from local store first
            removeFileFromCraftingBench(bench.id, fileIndex);

            // If there are remaining files, regenerate content
            const updatedBench = craftingBenches.get().find(b => b.id === bench.id);
            if (updatedBench && updatedBench.files.length > 0) {
                try {
                    setIsGeneratingContent(true);
                    const actionType = craftingType === "NOTES" ? craftingBenchAction.MAKENOTES : craftingBenchAction.MAKEFLASHCARDS;

                    const result = await callCraftingBenchAPI(actionType, updatedBench.files, "");

                    if (result.success && result.data) {
                        const generatedText = result.data.text || "";
                        if (craftingType === "NOTES") {
                            // Update local state immediately
                            setNotesContent(generatedText);
                            // Save to store
                            saveNotesToCraftingBench(bench.id, generatedText);
                        } else {
                            // Parse and save flashcards
                            const parsedFlashcards = parseFlashcardsText(generatedText);
                            // Update local state immediately
                            setFlashcardsContent(generatedText);
                            // Save to store
                            saveFlashcardsToCraftingBench(bench.id, parsedFlashcards);
                        }
                        console.log("Content regenerated after file removal");
                    }
                } catch (error) {
                    console.error("Error regenerating content after file removal:", error);
                } finally {
                    setIsGeneratingContent(false);
                }
            } else {
                // No files left, clear content
                if (craftingType === "NOTES") {
                    setNotesContent("");
                    saveNotesToCraftingBench(bench.id, "");
                } else {
                    setFlashcardsContent("");
                    saveFlashcardsToCraftingBench(bench.id, []);
                }
            }
        }
    }

    const regenerateContent = async () => {
        if (bench && bench.files.length > 0) {
            setIsGeneratingContent(true);
            try {
                const actionType = craftingType === "NOTES" ? craftingBenchAction.MAKENOTES : craftingBenchAction.MAKEFLASHCARDS;

                // Use the existing runtime files directly
                const files = bench.files;

                const result = await callCraftingBenchAPI(actionType, files, "");

                if (result.success && result.data) {
                    const generatedText = result.data.text || "";
                    if (craftingType === "NOTES") {
                        // Update local state immediately
                        setNotesContent(generatedText);
                        // Save to store
                        saveNotesToCraftingBench(bench.id, generatedText);
                    } else {
                        // Parse and save flashcards as FlashCard objects
                        const parsedFlashcards = parseFlashcardsText(generatedText);
                        // Update local state immediately
                        setFlashcardsContent(generatedText);
                        // Save to store
                        saveFlashcardsToCraftingBench(bench.id, parsedFlashcards);
                    }
                    console.log("Content regenerated successfully");
                } else {
                    console.error("Error generating content:", result.error);
                }
            } catch (error) {
                console.error("Error regenerating content:", error);
            } finally {
                setIsGeneratingContent(false);
            }
        }
    }

    return (
        <div className="w-full h-full flex-1 p-2 gap-4 flex">
            <div className="w-1/3 p-2 gap-4 text-left border-r pr-4 flex flex-col">
                <text className="text-lg">Upload lecture notes, lecture powerpoints, textbook chapters, etc. We'll make the notes and flaschards for you</text>
                <FileDropZone
                    onFilesSelected={onFilesSelected}
                    maxFiles={5}
                    acceptedFileTypes={[".pdf", ".docx", ".txt", ".md", ".pptx"]}
                />

                {isProcessingFiles && (
                    <div className="text-sm text-blue-600 animate-pulse">
                        Processing files... This may take a moment for large files.
                    </div>
                )}

                {isGeneratingContent && (
                    <div className="text-sm text-purple-600 animate-pulse">
                        Generating content... This may take a moment.
                    </div>
                )}

                {/* Display current files */}
                {bench && bench.files.length > 0 && (
                    <div className="mt-4">
                        <h3 className="font-semibold mb-2">Uploaded Files:</h3>
                        <div className="space-y-2">
                            {bench.files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded group">
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm truncate font-medium">{file.name}</span>
                                        <span className="text-xs text-green-600">
                                            {(file.size / 1024).toFixed(1)} KB • Ready
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Separator className="my-4" />
                { }
            </div>
            <Tabs
                value={craftingType}
                onValueChange={(e) => setCraftingType(e as keyof typeof CRAFTING_OPTIONS)}
                defaultValue="NOTES"
                className="w-2/3 flex flex-col h-full"
            >
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="NOTES" className="text-green-600">
                            <LucideNotebookPen /> Notes
                        </TabsTrigger>
                        <TabsTrigger value="FLASHCARDS" className="text-purple-600">
                            <LucideWalletCards /> Flashcards
                        </TabsTrigger>
                    </TabsList>

                    {bench && bench.files.length > 0 && (
                        <div className="flex gap-2 place-items-center">
                            <Button variant="outline" size="icon"><LucideThumbsUp></LucideThumbsUp></Button>
                            <Button variant="outline" size="icon"><LucideThumbsDown></LucideThumbsDown></Button>
                            <Button variant="outline" size="icon"><LucideCopy/></Button>
                            <Button 
                                onClick={regenerateContent}
                                disabled={isGeneratingContent}
                                variant="outline"
                                size="sm"
                            >
                                {isGeneratingContent ? "Generating..." : "Regenerate"}
                            </Button>
                        </div>
                    )}
                </div>

                <TabsContent value="NOTES" className="flex-1 border rounded-lg overflow-y-auto overflow-x-clip">

                    {notesContent ? (
                        <TipTapEditor
                            content={notesContent}
                            onUpdate={(content) => {
                                setNotesContent(content.editor.getHTML());
                                if (bench?.id) {
                                    saveNotesToCraftingBench(bench.id, content.editor.getHTML());
                                }
                            }}
                        />
                    ) : (
                        <div className="text-gray-500 text-center py-8">
                            Upload files and we'll generate notes for you
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="FLASHCARDS" className="flex-1">
                    <Card className="h-full">
                        <CardContent className="p-6 h-full overflow-y-auto">
                            {flashcardsContent ? (
                                <div className="space-y-4">
                                    {bench?.flashcards && bench.flashcards.length > 0 && (
                                        <div className="text-sm text-gray-600 mb-4">
                                            Generated {bench.flashcards.length} flashcard{bench.flashcards.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    <Markdown>
                                        {flashcardsContent}
                                    </Markdown>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center py-8">
                                    Upload files and we'll generate flashcards for you
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}