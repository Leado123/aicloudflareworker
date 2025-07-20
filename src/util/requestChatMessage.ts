import type { CoreMessage } from "ai";

export interface ChatResponse {
  response: string;
  suggestedNextPrompts: string[];
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded content
}

/**
 * Sends chat messages to the AI stream endpoint and returns the response as a string.
 * @param {CoreMessage[]} messages - Array of messages with `role` and `content`.
 * @param {FileAttachment[]} attachments - Optional array of file attachments.
 * @returns {Promise<string>} - The AI response as a string.
 */
export async function requestChatMessage(
  messages: CoreMessage[],
  attachments?: FileAttachment[]
): Promise<string> {
  if (
    !Array.isArray(messages) ||
    messages.some((msg) => !msg.role || !msg.content)
  ) {
    throw new Error("Invalid messages format provided.");
  }

  const response = await fetch("/api/ai-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, attachments }),
  });

  if (!response.body) {
    throw new Error("No response body received from the server.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    result += chunk;
  }

  // Try to parse as JSON first (AI SDK format)
  try {
    const parsed = JSON.parse(result);
    return parsed.response || result;
  } catch (e) {
    // If not JSON, return as text
    return result;
  }
}

/**
 * Sends chat messages to the AI stream endpoint and streams the structured response in real-time.
 * @param {CoreMessage[]} messages - Array of messages with `role` and `content`.
 * @param {(chunk: Partial<ChatResponse>) => void} onChunk - Callback function to handle each chunk of the response.
 * @param {FileAttachment[]} attachments - Optional array of file attachments.
 * @returns {Promise<ChatResponse>} - The complete AI response with suggested prompts.
 */
export async function requestChatMessageStream(
  messages: CoreMessage[] | any[], // Allow any array type to accommodate extended message formats
  onChunk: (chunk: Partial<ChatResponse>) => void,
  attachments?: FileAttachment[]
): Promise<ChatResponse> {
  console.log("Starting requestChatMessageStream with messages:", messages);
  console.log("Attachments:", attachments);

  if (
    !Array.isArray(messages) ||
    messages.some((msg) => !msg.role || msg.content === undefined)
  ) {
    console.error("Invalid messages format:", messages);
    throw new Error("Invalid messages format provided.");
  }

  // Ensure messages are formatted correctly for the API
  const formattedMessages = messages.map((msg) => {
    // Convert any object content to string
    if (typeof msg.content === "object" && msg.content !== null) {
      return {
        role: msg.role,
        content:
          typeof msg.content.response === "string"
            ? msg.content.response
            : JSON.stringify(msg.content),
      };
    }
    // Ensure string content
    return {
      role: msg.role,
      content: String(msg.content || ""),
    };
  });

  try {
    console.log("Making fetch request to /api/ai-stream");
    const response = await fetch("/api/ai-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: formattedMessages, attachments }),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API response error:", errorText);
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    if (!response.body) {
      console.error("No response body received");
      throw new Error("No response body received from the server.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse: ChatResponse = { response: "", suggestedNextPrompts: [] };
    let buffer = "";

    console.log("Starting to read AI SDK text stream...");

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("Stream completed. Processing final response...");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      console.log("Received raw chunk:", chunk);

      // Append to buffer and look for complete JSON objects (line-delimited)
      buffer += chunk;

      // Split by newlines to find complete JSON objects
      const lines = buffer.split("\n");

      // Process all complete lines except the last one (which might be incomplete)
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse the JSON object
          const parsed = JSON.parse(line);
          console.log("Successfully parsed JSON:", parsed);

          // Update our response object
          if (parsed.response !== undefined) {
            fullResponse.response = parsed.response;
          }

          if (parsed.suggestedNextPrompts !== undefined) {
            fullResponse.suggestedNextPrompts = parsed.suggestedNextPrompts;
          }

          // Call onChunk with the updated response object
          onChunk({
            response: fullResponse.response,
            suggestedNextPrompts: fullResponse.suggestedNextPrompts,
          });
        } catch (jsonError) {
          console.error("Error parsing JSON line:", line, jsonError);
        }
      }

      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines[lines.length - 1];
    }

    // Process any remaining content in the buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.response !== undefined) {
          fullResponse.response = parsed.response;
        }
        if (parsed.suggestedNextPrompts !== undefined) {
          fullResponse.suggestedNextPrompts = parsed.suggestedNextPrompts;
        }
        onChunk(fullResponse);
      } catch (e) {
        console.error("Error parsing final buffer:", e);
        // If we can't parse it as JSON, use it as raw text
        if (buffer.trim()) {
          fullResponse.response = buffer.trim();
          onChunk(fullResponse);
        }
      }
    }

    // Final processing - ensure we have a complete response
    if (buffer) {
      try {
        const finalParsed = JSON.parse(buffer);
        // Update any properties that were present
        if (finalParsed.response !== undefined) {
          fullResponse.response = finalParsed.response;
        }
        if (finalParsed.suggestedNextPrompts !== undefined) {
          fullResponse.suggestedNextPrompts = finalParsed.suggestedNextPrompts;
        }
      } catch (e) {
        // If final parsing fails and we have no response yet, use buffer text
        if (!fullResponse.response) {
          console.warn(
            "Could not parse final response as JSON, using as plain text"
          );
          fullResponse.response = buffer;
        }
      }
    }

    // Ensure we have default suggested prompts if none provided
    if (fullResponse.suggestedNextPrompts.length === 0) {
      fullResponse.suggestedNextPrompts = [
        "Can you tell me more about this?",
        "What are the next steps?",
        "How does this relate to other topics?",
      ];
    }

    console.log("Final response:", fullResponse);
    return fullResponse;
  } catch (error) {
    console.error("Error in requestChatMessageStream:", error);
    throw error;
  }
}

/**
 * Converts a File object to a FileAttachment for API transmission.
 * @param {File} file - The file to convert.
 * @returns {Promise<FileAttachment>} - The file attachment data.
 */
export async function fileToAttachment(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1]; // Remove data:mime;base64, prefix
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts multiple File objects to FileAttachments.
 * @param {File[]} files - Array of files to convert.
 * @returns {Promise<FileAttachment[]>} - Array of file attachments.
 */
export async function filesToAttachments(
  files: File[]
): Promise<FileAttachment[]> {
  return Promise.all(files.map((file) => fileToAttachment(file)));
}
