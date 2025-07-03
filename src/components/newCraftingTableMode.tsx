// Updated Crafting Table Mode using unified system and markdown.tsx
import React, { useState, useRef } from "react";
import { LucideCopy, LucideNotebookPen, LucideThumbsDown, LucideThumbsUp, LucideWalletCards, X } from "lucide-react";
import { FileDropZone } from "./ui/filedrop";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import DefaultMarkdown from './markdown';
import { Separator } from "./ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { ModeComponentProps, type CraftingBench, type FlashCard } from "../util/modeDefinitions";
import { fileToStoredData } from "../util/modeDefinitions";

export const CRAFTING_OPTIONS = {
    NOTES: "notes",
    FLASHCARDS: "flashcards",
} as const;

export enum craftingBenchAction {
    MAKENOTES = "MAKENOTES",
    MAKEFLASHCARDS = "MAKEFLASHCARDS",
}

// Helper function to clean markdown code blocks from streamed content
function cleanMarkdownWrapper(text: string): string {
    // Remove opening markdown code block
    text = text.replace(/^```markdown\s*\n?/i, '');
    // Remove closing markdown code block (but only if it's at the end)
    text = text.replace(/\n?\s*```\s*$/i, '');
    return text.trim();
}

// Helper function for streaming API calls
async function callCraftingBenchAPIStream(
    action: craftingBenchAction, 
    files: File[], 
    extraCommands: string = "",
    onTextUpdate: (text: string) => void
): Promise<void> {
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
        throw new Error('Failed to process files');
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let accumulatedText = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            
            // Clean the accumulated text and call the update function
            const cleanedText = cleanMarkdownWrapper(accumulatedText);
            onTextUpdate(cleanedText);
        }
    } finally {
        reader.releaseLock();
    }
}

