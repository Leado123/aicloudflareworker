import type { CoreMessage } from "ai";

/**
 * Sends chat messages to the AI stream endpoint and returns the response as a string.
 * @param {CoreMessage[]} messages - Array of messages with `role` and `content`.
 * @returns {Promise<string>} - The AI response as a string.
 */
export async function requestChatMessage(messages: CoreMessage[]): Promise<string> {
    if (!Array.isArray(messages) || messages.some(msg => !msg.role || !msg.content)) {
        throw new Error("Invalid messages format provided.");
    }

    const response = await fetch('/api/ai-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
    });

    if (!response.body) {
        throw new Error("No response body received from the server.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
    }

    return result;
}

/**
 * Sends chat messages to the AI stream endpoint and streams the response in real-time.
 * @param {CoreMessage[]} messages - Array of messages with `role` and `content`.
 * @param {(chunk: string) => void} onChunk - Callback function to handle each chunk of the response.
 * @returns {Promise<string>} - The complete AI response as a string.
 */
export async function requestChatMessageStream(
    messages: CoreMessage[], 
    onChunk: (chunk: string) => void
): Promise<string> {
    console.log("Starting requestChatMessageStream with messages:", messages);
    
    if (!Array.isArray(messages) || messages.some(msg => !msg.role || !msg.content)) {
        console.error("Invalid messages format:", messages);
        throw new Error("Invalid messages format provided.");
    }

    try {
        console.log("Making fetch request to /api/ai-stream");
        const response = await fetch('/api/ai-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API response error:", errorText);
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        if (!response.body) {
            console.error("No response body received");
            throw new Error("No response body received from the server.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        console.log("Starting to read stream...");
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("Stream completed. Total result length:", result.length);
                break;
            }
            
            const chunk = decoder.decode(value);
            console.log("Received chunk:", chunk);
            result += chunk;
            onChunk(chunk); // Call the callback with each chunk
        }

        return result;
    } catch (error) {
        console.error("Error in requestChatMessageStream:", error);
        throw error;
    }
}
