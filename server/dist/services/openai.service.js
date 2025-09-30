"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIService {
    static getInstance() {
        if (!this.instance) {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OPENAI_API_KEY environment variable is required');
            }
            this.instance = new openai_1.default({
                apiKey: apiKey
            });
        }
        return this.instance;
    }
    /**
     * Create chat completion with streaming support
     */
    static async createChatCompletion(messages, options = {}) {
        const openai = this.getInstance();
        const { model = 'gpt-4', temperature = 0.7, maxTokens = 1500, stream = false } = options;
        try {
            const completion = await openai.chat.completions.create({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });
            return completion;
        }
        catch (error) {
            console.error('OpenAI API Error:', error);
            throw new Error(`OpenAI API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate embeddings for text (for RAG)
     */
    static async generateEmbedding(text) {
        const openai = this.getInstance();
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text.trim(),
                encoding_format: 'float'
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('OpenAI Embedding Error:', error);
            throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate multiple embeddings for batch processing
     */
    static async generateEmbeddings(texts) {
        const openai = this.getInstance();
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: texts.map(text => text.trim()),
                encoding_format: 'float'
            });
            return response.data.map(item => item.embedding);
        }
        catch (error) {
            console.error('OpenAI Batch Embedding Error:', error);
            throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if API key is valid
     */
    static async validateApiKey() {
        try {
            const openai = this.getInstance();
            await openai.models.list();
            return true;
        }
        catch (error) {
            console.error('OpenAI API Key Validation Failed:', error);
            return false;
        }
    }
    /**
     * Get available models
     */
    static async getAvailableModels() {
        try {
            const openai = this.getInstance();
            const models = await openai.models.list();
            return models.data
                .filter(model => model.id.includes('gpt'))
                .map(model => model.id)
                .sort();
        }
        catch (error) {
            console.error('Error fetching OpenAI models:', error);
            return ['gpt-4', 'gpt-3.5-turbo']; // Fallback to known models
        }
    }
}
exports.OpenAIService = OpenAIService;
