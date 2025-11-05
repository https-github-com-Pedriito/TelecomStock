import { OpenAI } from 'openai';
import { Ollama } from 'ollama';
import { AIDataSource } from '../ai-data-source';
import { Article } from '../entities/Article';
import { Mouvement } from '../entities/Mouvement';
import { Fournisseur } from '../entities/Fournisseur';
import { Localisation } from '../entities/Localisation';

type AIProvider = 'openai' | 'ollama';

export class StockAssistant {
  private openai?: OpenAI;
  private ollama?: Ollama;
  private provider: AIProvider;
  private ollamaModel: string;

  constructor() {
    // Determine AI provider from environment
    this.provider = (process.env.AI_PROVIDER as AIProvider) || 'ollama';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required when using OpenAI provider');
      }
      this.openai = new OpenAI({ apiKey });
    } else {
      // Configure Ollama client
      const ollamaHost = process.env.OLLAMA_HOST || 'http://ollama:11434';
      this.ollama = new Ollama({ host: ollamaHost });
    }
  }

  /**
   * Query the database to gather relevant stock information
   * Uses READ-ONLY connection (ai_assistant user) - No INSERT/UPDATE/DELETE allowed
   */
  private async gatherStockContext(question: string): Promise<string> {
    const articleRepo = AIDataSource.getRepository(Article);
    const mouvementRepo = AIDataSource.getRepository(Mouvement);
    const fournisseurRepo = AIDataSource.getRepository(Fournisseur);
    const localisationRepo = AIDataSource.getRepository(Localisation);

    let context = '=== DONNÉES DISPONIBLES ===\n\n';

    try {
      // Detect what type of question is being asked
      const questionLower = question.toLowerCase();
      const isFournisseurQuestion = questionLower.includes('fournisseur') || 
                                     questionLower.includes('fournisseurs') ||
                                     questionLower.includes('supplier');
      const isLocalisationQuestion = questionLower.includes('localisation') || 
                                      questionLower.includes('localisations') ||
                                      questionLower.includes('emplacement');
      const isMovementQuestion = questionLower.includes('mouvement') || 
                                  questionLower.includes('mouvements') ||
                                  questionLower.includes('historique');

      // Always fetch articles (essential data)
      const articles = await articleRepo.find({
        take: 15,
        order: { quantite_stock: 'ASC' }
      });

      context += `📦 ARTICLES (top ${articles.length}):\n`;
      articles.forEach(article => {
        context += `- ${article.nom}: ${article.quantite_stock} unités`;
        if (article.quantite_stock <= article.seuil_minimum) {
          context += ` ⚠️ ALERTÉ`;
        }
        context += '\n';
      });

      // Fetch FOURNISSEURS if question is about suppliers
      if (isFournisseurQuestion) {
        const fournisseurs = await fournisseurRepo.find({
          order: { nom: 'ASC' }
        });

        context += `\n🏭 FOURNISSEURS (${fournisseurs.length}):\n`;
        fournisseurs.forEach(f => {
          context += `- ${f.nom}`;
          if (f.contact) context += ` | Contact: ${f.contact}`;
          if (f.telephone) context += ` | Tel: ${f.telephone}`;
          if (f.email) context += ` | Email: ${f.email}`;
          if (f.adresse) context += ` | Adresse: ${f.adresse}`;
          context += '\n';
        });
      }

      // Fetch LOCALISATIONS if question is about locations
      if (isLocalisationQuestion) {
        const localisations = await localisationRepo.find({
          order: { nom: 'ASC' }
        });

        context += `\n📍 LOCALISATIONS (${localisations.length}):\n`;
        localisations.forEach(loc => {
          context += `- ${loc.nom}`;
          if (loc.description) context += ` (${loc.description})`;
          context += '\n';
        });
      }

      // Fetch movements for movement/history questions
      if (isMovementQuestion || !isFournisseurQuestion) {
        const recentMovements = await mouvementRepo.find({
          relations: ['article'],
          order: { dateHeure: 'DESC' },
          take: 10
        });

        context += `\n📊 MOUVEMENTS RÉCENT (${recentMovements.length}):\n`;
        recentMovements.forEach(mvt => {
          const date = new Date(mvt.dateHeure).toLocaleDateString('fr-FR');
          context += `- ${date}: ${mvt.type} ${mvt.quantite}x`;
          if (mvt.article) context += ` ${mvt.article.nom}`;
          context += '\n';
        });
      }

      // Quick statistics
      const lowStockArticles = articles.filter(a => a.quantite_stock <= a.seuil_minimum).length;

      context += `\n📈 STATS:\n`;
      context += `- Articles en alerte: ${lowStockArticles}\n`;

    } catch (error) {
      context += `\n⚠️ Erreur lors de la récupération des données: ${error}\n`;
    }

    return context;
  }

  /**
   * Process a user question and return an AI-generated answer
   */
  async askQuestion(question: string): Promise<string> {
    try {
      // Gather current stock context
      const stockContext = await this.gatherStockContext(question);

      // Build the system prompt - ULTRA SIMPLE for local models
      const systemPrompt = `Tu es un assistant de gestion de stock. Réponds en français, court et précis.`;

      const userPrompt = `${stockContext}

Question: ${question}

Réponds directement avec les chiffres et faits du contexte ci-dessus.`;

      // Call AI provider
      if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });
        return completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
      } else if (this.provider === 'ollama' && this.ollama) {
        // Use Ollama local model with optimized parameters for speed
        const response = await this.ollama.chat({
          model: this.ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          options: {
            temperature: 0.3,      // Lower = more deterministic & faster
            num_predict: 512,      // Allow longer responses (was 300)
            num_ctx: 2048,         // Smaller context window = faster (default 4096)
            top_k: 20,             // Limit token selection for speed
            top_p: 0.9,            // Nucleus sampling
            repeat_penalty: 1.1    // Avoid repetition
          }
        });
        return response.message.content || 'Désolé, je n\'ai pas pu générer une réponse.';
      }

      throw new Error('No AI provider configured');

    } catch (error) {
      console.error('Error in StockAssistant:', error);
      if (error instanceof Error) {
        throw new Error(`Erreur de l'assistant IA: ${error.message}`);
      }
      throw new Error('Erreur inconnue lors du traitement de la question');
    }
  }

  /**
   * Stream a response (for future real-time streaming UI)
   */
  async *streamQuestion(question: string): AsyncGenerator<string> {
    try {
      const stockContext = await this.gatherStockContext(question);

      const systemPrompt = `Tu es un assistant de gestion de stock. Réponds en français, court et précis.`;

      const userPrompt = `${stockContext}\n\nQuestion: ${question}\n\nRéponds directement.`;

      if (this.provider === 'openai' && this.openai) {
        const stream = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      } else if (this.provider === 'ollama' && this.ollama) {
        // Ollama optimized for speed
        const response = await this.ollama.chat({
          model: this.ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          options: {
            temperature: 0.3,
            num_predict: 512,
            num_ctx: 2048,
            top_k: 20,
            top_p: 0.9
          }
        });
        yield response.message.content || 'Erreur lors de la génération.';
      } else {
        yield 'Aucun provider IA configuré.';
      }
    } catch (error) {
      console.error('Error in streaming:', error);
      yield 'Erreur lors du streaming de la réponse.';
    }
  }
}
