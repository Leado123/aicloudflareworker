import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { createCerebras } from "@ai-sdk/cerebras";

const prisma = new PrismaClient();

interface APIKeyInfo {
  id: string;
  key: string;
  createdAt: Date;
  updatedAt: Date;
  isValid?: boolean;
}

class APIKeyManager {
  private static instance: APIKeyManager;
  private geminiKeys: APIKeyInfo[] = [];
  private cerebrasKeys: APIKeyInfo[] = [];
  private currentKeyIndex = 0;
  private currentCerebrasKeyIndex = 0;
  private lastValidationTime = 0;
  private lastKeyFetchTime = 0;
  private validationInterval = 60 * 60 * 1000; // 1 hour
  private keyRefreshInterval = 60 * 1000; // 1 minute
  private fallbackApiKey = process.env.GEMINI_API_KEY || ""; // Use environment variable instead of hardcoded key
  private isInitialized = false;

  private constructor() {
    // Initialize keys asynchronously but don't block constructor
    this.initializeKeys().catch(console.error);
  }

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  private async initializeKeys() {
    try {
      await this.loadKeysFromDatabase();
      this.isInitialized = true;
      // Start background validation
      this.startBackgroundValidation();
    } catch (error) {
      console.error("Failed to initialize API keys:", error);
      this.isInitialized = true; // Mark as initialized even on error
    }
  }

