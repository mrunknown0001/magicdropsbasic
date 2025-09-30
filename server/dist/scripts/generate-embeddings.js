"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbeddingsForAllArticles = generateEmbeddingsForAllArticles;
const supabase_1 = require("../lib/supabase");
const openai_service_1 = require("../services/openai.service");
async function generateEmbeddingsForAllArticles() {
    try {
        console.log('🚀 Starting embeddings generation for all articles...');
        // Get all AI-enabled articles
        const { data: articles, error } = await supabase_1.supabase
            .from('knowledge_base_articles')
            .select('id, title, summary, content')
            .eq('ai_training_enabled', true)
            .eq('is_published', true);
        if (error || !articles) {
            throw new Error(`Failed to fetch articles: ${error?.message}`);
        }
        console.log(`📚 Found ${articles.length} articles to process`);
        for (const article of articles) {
            console.log(`\n🔄 Processing: "${article.title}"`);
            // Combine title, summary, and content for embedding
            const textToEmbed = [
                article.title,
                article.summary || '',
                article.content
            ].filter(Boolean).join('\n\n');
            try {
                // Generate embedding
                console.log('   ⚡ Generating embedding...');
                const embedding = await openai_service_1.OpenAIService.generateEmbedding(textToEmbed);
                // Store embedding in database
                const { error: embeddingError } = await supabase_1.supabase
                    .from('knowledge_embeddings')
                    .upsert({
                    article_id: article.id,
                    content_chunk: textToEmbed,
                    embedding: embedding,
                    chunk_index: 0,
                    token_count: Math.ceil(textToEmbed.length / 4) // Rough token estimate
                });
                if (embeddingError) {
                    console.error(`   ❌ Error storing embedding for "${article.title}":`, embeddingError);
                }
                else {
                    console.log(`   ✅ Embedding generated and stored (${embedding.length} dimensions)`);
                }
            }
            catch (articleError) {
                console.error(`   ❌ Error processing "${article.title}":`, articleError);
            }
        }
        console.log('\n🎉 Embeddings generation completed!');
        // Verify embeddings were created
        const { data: embeddingCount } = await supabase_1.supabase
            .from('knowledge_embeddings')
            .select('id', { count: 'exact' });
        console.log(`📊 Total embeddings in database: ${embeddingCount?.length || 0}`);
    }
    catch (error) {
        console.error('❌ Fatal error:', error);
    }
}
// Run the script if called directly
if (require.main === module) {
    generateEmbeddingsForAllArticles()
        .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}
