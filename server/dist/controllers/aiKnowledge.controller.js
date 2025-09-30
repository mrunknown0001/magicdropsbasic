"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeKnowledgeContext = exports.exportTrainingData = exports.updateAIEffectiveness = exports.getAIAnalytics = exports.searchKnowledgeWithEmbeddings = exports.generateArticleEmbeddings = void 0;
const supabase_1 = require("../lib/supabase");
const openai_service_1 = require("../services/openai.service");
/**
 * Generate embeddings for a specific article
 */
const generateArticleEmbeddings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { articleId } = req.params;
        // Get article content
        const { data: article, error: articleError } = await supabase_1.supabase
            .from('knowledge_base_articles')
            .select('title, content, summary')
            .eq('id', articleId)
            .single();
        if (articleError || !article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        // Combine title, summary, and content for embedding
        const textToEmbed = `${article.title}\n\n${article.summary || ''}\n\n${article.content}`;
        // Generate embedding
        const embedding = await openai_service_1.OpenAIService.generateEmbedding(textToEmbed);
        // Store embedding in database
        const { error: embeddingError } = await supabase_1.supabase
            .from('knowledge_embeddings')
            .upsert({
            article_id: articleId,
            content_chunk: textToEmbed,
            embedding: embedding,
            chunk_index: 0,
            token_count: Math.ceil(textToEmbed.length / 4) // Rough token estimate
        });
        if (embeddingError) {
            console.error('Error storing embedding:', embeddingError);
            return res.status(500).json({ error: 'Failed to store embedding' });
        }
        res.json({
            success: true,
            message: 'Embeddings generated successfully',
            embeddingSize: embedding.length
        });
    }
    catch (error) {
        console.error('Error generating embeddings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.generateArticleEmbeddings = generateArticleEmbeddings;
/**
 * Semantic search using embeddings (authenticated)
 */
const searchKnowledgeWithEmbeddings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { query, limit = 5, threshold = 0.75 } = req.body; // Increased threshold
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        // Generate embedding for search query
        const queryEmbedding = await openai_service_1.OpenAIService.generateEmbedding(query);
        // For now, use similarity search by comparing embeddings
        // Get all articles with embeddings
        const { data: articlesWithEmbeddings, error: embeddingError } = await supabase_1.supabase
            .from('knowledge_embeddings')
            .select(`
        *,
        knowledge_base_articles!inner (
          *,
          knowledge_base_categories!inner (name, color, icon)
        )
      `)
            .not('embedding', 'is', null);
        if (embeddingError || !articlesWithEmbeddings || articlesWithEmbeddings.length === 0) {
            console.error('No embeddings found, falling back to text search:', embeddingError);
            // Only fall back to text search for meaningful queries (at least 3 characters)
            if (query.trim().length < 3) {
                return res.json({
                    success: true,
                    results: [],
                    searchType: 'query_too_short',
                    message: 'Suchbegriff zu kurz - mindestens 3 Zeichen erforderlich'
                });
            }
            // Stricter text search - only exact word matches
            const { data: fallbackResults } = await supabase_1.supabase
                .from('knowledge_base_articles')
                .select(`
          *,
          knowledge_base_categories!inner (name, color, icon)
        `)
                .eq('is_published', true)
                .eq('ai_training_enabled', true)
                .or(`title.ilike.%${query}%,content.ilike.% ${query} %,summary.ilike.%${query}%`) // Added spaces for word boundaries
                .order('context_priority', { ascending: false })
                .limit(limit);
            // Filter out results that don't have meaningful matches
            const filteredResults = (fallbackResults || []).filter(article => {
                const searchLower = query.toLowerCase();
                const titleMatch = article.title.toLowerCase().includes(searchLower);
                const summaryMatch = article.summary?.toLowerCase().includes(searchLower);
                const contentMatch = article.content.toLowerCase().includes(searchLower);
                // Only return if there's a meaningful match
                return titleMatch || summaryMatch || contentMatch;
            });
            return res.json({
                success: true,
                results: filteredResults,
                searchType: 'text_fallback'
            });
        }
        // Calculate cosine similarity for each article
        const similarities = articlesWithEmbeddings.map(item => {
            try {
                // Convert JSONB embedding to number array
                let articleEmbedding;
                if (typeof item.embedding === 'string') {
                    articleEmbedding = JSON.parse(item.embedding);
                }
                else if (Array.isArray(item.embedding)) {
                    articleEmbedding = item.embedding;
                }
                else {
                    console.warn(`Invalid embedding format for article ${item.knowledge_base_articles.title}`);
                    return {
                        ...item.knowledge_base_articles,
                        similarity_score: 0
                    };
                }
                // Validate embeddings
                if (!Array.isArray(articleEmbedding) || articleEmbedding.length !== queryEmbedding.length) {
                    console.warn(`Invalid embedding dimensions for article ${item.knowledge_base_articles.title}: ${articleEmbedding.length} vs ${queryEmbedding.length}`);
                    return {
                        ...item.knowledge_base_articles,
                        similarity_score: 0
                    };
                }
                const similarity = cosineSimilarity(queryEmbedding, articleEmbedding);
                // Validate similarity score (cosine similarity should be between -1 and 1, but we expect 0-1 for meaningful matches)
                if (isNaN(similarity) || similarity < -1 || similarity > 1) {
                    console.warn(`Invalid similarity score for article ${item.knowledge_base_articles.title}: ${similarity}`);
                    return {
                        ...item.knowledge_base_articles,
                        similarity_score: 0
                    };
                }
                // Convert negative similarities to 0 (opposite meanings)
                const normalizedSimilarity = Math.max(0, similarity);
                return {
                    ...item.knowledge_base_articles,
                    similarity_score: normalizedSimilarity
                };
            }
            catch (error) {
                console.error(`Error processing embedding for article ${item.knowledge_base_articles.title}:`, error);
                return {
                    ...item.knowledge_base_articles,
                    similarity_score: 0
                };
            }
        });
        // Filter by threshold and sort by similarity
        const results = similarities
            .filter(item => item.similarity_score >= threshold)
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit);
        console.log(`🔍 Semantic search for "${query}":`, similarities.map(s => ({
            title: s.title,
            score: s.similarity_score?.toFixed(3)
        })));
        console.log(`📊 Results after filtering (threshold ${threshold}):`, results.length);
        // If no good semantic matches, don't fall back to text search for random strings
        if (results.length === 0) {
            return res.json({
                success: true,
                results: [],
                searchType: 'semantic_no_matches',
                message: 'Keine relevanten Artikel gefunden'
            });
        }
        res.json({
            success: true,
            results: results || [],
            searchType: 'semantic'
        });
    }
    catch (error) {
        console.error('Error in semantic search:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};
exports.searchKnowledgeWithEmbeddings = searchKnowledgeWithEmbeddings;
/**
 * Get AI knowledge usage analytics
 */
const getAIAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { timeframe = '7d' } = req.query;
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (timeframe) {
            case '24h':
                startDate.setHours(now.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }
        // Get knowledge usage metrics
        const { data: usageMetrics, error: usageError } = await supabase_1.supabase
            .from('ai_knowledge_metrics')
            .select(`
        *,
        knowledge_base_articles!inner (title, category_id),
        chat_conversations!inner (created_at)
      `)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });
        if (usageError) {
            console.error('Error fetching usage metrics:', usageError);
            return res.status(500).json({ error: 'Failed to fetch usage metrics' });
        }
        // Get AI performance logs
        const { data: performanceLogs, error: performanceError } = await supabase_1.supabase
            .from('ai_performance_logs')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(100);
        if (performanceError) {
            console.error('Error fetching performance logs:', performanceError);
        }
        // Calculate analytics
        const analytics = {
            totalUsage: usageMetrics?.length || 0,
            averageRelevanceScore: usageMetrics?.length > 0
                ? (usageMetrics.reduce((sum, m) => sum + m.relevance_score, 0) / usageMetrics.length).toFixed(2)
                : '0.00',
            topArticles: getTopArticles(usageMetrics || []),
            usageByType: getUsageByType(usageMetrics || []),
            performanceMetrics: calculatePerformanceMetrics(performanceLogs || [])
        };
        res.json({
            success: true,
            analytics,
            timeframe
        });
    }
    catch (error) {
        console.error('Error getting AI analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAIAnalytics = getAIAnalytics;
/**
 * Update article AI effectiveness score
 */
const updateAIEffectiveness = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { articleId } = req.params;
        const { effectivenessScore } = req.body;
        if (typeof effectivenessScore !== 'number' || effectivenessScore < 0 || effectivenessScore > 10) {
            return res.status(400).json({ error: 'Effectiveness score must be between 0 and 10' });
        }
        const { error } = await supabase_1.supabase
            .from('knowledge_base_articles')
            .update({
            ai_effectiveness_score: effectivenessScore,
            updated_at: new Date().toISOString()
        })
            .eq('id', articleId);
        if (error) {
            console.error('Error updating effectiveness score:', error);
            return res.status(500).json({ error: 'Failed to update effectiveness score' });
        }
        res.json({
            success: true,
            message: 'Effectiveness score updated'
        });
    }
    catch (error) {
        console.error('Error updating effectiveness:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateAIEffectiveness = updateAIEffectiveness;
/**
 * Export AI training data
 */
const exportTrainingData = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get all AI-enabled articles with training data
        const { data: articles, error } = await supabase_1.supabase
            .from('knowledge_base_articles')
            .select(`
        id,
        title,
        content,
        summary,
        context_priority,
        ai_effectiveness_score,
        conversation_examples,
        response_template,
        knowledge_base_categories!inner (name)
      `)
            .eq('ai_training_enabled', true)
            .eq('is_published', true)
            .order('context_priority', { ascending: false });
        if (error) {
            console.error('Error fetching training data:', error);
            return res.status(500).json({ error: 'Failed to fetch training data' });
        }
        // Format for AI training
        const trainingData = {
            exported_at: new Date().toISOString(),
            total_articles: articles?.length || 0,
            articles: articles?.map(article => ({
                id: article.id,
                title: article.title,
                category: article.knowledge_base_categories?.name || 'Uncategorized',
                priority: article.context_priority,
                effectiveness: article.ai_effectiveness_score,
                content: article.content,
                summary: article.summary,
                response_template: article.response_template,
                conversation_examples: article.conversation_examples
            })) || []
        };
        res.json({
            success: true,
            data: trainingData
        });
    }
    catch (error) {
        console.error('Error exporting training data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.exportTrainingData = exportTrainingData;
/**
 * Optimize knowledge context for AI
 */
const optimizeKnowledgeContext = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // This is a placeholder for context optimization logic
        // In a real implementation, this would analyze usage patterns and optimize article priorities
        res.json({
            success: true,
            message: 'Context optimization completed',
            optimizations: {
                articles_analyzed: 0,
                priority_adjustments: 0,
                effectiveness_updates: 0
            }
        });
    }
    catch (error) {
        console.error('Error optimizing context:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.optimizeKnowledgeContext = optimizeKnowledgeContext;
// Helper functions
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (normA * normB);
}
function getTopArticles(metrics) {
    const articleUsage = metrics.reduce((acc, metric) => {
        const articleId = metric.knowledge_base_articles.id;
        if (!acc[articleId]) {
            acc[articleId] = {
                article: metric.knowledge_base_articles,
                usage_count: 0,
                total_relevance: 0
            };
        }
        acc[articleId].usage_count++;
        acc[articleId].total_relevance += metric.relevance_score;
        return acc;
    }, {});
    return Object.values(articleUsage)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
}
function getUsageByType(metrics) {
    return metrics.reduce((acc, metric) => {
        acc[metric.usage_type] = (acc[metric.usage_type] || 0) + 1;
        return acc;
    }, {});
}
function calculatePerformanceMetrics(logs) {
    if (logs.length === 0) {
        return {
            average_response_time: 0,
            average_satisfaction: 0,
            total_conversations: 0
        };
    }
    const totalResponseTime = logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0);
    const satisfactionLogs = logs.filter(log => log.user_satisfaction);
    const totalSatisfaction = satisfactionLogs.reduce((sum, log) => sum + log.user_satisfaction, 0);
    return {
        average_response_time: Math.round(totalResponseTime / logs.length),
        average_satisfaction: satisfactionLogs.length > 0
            ? (totalSatisfaction / satisfactionLogs.length).toFixed(2)
            : '0.00',
        total_conversations: logs.length
    };
}