// Helper function to parse flashcards text into FlashCard objects
function parseFlashcardsText(text: string): FlashCard[] {
    const flashcards: FlashCard[] = [];
    const cardSections = text.split(/\n\s*\n/);

    for (const section of cardSections) {
        const qMatch = section.match(/(?:\*\*)?Q(?:uestion)?(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);
        const aMatch = section.match(/(?:\*\*)?A(?:nswer)?(?:\*\*)?:?\s*(.+?)(?:\n|$)/i);

        if (qMatch && aMatch) {
            flashcards.push({
                id: crypto.randomUUID(),
                front: qMatch[1].trim(),
                back: aMatch[1].trim()
            });
        }
    }

    return flashcards;
}

export default function CraftingTableMode({
    entities: allBenches,
    currentEntity: bench,
    isEmpty,
    createEntity: createBench,
    updateEntity: updateBench,
    deleteEntity: deleteBench,
    setCurrentEntity: setCurrentBench
}: ModeComponentProps<CraftingBench>) {
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);
    const [isStreamingNotes, setIsStreamingNotes] = useState(false);
    const [craftingType, setCraftingType] = useState<keyof typeof CRAFTING_OPTIONS>("NOTES");

    // Create a new crafting bench if none exists
    React.useEffect(() => {
        if (!bench) {
            createBench({ title: "New Study Session" });
        }
    }, [bench, createBench]);

    const onFilesSelected = async (files: File[]) => {
        if (!bench) return;

        setIsProcessingFiles(true);
        try {
            // Convert files to stored data
            const storedDataPromises = files.map(file => fileToStoredData(file));
            const newStoredFiles = await Promise.all(storedDataPromises);
            
            // Update with new files
            const updatedFiles = [...bench.files, ...files];
            const updatedStoredFiles = [...bench.storedFiles, ...newStoredFiles];
            
            // Update bench title if it's still default
            const firstFileName = files[0].name.replace(/\.[^/.]+$/, "");
            const newTitle = files.length === 1 
                ? `Study: ${firstFileName}` 
                : `Study: ${firstFileName} +${files.length - 1} more`;
            
            updateBench(bench.id, {
                files: updatedFiles,
                storedFiles: updatedStoredFiles,
                title: bench.title === "New Study Session" ? newTitle : bench.title
            });

            // Generate content using streaming
            setIsGeneratingContent(true);
            const actionType = craftingType === "NOTES" ? craftingBenchAction.MAKENOTES : craftingBenchAction.MAKEFLASHCARDS;

            if (craftingType === "NOTES") {
                setIsStreamingNotes(true);
                let finalContent = "";
                
                try {
                    await callCraftingBenchAPIStream(actionType, files, "", (streamedText) => {
                        finalContent = streamedText;
                        // Update notes in real-time during streaming
                        updateBench(bench.id, { notes: streamedText });
                    });
                    
                    // Final save with timestamp
                    updateBench(bench.id, { 
                        notes: finalContent,
                        lastNotesUpdate: new Date()
                    });
                } catch (error) {
                    console.error("Error streaming notes:", error);
                    updateBench(bench.id, { 
                        notes: `Error generating notes: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                } finally {
                    setIsStreamingNotes(false);
                }
            } else {
                // For flashcards, use complete response
                let finalContent = "";
                await callCraftingBenchAPIStream(actionType, files, "", (text) => {
                    finalContent = text;
                });
                
                const flashcards = parseFlashcardsText(finalContent);
                updateBench(bench.id, { 
                    flashcards,
                    lastFlashcardsUpdate: new Date()
                });
            }
        } catch (error) {
            console.error("Error processing files:", error);
        } finally {
            setIsProcessingFiles(false);
            setIsGeneratingContent(false);
        }
    };

    const removeFile = (fileIndex: number) => {
        if (!bench) return;
        
        const updatedFiles = bench.files.filter((_, index) => index !== fileIndex);
        const updatedStoredFiles = bench.storedFiles.filter((_, index) => index !== fileIndex);
        
        updateBench(bench.id, { 
            files: updatedFiles,
            storedFiles: updatedStoredFiles
        });

        // Clear content if no files left
        if (updatedFiles.length === 0) {
            updateBench(bench.id, { 
                notes: "",
                flashcards: []
            });
        }
    };

    const regenerateContent = async () => {
        if (!bench || bench.files.length === 0) return;

        setIsGeneratingContent(true);
        const actionType = craftingType === "NOTES" ? craftingBenchAction.MAKENOTES : craftingBenchAction.MAKEFLASHCARDS;

        try {
            if (craftingType === "NOTES") {
                setIsStreamingNotes(true);
                let finalContent = "";
                
                await callCraftingBenchAPIStream(actionType, bench.files, "", (streamedText) => {
                    finalContent = streamedText;
                    updateBench(bench.id, { notes: streamedText });
                });
                
                updateBench(bench.id, { 
                    notes: finalContent,
                    lastNotesUpdate: new Date()
                });
            } else {
                let finalContent = "";
                await callCraftingBenchAPIStream(actionType, bench.files, "", (text) => {
                    finalContent = text;
                });
                
                const flashcards = parseFlashcardsText(finalContent);
                updateBench(bench.id, { 
                    flashcards,
                    lastFlashcardsUpdate: new Date()
                });
            }
        } catch (error) {
            console.error("Error regenerating content:", error);
        } finally {
            setIsGeneratingContent(false);
            setIsStreamingNotes(false);
        }
    };

    return (
        <div className="w-full h-full flex-1 p-2 gap-4 flex">
            {/* Left Panel - File Upload */}
            <div className="w-1/3 p-2 gap-4 text-left border-r pr-4 flex flex-col">
                <text className="text-lg">Upload lecture notes, powerpoints, textbook chapters, etc. We'll make the notes and flashcards for you</text>
                
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
                        {isStreamingNotes ? "Streaming notes..." : "Generating content..."} This may take a moment.
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
            </div>

            {/* Right Panel - Content Display */}
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
                            <Button variant="outline" size="icon"><LucideThumbsUp /></Button>
                            <Button variant="outline" size="icon"><LucideThumbsDown /></Button>
                            <Button variant="outline" size="icon"><LucideCopy /></Button>
                            <Button 
                                onClick={regenerateContent}
                                disabled={isGeneratingContent}
                                variant="outline"
                                size="sm"
                            >
                                {isGeneratingContent ? (isStreamingNotes ? "Streaming..." : "Generating...") : "Regenerate"}
                            </Button>
                        </div>
                    )}
                </div>

                <TabsContent value="NOTES" className="flex-1 border rounded-lg overflow-hidden relative">
                    {isStreamingNotes && (
                        <div className="absolute top-2 right-2 z-10 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                            Generating notes...
                        </div>
                    )}

                    {bench?.notes || isStreamingNotes ? (
                        <div className="h-full flex flex-col">
                            {/* Notes Editor */}
                            <div className="flex-1 p-4">
                                <Textarea
                                    value={bench?.notes || ""}
                                    onChange={(e) => bench && updateBench(bench.id, { notes: e.target.value })}
                                    disabled={isStreamingNotes}
                                    placeholder={isStreamingNotes ? "Generating notes..." : "Start typing your notes..."}
                                    className="w-full h-full min-h-[300px] resize-none font-mono text-sm leading-relaxed"
                                />
                            </div>
                            
                            {/* Notes Preview */}
                            {bench?.notes && (
                                <div className="flex-1 p-4 border-t bg-gray-50 overflow-y-auto">
                                    <div className="prose prose-sm max-w-none">
                                        <DefaultMarkdown>{bench.notes}</DefaultMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-center py-8">
                            Upload files and we'll generate notes for you
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="FLASHCARDS" className="flex-1">
                    <Card className="h-full">
                        <CardContent className="p-6 h-full overflow-y-auto">
                            {bench?.flashcards && bench.flashcards.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-600 mb-4">
                                        Generated {bench.flashcards.length} flashcard{bench.flashcards.length !== 1 ? 's' : ''}
                                    </div>
                                    {bench.flashcards.map((card, index) => (
                                        <div key={card.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                            <div className="mb-2">
                                                <strong>Q{index + 1}:</strong> {card.front}
                                            </div>
                                            <div className="text-gray-700">
                                                <strong>A:</strong> {card.back}
                                            </div>
                                        </div>
                                    ))}
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
    );
}
