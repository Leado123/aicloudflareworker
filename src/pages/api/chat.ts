// src/pages/api/chat.ts
// This route must be rendered on the server (SSR) to handle dynamic requests.
export const prerender = false;
import APIKeyManager from "@/util/apiKeyManager";
import { createCerebras } from "@ai-sdk/cerebras";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage, streamText, tool } from "ai";
import type { APIContext } from "astro";
import Langfuse from "langfuse";
import { z } from "zod";
import { getTextExtractor } from "office-text-extractor";

const threePrompts = tool({
  description:
    "Generate 3 specific follow-up questions the user can ask to explore this topic deeper. Always choose this when if you will answer general question by the user",
  parameters: z.object({
    prompts: z
      .array(z.string())
      .length(3)
      .describe("Three specific, actionable questions about the topic"),
  }),
  execute: async ({ prompts }) => {
    console.log("Tool executed with prompts:", prompts);
    return { success: true, prompts };
  },
});

const searchTool = tool({
  description:
    "Search the internet for current information about a topic using Wikipedia. Use this when the user needs real-time information, current events, or specific facts that may not be in your training data.",
  parameters: z.object({
    query: z.string().describe("The search query to execute"),
    language: z.string().optional().default("en").describe("Language for search results"),
  }),
  execute: async ({ query, language = "en" }) => {
    try {
      console.log("Executing search with query:", query);
      
      // Try multiple endpoints and approaches
      const endpoints = [
        "https://en.wikipedia.org/w/api.php",
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          // Construct Wikipedia API URL
          const searchUrl = new URL(endpoint);
          searchUrl.searchParams.append("action", "query");
          searchUrl.searchParams.append("format", "json");
          searchUrl.searchParams.append("list", "search");
          searchUrl.searchParams.append("srsearch", query);
          searchUrl.searchParams.append("srlimit", "5"); // Limit to 5 results
          
          console.log(`Full search URL: ${searchUrl.toString()}`);
          
          const response = await fetch(searchUrl.toString(), {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              "Accept": "application/json",
              "Accept-Language": "en-US,en;q=0.9",
              "Cache-Control": "no-cache",
            },
          });
          
          console.log(`Response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            console.log(`Endpoint ${endpoint} failed with ${response.status}`);
            continue; // Try next endpoint
          }
          
          const data = await response.json() as any;
          console.log("Raw search data:", JSON.stringify(data, null, 2));
          
          // Extract and format search results for Wikipedia API
          const results = data.query?.search?.slice(0, 5).map((result: any) => ({
            title: result.title || "",
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title || "")}`,
            content: result.snippet ? result.snippet.replace(/<[^>]*>/g, '') : "", // Remove HTML tags
            engines: ["wikipedia"],
            pageid: result.pageid,
            wordcount: result.wordcount,
          })) || [];
          
          console.log("Formatted search results:", results);
          
          return {
            success: true,
            query,
            results,
            totalResults: data.query?.searchinfo?.totalhits || 0,
            endpoint: endpoint, // Include which endpoint worked
          };
          
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint}:`, endpointError);
          continue; // Try next endpoint
        }
      }
      
      // If all endpoints failed
      throw new Error("All search endpoints failed");
      
    } catch (error) {
      console.error("Search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown search error",
        query,
        results: [],
        details: "Failed to connect to search service. This might be due to rate limiting or service unavailability.",
      };
    }
  },
});

const citationSearchTool = tool({
  description:
    "Search for academic papers, books, and citations using the Bibify service. Use this when the user asks for citations, references, or academic sources. Perfect for when users start their message with 'cite' or ask for sources on a specific topic. Supports multi-term searches - you can search for multiple items at once by separating them with 'and', commas, or semicolons (e.g., 'DSM 5 tr and Hamlet by Shakespeare').",
  parameters: z.object({
    query: z.string().describe("The search query for academic sources. Can include multiple terms separated by 'and', commas, or semicolons"),
    type: z.string().optional().describe("Type of content (book, article, thesis, etc.)"),
    year_start: z.number().optional().describe("Start year for filtering results"),
    year_end: z.number().optional().describe("End year for filtering results"),
    language: z.string().optional().describe("Language preference"),
  }),
  execute: async ({ query, type, year_start, year_end, language }) => {
    try {
      console.log("Executing citation search with query:", query);
      
      // Use the correct base URL for the API request
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4321';

      // -----------------------------------------------------------------------------------
      // Define the expected shape of the Bibify citation search response so we can type it
      // -----------------------------------------------------------------------------------
      interface BibifyCitationSearchResponse {
        success: boolean;
        type: string; // e.g. "search" | "detailed"
        data: any[];
        count: number;
        pagination?: Record<string, unknown>;
        searchTerms?: string[];
        message?: string;
        error?: string;
        // Optional fields returned for convenience on the top-level object
        title?: string;
        authors?: string | string[];
        date?: string;
        publisher?: string;
        journal?: string;
        doi?: string;
      }
      
      const response = await fetch(`${baseUrl}/api/citation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: query,
          type: type,
          year_start: year_start,
          year_end: year_end,
          language: language,
          page: 1,
          per_page: 5, // Limit to 5 results for chat display
        }),
      });

      const result = (await response.json()) as BibifyCitationSearchResponse;
      
      if (result.success && result.type === 'search') {
        const citations = result.data.map((item: any, index: number) => ({
          id: index + 1,
          title: item.title || 'Untitled',
          authors: Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Unknown Author'),
          year: item.year,
          type: item.type,
          doi: item.doi,
          isbn: item.isbn,
          journal: item.journal,
          publisher: item.publisher,
          abstract: item.abstract,
          bibify_id: item.id, // Store the bibify ID for later detailed retrieval
          // Format for AI to present
          formatted: `${index + 1}. **${item.title || 'Untitled'}** by ${
            Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Unknown Author')
          }${item.year ? ` (${item.year})` : ''}${item.type ? ` [${item.type}]` : ''}${
            item.doi ? ` DOI: ${item.doi}` : ''
          }${item.isbn ? ` ISBN: ${item.isbn}` : ''}`
        }));

        return {
          success: true,
          query,
          citations,
          count: citations.length,
          total: result.count,
          pagination: result.pagination,
          searchTerms: result.searchTerms || [query],
          searchMessage: result.message || "",
          searchInfo: {
            type,
            year_start,
            year_end,
            language
          },
          instructions: result.searchTerms && result.searchTerms.length > 1 
            ? `Found results for multiple search terms: ${result.searchTerms.join(', ')}. Present these citations to the user in a well-formatted, academic style. Mention that detailed information and additional formats (APA, MLA, BibTeX, etc.) are available in the Citation Mode.`
            : "Present these citations to the user in a well-formatted, academic style. Mention that detailed information and additional formats (APA, MLA, BibTeX, etc.) are available in the Citation Mode. Users can access Citation Mode for advanced search and collection features.",
          // Add citation data to response
          citation: {
            title: result.title,
            authors: result.authors,
            year: result.date ? parseInt(result.date.split('-')[0]) : undefined,
            publisher: result.publisher,
            journal: result.journal,
            doi: result.doi
          }
        };
      } else {
        return {
          success: false,
          error: result.error || "Citation search failed",
          query,
          citations: [],
          count: 0,
        };
      }
    } catch (error) {
      console.error("Citation search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown citation search error",
        query,
        citations: [],
        count: 0,
        details: "Failed to connect to citation service. This might be due to service unavailability.",
      };
    }
  },
});