  private async loadKeysFromDatabase() {
    try {
      const keys = await prisma.aPIKeys.findMany({
        orderBy: {
          createdAt: "asc",
        },
      });

      this.geminiKeys = keys
        .filter((key) => key.type === "GEMINI")
        .map((key) => ({
          id: key.id,
          key: key.key,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
          isValid: true, // Assume valid initially
        }));

      this.cerebrasKeys = keys
        .filter((key) => key.type === "CEREBRAS")
        .map((key) => ({
          id: key.id,
          key: key.key,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
          isValid: true, // Assume valid initially
        }));

      this.lastKeyFetchTime = Date.now();
      console.log(
        `Loaded ${this.geminiKeys.length} Gemini API keys and ${this.cerebrasKeys.length} Cerebras API keys from database`
      );
    } catch (error) {
      console.error("Error loading keys from database:", error);
      this.geminiKeys = [];
      this.cerebrasKeys = [];
    }
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
      });

      // Test with a minimal prompt
      const { textStream } = await streamText({
        model: google("gemini-1.5-flash"),
        prompt: "Hi",
        maxTokens: 5,
      });

      // Try to read first chunk
      const reader = textStream.getReader();
      const { done, value } = await reader.read();
      reader.releaseLock();

      return !done || value !== undefined;
    } catch (error: any) {
      console.error(
        `Gemini API key validation failed: ${error.message || "Unknown error"}`
      );
      return false;
    }
  }

  private async validateCerebrasApiKey(apiKey: string): Promise<boolean> {
    try {
      const cerebras = createCerebras({
        apiKey: apiKey,
      });

      // Test with a minimal prompt
      const { textStream } = await streamText({
        model: cerebras("llama-3.3-70b"),
        prompt: "Hi",
        maxTokens: 5,
      });

      // Try to read first chunk
      const reader = textStream.getReader();
      const { done, value } = await reader.read();
      reader.releaseLock();

      return !done || value !== undefined;
    } catch (error: any) {
      console.error(
        `Cerebras API key validation failed: ${
          error.message || "Unknown error"
        }`
      );
      return false;
    }
  }

  private async validateAllKeys() {
    console.log("Starting validation of all API keys...");

    // Validate Gemini keys
    for (let i = 0; i < this.geminiKeys.length; i++) {
      const keyInfo = this.geminiKeys[i];
      const isValid = await this.validateApiKey(keyInfo.key);
      if (keyInfo.isValid !== isValid) {
        console.log(
          `Gemini API key ${keyInfo.id} validation changed: ${keyInfo.isValid} -> ${isValid}`
        );
        this.geminiKeys[i].isValid = isValid;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Validate Cerebras keys
    for (let i = 0; i < this.cerebrasKeys.length; i++) {
      const keyInfo = this.cerebrasKeys[i];
      const isValid = await this.validateCerebrasApiKey(keyInfo.key);
      if (keyInfo.isValid !== isValid) {
        console.log(
          `Cerebras API key ${keyInfo.id} validation changed: ${keyInfo.isValid} -> ${isValid}`
        );
        this.cerebrasKeys[i].isValid = isValid;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Filter out invalid keys and log
    const validGeminiKeys = this.geminiKeys.filter((key) => key.isValid);
    const validCerebrasKeys = this.cerebrasKeys.filter((key) => key.isValid);
    console.log(
      `Validation complete. Gemini: ${validGeminiKeys.length}/${this.geminiKeys.length} valid. Cerebras: ${validCerebrasKeys.length}/${this.cerebrasKeys.length} valid.`
    );

    // Reset indices if they are out of bounds
    if (this.currentKeyIndex >= validGeminiKeys.length) {
      this.currentKeyIndex = 0;
    }
    if (this.currentCerebrasKeyIndex >= validCerebrasKeys.length) {
      this.currentCerebrasKeyIndex = 0;
    }
  }

  private startBackgroundValidation() {
    setInterval(async () => {
      const now = Date.now();

      // Refresh keys from database periodically
      if (now - this.lastKeyFetchTime > this.keyRefreshInterval) {
        await this.loadKeysFromDatabase();
      }

      // Validate keys periodically
      if (now - this.lastValidationTime > this.validationInterval) {
        await this.validateAllKeys();
        this.lastValidationTime = now;
      }
    }, 5000); // Check every 5 seconds
  }

  public async getCurrentApiKey(): Promise<string | null> {
    // Ensure initialization is complete
    if (!this.isInitialized) {
      console.log("Waiting for API key manager initialization...");
      await this.waitForInitialization();
    }

    // Refresh keys if needed
    const now = Date.now();
    if (now - this.lastKeyFetchTime > this.keyRefreshInterval) {
      await this.loadKeysFromDatabase();
    }

    const validKeys = this.geminiKeys.filter((key) => key.isValid !== false);

    if (validKeys.length === 0) {
      console.warn("No valid Gemini API keys available.");
      return null;
    }

    // Ensure index is within bounds
    if (this.currentKeyIndex >= validKeys.length) {
      this.currentKeyIndex = 0;
    }

    const currentKey = validKeys[this.currentKeyIndex];
    console.log(
      `Using Gemini API key ${currentKey.id} (${this.currentKeyIndex + 1}/${
        validKeys.length
      })`
    );

    return currentKey.key;
  }

  public async getCurrentCerebrasApiKey(): Promise<string | null> {
    // Ensure initialization is complete
    if (!this.isInitialized) {
      console.log("Waiting for API key manager initialization...");
      await this.waitForInitialization();
    }

    // Refresh keys if needed
    const now = Date.now();
    if (now - this.lastKeyFetchTime > this.keyRefreshInterval) {
      await this.loadKeysFromDatabase();
    }

    const validKeys = this.cerebrasKeys.filter((key) => key.isValid !== false);

    if (validKeys.length === 0) {
      console.warn("No valid Cerebras API keys available.");
      return null;
    }

    // Ensure index is within bounds
    if (this.currentCerebrasKeyIndex >= validKeys.length) {
      this.currentCerebrasKeyIndex = 0;
    }

    const currentKey = validKeys[this.currentCerebrasKeyIndex];
    console.log(
      `Using Cerebras API key ${currentKey.id} (${
        this.currentCerebrasKeyIndex + 1
      }/${validKeys.length})`
    );

    return currentKey.key;
  }

  private async waitForInitialization(): Promise<void> {
    const timeout = 10000; // 10 seconds
    const startTime = Date.now();

    while (!this.isInitialized && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.isInitialized) {
      console.warn("API key manager initialization timed out");
    }
  }

  public rotateToNextKey(): void {
    const validKeys = this.geminiKeys.filter((key) => key.isValid !== false);

    if (validKeys.length <= 1) {
      return; // No point in rotating if there's only one or no keys
    }

    this.currentKeyIndex = (this.currentKeyIndex + 1) % validKeys.length;
    console.log(
      `Rotated to next Gemini API key (index: ${this.currentKeyIndex})`
    );
  }

  public rotateToNextCerebrasKey(): void {
    const validKeys = this.cerebrasKeys.filter((key) => key.isValid !== false);

    if (validKeys.length <= 1) {
      return;
    }

    this.currentCerebrasKeyIndex =
      (this.currentCerebrasKeyIndex + 1) % validKeys.length;
    console.log(
      `Rotated to next Cerebras API key (index: ${this.currentCerebrasKeyIndex})`
    );
  }

  public getKeyStats() {
    const geminiValid = this.geminiKeys.filter(
      (key) => key.isValid !== false
    ).length;
    const geminiInvalid = this.geminiKeys.filter(
      (key) => key.isValid === false
    ).length;
    const cerebrasValid = this.cerebrasKeys.filter(
      (key) => key.isValid !== false
    ).length;
    const cerebrasInvalid = this.cerebrasKeys.filter(
      (key) => key.isValid === false
    ).length;

    return {
      gemini: {
        total: this.geminiKeys.length,
        valid: geminiValid,
        invalid: geminiInvalid,
      },
      cerebras: {
        total: this.cerebrasKeys.length,
        valid: cerebrasValid,
        invalid: cerebrasInvalid,
      },
    };
  }

  public async addKey(
    apiKey: string,
    type: "GEMINI" | "CEREBRAS"
  ): Promise<boolean> {
    try {
      let isValid = false;
      if (type === "GEMINI") {
        isValid = await this.validateApiKey(apiKey);
      } else if (type === "CEREBRAS") {
        isValid = await this.validateCerebrasApiKey(apiKey);
      }

      if (!isValid) {
        throw new Error(`Invalid ${type} API key`);
      }

      // Store in database
      const newKey = await prisma.aPIKeys.create({
        data: {
          key: apiKey,
          type: type,
        },
      });

      const newKeyInfo: APIKeyInfo = {
        id: newKey.id,
        key: newKey.key,
        createdAt: newKey.createdAt,
        updatedAt: newKey.updatedAt,
        isValid: true,
      };

      if (type === "GEMINI") {
        this.geminiKeys.push(newKeyInfo);
      } else if (type === "CEREBRAS") {
        this.cerebrasKeys.push(newKeyInfo);
      }

      console.log(`Added new ${type} API key ${newKey.id}`);
      return true;
    } catch (error) {
      console.error("Failed to add API key:", error);
      return false;
    }
  }

  public invalidateKey(apiKey: string, type: "GEMINI" | "CEREBRAS") {
    console.log(`Attempting to invalidate ${type} key...`);
    const keyArray = type === "GEMINI" ? this.geminiKeys : this.cerebrasKeys;
    const keyIndex = keyArray.findIndex((k) => k.key === apiKey);

    if (keyIndex !== -1) {
      keyArray[keyIndex].isValid = false;
      console.log(
        `Successfully invalidated ${type} key ${keyArray[keyIndex].id}.`
      );
    } else {
      console.warn(`Could not find ${type} key to invalidate.`);
    }
  }

  public async cleanup() {
    await prisma.$disconnect();
  }
}

export default APIKeyManager;
