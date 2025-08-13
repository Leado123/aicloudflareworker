// Demonstration component showing how to use the type-safe mode API system
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useModeAPI, ModeAPIError } from '@/util/modeAPIClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';

export default function TypeSafeAPIDemo() {
    const modeAPI = useModeAPI();
    const [results, setResults] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Helper function to handle API calls
    const handleAPICall = async (
        key: string,
        apiCall: () => Promise<any>
    ) => {
        setLoading(prev => ({ ...prev, [key]: true }));
        setErrors(prev => ({ ...prev, [key]: '' }));
        
        try {
            const result = await apiCall();
            setResults(prev => ({ ...prev, [key]: result }));
        } catch (error) {
            if (error instanceof ModeAPIError) {
                setErrors(prev => ({ ...prev, [key]: `${error.mode}/${error.action}: ${error.message}` }));
            } else {
                setErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : 'Unknown error' }));
            }
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    // Chat API demonstrations
    const [chatMessage, setChatMessage] = useState('Hello, how are you?');
    const [conversationId, setConversationId] = useState('test-conversation-123');

    const testChatGenerateTitle = () => {
        handleAPICall('chatTitle', () => 
            modeAPI.chat.generateTitle({ message: chatMessage })
        );
    };

    const testChatStreamResponse = () => {
        handleAPICall('chatResponse', () =>
            modeAPI.chat.streamResponse({
                messages: [{ role: 'user', content: chatMessage }],
                conversationId: conversationId
            })
        );
    };

    const testChatAnalyze = () => {
        handleAPICall('chatAnalyze', () =>
            modeAPI.chat.analyzeConversation({ conversationId })
        );
    };

    // Crafting Table API demonstrations
    const [craftingContent, setCraftingContent] = useState('Machine learning is a subset of artificial intelligence...');
    const [extraCommands, setExtraCommands] = useState('Focus on key concepts and definitions');

    const testCraftingGenerateNotes = () => {
        handleAPICall('craftingNotes', () =>
            modeAPI.craftingTable.generateNotes({
                content: craftingContent,
                extraCommands: extraCommands || undefined
            })
        );
    };

    const testCraftingGenerateFlashcards = () => {
        handleAPICall('craftingFlashcards', () =>
            modeAPI.craftingTable.generateFlashcards({
                content: craftingContent,
                extraCommands: extraCommands || undefined
            })
        );
    };

    // Writing API demonstrations
    const [writingText, setWritingText] = useState('This is a sample text that needs improvements.');
    const [writingTopic, setWritingTopic] = useState('The Impact of Artificial Intelligence on Society');
    const [writingInstructions, setWritingInstructions] = useState('Make it more academic and formal');

    const testWritingImprove = () => {
        handleAPICall('writingImprove', () =>
            modeAPI.write.improveText({
                text: writingText,
                instructions: writingInstructions || undefined
            })
        );
    };

    const testWritingOutline = () => {
        handleAPICall('writingOutline', () =>
            modeAPI.write.generateOutline({ topic: writingTopic })
        );
    };

    const testWritingGrammar = () => {
        handleAPICall('writingGrammar', () =>
            modeAPI.write.checkGrammar({ text: writingText })
        );
    };

    // Result display component
    const ResultDisplay = ({ resultKey, title }: { resultKey: string; title: string }) => (
        <div className="mt-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">{title}</h4>
            {loading[resultKey] && <div className="text-blue-500">Loading...</div>}
            {errors[resultKey] && <div className="text-red-500">Error: {errors[resultKey]}</div>}
            {results[resultKey] && (
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(results[resultKey], null, 2)}
                </pre>
            )}
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Type-Safe Mode API System Demo</CardTitle>
                    <CardDescription>
                        Test the type-safe API system that allows modes to make validated requests to the server.
                        Each API call is fully typed and validated both client and server side.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="chat">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="chat">Chat APIs</TabsTrigger>
                            <TabsTrigger value="crafting">Crafting Table APIs</TabsTrigger>
                            <TabsTrigger value="writing">Writing APIs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="chat" className="space-y-4">
                            <div>
                                <Label htmlFor="chatMessage">Message for title generation:</Label>
                                <Textarea
                                    id="chatMessage"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Enter a message..."
                                />
                                <Button onClick={testChatGenerateTitle} className="mt-2">
                                    Generate Title
                                </Button>
                                <ResultDisplay resultKey="chatTitle" title="Generated Title" />
                            </div>

                            <div>
                                <Label htmlFor="conversationId">Conversation ID:</Label>
                                <Input
                                    id="conversationId"
                                    value={conversationId}
                                    onChange={(e) => setConversationId(e.target.value)}
                                />
                                <div className="space-x-2 mt-2">
                                    <Button onClick={testChatStreamResponse}>
                                        Get AI Response
                                    </Button>
                                    <Button onClick={testChatAnalyze} variant="outline">
                                        Analyze Conversation
                                    </Button>
                                </div>
                                <ResultDisplay resultKey="chatResponse" title="AI Response" />
                                <ResultDisplay resultKey="chatAnalyze" title="Conversation Analysis" />
                            </div>
                        </TabsContent>

                        <TabsContent value="crafting" className="space-y-4">
                            <div>
                                <Label htmlFor="craftingContent">Content for processing:</Label>
                                <Textarea
                                    id="craftingContent"
                                    value={craftingContent}
                                    onChange={(e) => setCraftingContent(e.target.value)}
                                    placeholder="Enter content to process..."
                                    rows={4}
                                />
                                <Label htmlFor="extraCommands">Extra Commands (optional):</Label>
                                <Input
                                    id="extraCommands"
                                    value={extraCommands}
                                    onChange={(e) => setExtraCommands(e.target.value)}
                                    placeholder="Additional instructions..."
                                />
                                <div className="space-x-2 mt-2">
                                    <Button onClick={testCraftingGenerateNotes}>
                                        Generate Notes
                                    </Button>
                                    <Button onClick={testCraftingGenerateFlashcards} variant="outline">
                                        Generate Flashcards
                                    </Button>
                                </div>
                                <ResultDisplay resultKey="craftingNotes" title="Generated Notes" />
                                <ResultDisplay resultKey="craftingFlashcards" title="Generated Flashcards" />
                            </div>
                        </TabsContent>

                        <TabsContent value="writing" className="space-y-4">
                            <div>
                                <Label htmlFor="writingText">Text to improve:</Label>
                                <Textarea
                                    id="writingText"
                                    value={writingText}
                                    onChange={(e) => setWritingText(e.target.value)}
                                    placeholder="Enter text to improve..."
                                />
                                <Label htmlFor="writingInstructions">Instructions (optional):</Label>
                                <Input
                                    id="writingInstructions"
                                    value={writingInstructions}
                                    onChange={(e) => setWritingInstructions(e.target.value)}
                                    placeholder="Improvement instructions..."
                                />
                                <div className="space-x-2 mt-2">
                                    <Button onClick={testWritingImprove}>
                                        Improve Text
                                    </Button>
                                    <Button onClick={testWritingGrammar} variant="outline">
                                        Check Grammar
                                    </Button>
                                </div>
                                <ResultDisplay resultKey="writingImprove" title="Improved Text" />
                                <ResultDisplay resultKey="writingGrammar" title="Grammar Check" />
                            </div>

                            <div>
                                <Label htmlFor="writingTopic">Topic for outline:</Label>
                                <Input
                                    id="writingTopic"
                                    value={writingTopic}
                                    onChange={(e) => setWritingTopic(e.target.value)}
                                    placeholder="Enter a topic..."
                                />
                                <Button onClick={testWritingOutline} className="mt-2">
                                    Generate Outline
                                </Button>
                                <ResultDisplay resultKey="writingOutline" title="Generated Outline" />
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>How it works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold">Type Safety</h4>
                        <p className="text-sm text-gray-600">
                            All API calls are fully typed. TypeScript will catch errors at compile time if you pass wrong types.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Validation</h4>
                        <p className="text-sm text-gray-600">
                            Both client and server validate inputs. Invalid requests are rejected before reaching handlers.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Dynamic Routing</h4>
                        <p className="text-sm text-gray-600">
                            API routes are dynamically handled: <code>/api/modes/[mode]/[action]</code>
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Error Handling</h4>
                        <p className="text-sm text-gray-600">
                            Consistent error handling with proper error types and messages.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