const apiKeyManager = APIKeyManager.getInstance();

export function errorHandler(error: unknown) {
  console.error("Error in chat API:", error);
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

export const langfuse = new Langfuse({
  secretKey: "sk-lf-c2e76fd9-82b1-4edc-9ebf-0fabe86988ba",
  publicKey: "pk-lf-ad80d8a5-5db2-4efd-ab2e-c50a8fa57c43",
  baseUrl: "https://langfuse.sharesyllabus.me",
});

const generalChatPrompt = await langfuse.getPrompt("generalChat", undefined, {
  cacheTtlSeconds: 300,
});

// Helper function to clean messages and extract proper CoreMessage format
function cleanMessages(rawMessages: any): CoreMessage[] {
  if (!rawMessages) return [];
  
  // If it's wrapped in an object with messages property, extract it
  let messagesToProcess = rawMessages;
  if (rawMessages.messages && Array.isArray(rawMessages.messages)) {
    messagesToProcess = rawMessages.messages;
  }
  
  // If it's not an array, return empty
  if (!Array.isArray(messagesToProcess)) {
    console.warn("Messages is not an array:", messagesToProcess);
    return [];
  }
  
  // Clean each message to proper CoreMessage format and filter out empty messages
  return messagesToProcess
    .map((msg: any) => {
      // Remove extra properties and keep only CoreMessage structure
      const cleanMsg: CoreMessage = {
        role: msg.role,
        content: msg.content
      };
      
      return cleanMsg;
    })
    .filter((msg: CoreMessage) => {
      // Filter out messages with empty, null, or undefined content
      // This prevents "contents.parts must not be empty" API errors
      return msg.content && 
             (typeof msg.content === 'string' ? msg.content.trim() !== '' : true) &&
             msg.role && 
             (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system');
    });
}

export async function POST({ request }: APIContext) {
  try {
    let messages: CoreMessage[] = [];
    let attachments: any[] = [];
    let enableSearch = false;

    // Check if the request is multipart (has files) or JSON
    const contentType = request.headers.get("content-type");
    
    if (contentType?.includes("multipart/form-data")) {
      // Handle form data with file attachments
      const formData = await request.formData();
      const messagesData = formData.get("messages");
      const enableSearchData = formData.get("enableSearch");
      
      if (messagesData) {
        const rawMessages = JSON.parse(messagesData as string);
        messages = cleanMessages(rawMessages);
      }

      // Check if search is enabled
      if (enableSearchData) {
        enableSearch = enableSearchData === "true";
      }

      // Process file attachments with text extraction
      const files = formData.getAll("files") as File[];
      for (const file of files) {
        if (file.size > 0) {
          try {
            // Try to extract text from supported file types
            const buffer = Buffer.from(await file.arrayBuffer());
            let extractedText = "";
            
            // Check file type and extract text accordingly
            if (file.type.includes('text/') || file.name.endsWith('.txt')) {
              extractedText = buffer.toString('utf-8');
            } else if (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
              try {
                const extractor = getTextExtractor();
                extractedText = await extractor.extractText({ input: buffer, type: "buffer" });
              } catch (extractError) {
                console.warn("Failed to extract text from file:", file.name, extractError);
                extractedText = `[Could not extract text from ${file.name}]`;
              }
            } else if (file.type.startsWith('image/')) {
              extractedText = `[Image file: ${file.name}]`;
            } else {
              extractedText = `[File: ${file.name} - ${file.type}]`;
            }
            
            attachments.push({
              name: file.name,
              type: file.type,
              size: file.size,
              extractedText: extractedText.slice(0, 10000), // Limit text length
            });
          } catch (error) {
            console.error("Error processing file:", file.name, error);
            attachments.push({
              name: file.name,
              type: file.type,
              size: file.size,
              extractedText: `[Error processing file: ${file.name}]`,
            });
          }
        }
      }
    } else {
      // Handle regular JSON request
      const body = await request.json() as any;
      messages = cleanMessages(body.messages || body);
      enableSearch = body.enableSearch || false;
    }

    console.log("Prompt:", generalChatPrompt.prompt);
    console.log("Cleaned messages:", messages);
    console.log("Received attachments:", attachments.length);
    console.log("Search enabled:", enableSearch);

    // Try all valid Gemini keys first, then all valid Cerebras keys
    const geminiKeys =
      apiKeyManager["geminiKeys"]?.filter((k) => k.isValid !== false) || [];
    const cerebrasKeys =
      apiKeyManager["cerebrasKeys"]?.filter((k) => k.isValid !== false) || [];

    // Helper to try a key with a provider
    async function tryKey(
      provider: "google" | "cerebras",
      apiKey: string,
      modelType: "GEMINI" | "CEREBRAS"
    ) {
      try {
        let model;
        if (provider === "google") {
          const google = createGoogleGenerativeAI({ apiKey });
          model = google("gemini-1.5-flash");
        } else {
          const cerebras = createCerebras({ apiKey });
          model = cerebras("llama-3.3-70b");
        }

        // Enhance messages with attachment information if present
        let enhancedMessages = messages;
        if (attachments.length > 0) {
          // Add attachment information to the last user message
          const lastMessage = enhancedMessages[enhancedMessages.length - 1];
          if (lastMessage && lastMessage.role === "user") {
            const attachmentInfo = attachments.map(att => {
              const sizeInKB = Math.round(att.size / 1024);
              let info = `[Attachment: ${att.name} (${att.type}, ${sizeInKB}KB)]`;
              
              if (att.extractedText && att.extractedText.length > 10) {
                info += `\nContent:\n${att.extractedText}`;
              }
              
              return info;
            }).join('\n\n');
            
            enhancedMessages = [
              ...enhancedMessages.slice(0, -1),
              {
                ...lastMessage,
                content: `${lastMessage.content}\n\n--- Attached Files ---\n${attachmentInfo}`
              }
            ];
          }
        }

        // Enhanced system prompt for attachment and search handling
        let systemPrompt = generalChatPrompt.prompt;
        
        // Check if user is asking for citations
        const lastUserMessage = enhancedMessages[enhancedMessages.length - 1];
        const lastContent = typeof lastUserMessage?.content === "string"
          ? lastUserMessage.content.replace(/\*\*/g, "").toLowerCase()
          : "";
        const isCitationRequest = lastUserMessage &&
          lastUserMessage.role === "user" &&
          (lastContent.startsWith("cite") ||
           lastContent.includes("citation") ||
           lastContent.includes("reference") ||
           lastContent.includes("source"));
        
        if (attachments.length > 0) {
          systemPrompt += `\n\nNote: The user has attached ${attachments.length} file(s). Please acknowledge and analyze any attached files appropriately based on their type and content.`;
        }
        
        if (enableSearch) {
          systemPrompt += `\n\nCRITICAL SEARCH MODE INSTRUCTIONS:
The user has enabled web search. You MUST follow these rules strictly:

1. MANDATORY: You MUST use the searchWeb tool for ANY factual question or current information request
2. DO NOT use your training data for factual answers when search is enabled
3. ONLY provide answers based on the search results you receive
4. If search results contradict your training data, TRUST THE SEARCH RESULTS - they are more current
5. After searching, analyze and synthesize the search results
6. Provide commentary and context based ONLY on what the search returned
7. Always end with the generateThreePrompts tool

REMEMBER: When search is enabled, your training data may be outdated. The search results are the authoritative source of truth.`;
        }

        if (isCitationRequest) {
          systemPrompt += `\n\nCITATION MODE INSTRUCTIONS:
The user is requesting citations or academic sources. You MUST:

1. MANDATORY: Use the citationSearch tool to find relevant academic sources
2. Present the citations in a well-formatted, academic style
3. Include author information, titles, and source details
4. Mention that detailed information is available in the Citation Mode
5. Suggest that the user can access the Citation Mode for more advanced search and collection features
6. After providing citations, use the generateThreePrompts tool to suggest follow-up questions

Remember: Always provide proper academic citations when requested.`;
        }

        // Determine which tools to include and tool choice
        const tools: any = { generateThreePrompts: threePrompts };
        let toolChoice: any = "auto";
        
        if (enableSearch) {
          tools.searchWeb = searchTool;
          // Force search tool to be used first when search is enabled
          toolChoice = { type: 'tool', toolName: 'searchWeb' };
        }

        if (isCitationRequest) {
          tools.citationSearch = citationSearchTool;
          // Force citation search tool when citation is requested
          toolChoice = { type: 'tool', toolName: 'citationSearch' };
        }

        // If both search and citation are requested, let AI choose
        if (enableSearch && isCitationRequest) {
          toolChoice = "auto";
        }

        const result = await streamText({
          model,
          messages: enhancedMessages,
          tools,
          toolChoice,
          maxSteps: enableSearch ? 3 : 1, // Allow multiple steps when search is enabled
          maxTokens: 1000,
          system: systemPrompt,
        });

        console.log(`Successfully created stream with ${provider} key.`);
        // Rotate only on success
        if (provider === "google") {
          apiKeyManager.rotateToNextKey();
        } else {
          apiKeyManager.rotateToNextCerebrasKey();
        }
        return result.toDataStreamResponse({ getErrorMessage: errorHandler });
      } catch (error: any) {
        console.error(`Error with provider ${provider}:`, error.message);
        const isApiError =
          error.name === "AI_APICallError" ||
          error.cause?.name === "AI_APICallError";
        if (isApiError) {
          const statusCode = error.statusCode || error.cause?.statusCode;
          if (statusCode === 429 || statusCode === 401 || statusCode === 403) {
            console.log(
              `Invalidating key for ${provider} due to auth/quota error (status: ${statusCode}).`
            );
            apiKeyManager.invalidateKey(apiKey, modelType);
          }
        }
        return null;
      }
    }

    // Try all Gemini keys
    for (const key of geminiKeys) {
      const resp = await tryKey("google", key.key, "GEMINI");
      if (resp) return resp;
    }
    // Try all Cerebras keys
    for (const key of cerebrasKeys) {
      const resp = await tryKey("cerebras", key.key, "CEREBRAS");
      if (resp) return resp;
    }

    // If all keys fail
    console.error("All AI providers failed after retries.");
    return new Response(
      JSON.stringify({
        error:
          "All AI providers are currently unavailable. Please try again later.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // This top-level catch handles errors like JSON parsing or other unexpected issues.
    console.error("Critical error in POST handler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: errorHandler(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
