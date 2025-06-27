import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from "ai";

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
    private currentKeyIndex = 0;
    private lastValidationTime = 0;
    private lastKeyFetchTime = 0;
    private validationInterval = 30 * 1000; // 30 seconds
    private keyRefreshInterval = 60 * 1000; // 1 minute
    private fallbackApiKey = process.env.GEMINI_API_KEY || ""; // Use environment variable instead of hardcoded key

    private constructor() {
        this.initializeKeys();
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
            // Start background validation
            this.startBackgroundValidation();
        } catch (error) {
            console.error("Failed to initialize API keys:", error);
        }
    }

    private async loadKeysFromDatabase() {
        try {
            const keys = await prisma.aPIKeys.findMany({
                where: {
                    type: "GEMINI"
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            this.geminiKeys = keys.map(key => ({
                id: key.id,
                key: key.key,
                createdAt: key.createdAt,
                updatedAt: key.updatedAt,
                isValid: true // Assume valid initially
            }));

            this.lastKeyFetchTime = Date.now();
            console.log(`Loaded ${this.geminiKeys.length} Gemini API keys from database`);
        } catch (error) {
            console.error("Error loading keys from database:", error);
            this.geminiKeys = [];
        }
    }

    private async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const google = createGoogleGenerativeAI({
                apiKey: apiKey
            });

            // Test with a minimal prompt
            const { textStream } = await streamText({
                model: google("gemini-2.0-flash"),
                prompt: "Hi",
                maxTokens: 5
            });

            // Try to read first chunk
            const reader = textStream.getReader();
            const { done, value } = await reader.read();
            reader.releaseLock();

            return !done || value !== undefined;
        } catch (error) {
            console.error(`API key validation failed:`, error);
            return false;
        }
    }

    private async validateAllKeys() {
        console.log("Starting validation of all API keys...");
        
        for (let i = 0; i < this.geminiKeys.length; i++) {
            const keyInfo = this.geminiKeys[i];
            const isValid = await this.validateApiKey(keyInfo.key);
            
            if (keyInfo.isValid !== isValid) {
                console.log(`API key ${keyInfo.id} validation changed: ${keyInfo.isValid} -> ${isValid}`);
                this.geminiKeys[i].isValid = isValid;
            }

            // Add small delay between validations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Filter out invalid keys for cycling
        const validKeys = this.geminiKeys.filter(key => key.isValid);
        console.log(`Validation complete. ${validKeys.length}/${this.geminiKeys.length} keys are valid`);

        // If current key index is pointing to an invalid key, reset to 0
        if (this.currentKeyIndex >= validKeys.length) {
            this.currentKeyIndex = 0;
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

    public getCurrentApiKey(): string {
        // Refresh keys if needed
        const now = Date.now();
        if (now - this.lastKeyFetchTime > this.keyRefreshInterval) {
            this.loadKeysFromDatabase().catch(console.error);
        }

        const validKeys = this.geminiKeys.filter(key => key.isValid !== false);
        
        if (validKeys.length === 0) {
            console.warn("No valid API keys available, using fallback");
            return this.fallbackApiKey;
        }

        // Ensure index is within bounds
        if (this.currentKeyIndex >= validKeys.length) {
            this.currentKeyIndex = 0;
        }

        const currentKey = validKeys[this.currentKeyIndex];
        console.log(`Using API key ${currentKey.id} (${this.currentKeyIndex + 1}/${validKeys.length})`);
        
        return currentKey.key;
    }

    public rotateToNextKey(): void {
        const validKeys = this.geminiKeys.filter(key => key.isValid !== false);
        
        if (validKeys.length <= 1) {
            return; // No point in rotating if there's only one or no keys
        }

        this.currentKeyIndex = (this.currentKeyIndex + 1) % validKeys.length;
        console.log(`Rotated to next API key (index: ${this.currentKeyIndex})`);
    }

    public getKeyStats(): { total: number; valid: number; invalid: number } {
        const valid = this.geminiKeys.filter(key => key.isValid !== false).length;
        const invalid = this.geminiKeys.filter(key => key.isValid === false).length;
        
        return {
            total: this.geminiKeys.length,
            valid,
            invalid
        };
    }

    public async addKey(apiKey: string): Promise<boolean> {
        try {
            // Validate the key first
            const isValid = await this.validateApiKey(apiKey);
            
            if (!isValid) {
                throw new Error("Invalid API key");
            }

            // Store in database
            const newKey = await prisma.aPIKeys.create({
                data: {
                    key: apiKey,
                    type: "GEMINI"
                }
            });

            // Add to local cache
            this.geminiKeys.push({
                id: newKey.id,
                key: newKey.key,
                createdAt: newKey.createdAt,
                updatedAt: newKey.updatedAt,
                isValid: true
            });

            console.log(`Added new API key ${newKey.id}`);
            return true;
        } catch (error) {
            console.error("Failed to add API key:", error);
            return false;
        }
    }

    public async cleanup() {
        await prisma.$disconnect();
    }
}

export default APIKeyManager;
