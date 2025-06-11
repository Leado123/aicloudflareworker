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
        
        const chunk = decoder.decode(value);
        result += chunk;
        onChunk(chunk); // Call the callback with each chunk
    }

    return result;
}
