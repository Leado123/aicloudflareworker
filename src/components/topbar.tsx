import { LucideArrowUpRight, LucideHandHelping, LucideMessageCircle, LucidePencilRuler, LucideSparkles, LucideLoader2, LucideCalculator } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { useModeSwitcher } from "./ModeProvider";
import { allModes } from "@/util/modes";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useState } from "react";

export default function TopBar() {
    const { currentMode, switchMode } = useModeSwitcher();
    const [apiKey, setApiKey] = useState("");
    const [selectedService, setSelectedService] = useState<"gemini" | "cerebras">("gemini");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!apiKey.trim()) {
            setMessage({ type: 'error', text: 'Please enter an API key' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/submitAPIKey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    service: selectedService,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'API key submitted successfully!' });
                setApiKey("");
                setTimeout(() => {
                    setIsDialogOpen(false);
                    setMessage(null);
                }, 2000);
            } else {
                const errorMessage = (result as { error?: string })?.error || 'Failed to submit API key';
                setMessage({ type: 'error', text: errorMessage });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setApiKey("");
        setMessage(null);
        setIsSubmitting(false);
    };

    return (
        <div className="w-full grid grid-cols-3 place-items-center">
            <div>
            </div>
            <Tabs value={currentMode} onValueChange={value => switchMode(value as typeof currentMode)} className="w-full grid- flex place-items-center ">
                <TabsList>
                    <TabsTrigger value="chat">
                        <LucideMessageCircle /> {allModes.chat.displayName}
                    </TabsTrigger>
                    <TabsTrigger value="craftingTable">
                        <LucideSparkles /> {allModes.craftingTable.displayName}
                    </TabsTrigger>
                    <TabsTrigger value="write">
                        <LucidePencilRuler /> {allModes.write.displayName}
                    </TabsTrigger>
                    <TabsTrigger value="calculator">
                        <LucideCalculator /> {allModes.calculator.displayName}
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="w-full flex justify-end-safe pr-2">
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <button className="flex bg-green-100 p-1 pr-3 pl-3 rounded-full text-sm place-items-center justify-center text-green-700 gap-1 cursor-pointer hover:text-green-800">
                            Support us with an API Key
                            <LucideArrowUpRight className="size-4" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Submit Your API Key</DialogTitle>
                            <DialogDescription>
                                Help support this project by providing your own API key. Your key will be validated and securely stored.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-6">
                                <Tabs value={selectedService} onValueChange={(value) => setSelectedService(value as "gemini" | "cerebras")}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="gemini">Gemini</TabsTrigger>
                                        <TabsTrigger value="cerebras">Cerebras</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="gemini" className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gemini-key">Google AI Studio API Key</Label>
                                            <Input
                                                id="gemini-key"
                                                type="password"
                                                placeholder="Enter your Gemini API key..."
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                            <p className="text-xs text-gray-500">
                                                Get your API key from{" "}
                                                <a 
                                                    href="https://makersuite.google.com/app/apikey" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Google AI Studio
                                                </a>
                                            </p>
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="cerebras" className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cerebras-key">Cerebras API Key</Label>
                                            <Input
                                                id="cerebras-key"
                                                type="password"
                                                placeholder="Enter your Cerebras API key..."
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                            <p className="text-xs text-gray-500">
                                                Get your API key from{" "}
                                                <a 
                                                    href="https://cloud.cerebras.ai/" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Cerebras Cloud
                                                </a>
                                            </p>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {message && (
                                    <div className={`p-3 rounded-md text-sm ${
                                        message.type === 'success' 
                                            ? 'bg-green-50 text-green-700 border border-green-200' 
                                            : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                        {message.text}
                                    </div>
                                )}
                            </div>
                            
                            <DialogFooter className="mt-6">
                                <DialogClose asChild>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting || !apiKey.trim()}
                                    className="min-w-[100px]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Validating...
                                        </>
                                    ) : (
                                        'Submit Key'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

        </div>
    )
}