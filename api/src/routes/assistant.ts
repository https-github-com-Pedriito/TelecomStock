import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { StockAssistant } from '../services/stock-assistant';

const router = Router();

// Initialize the assistant
let assistant: StockAssistant | null = null;

function getAssistant(): StockAssistant {
  if (!assistant) {
    assistant = new StockAssistant();
  }
  return assistant;
}

/**
 * POST /api/assistant/chat
 * Send a question to the AI assistant
 */
router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Question is required and must be a string'
      });
    }

    console.log(`⏱️  [AI REQUEST] Question: "${question}"`);
    
    const dataFetchStart = Date.now();
    const stockAssistant = getAssistant();
    const answer = await stockAssistant.askQuestion(question);
    const totalTime = Date.now() - startTime;
    const aiTime = Date.now() - dataFetchStart;
    
    console.log(`✅ [AI RESPONSE] Total: ${totalTime}ms | AI Processing: ${aiTime}ms`);
    console.log(`📝 [AI ANSWER] Length: ${answer.length} chars | Preview: "${answer.substring(0, 100)}..."`);

    res.json({
      success: true,
      data: {
        question,
        answer,
        timestamp: new Date().toISOString(),
        performance: {
          totalMs: totalTime,
          aiProcessingMs: aiTime
        }
      }
    });
  } catch (error) {
    console.error('Error in /assistant/chat:', error);
    
    // Handle missing API key gracefully
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        success: false,
        message: 'Le service d\'assistant IA n\'est pas configuré. Veuillez contacter l\'administrateur.'
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors du traitement de la question'
    });
  }
});

/**
 * POST /api/assistant/stream
 * Stream a response from the AI assistant (Server-Sent Events)
 */
router.post('/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Question is required and must be a string'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stockAssistant = getAssistant();

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: 'start', timestamp: new Date().toISOString() })}\n\n`);

    // Stream the response
    for await (const chunk of stockAssistant.streamQuestion(question)) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done', timestamp: new Date().toISOString() })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in /assistant/stream:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du streaming';
    res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/assistant/health
 * Check if the AI assistant is properly configured (public endpoint)
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const provider = process.env.AI_PROVIDER || 'openai';
    let configured = false;
    let message = '';

    if (provider === 'ollama') {
      const ollamaHost = process.env.OLLAMA_HOST || 'http://ollama:11434';
      const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
      
      // Test connection to Ollama
      try {
        const http = require('http');
        const url = new URL(`${ollamaHost}/api/tags`);
        
        await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: url.hostname,
            port: url.port || 11434,
            path: url.pathname,
            timeout: 3000
          }, (res: any) => {
            if (res.statusCode === 200) {
              configured = true;
              message = `Assistant IA configuré avec Ollama (modèle: ${ollamaModel})`;
              resolve(true);
            } else {
              message = 'Ollama est inaccessible';
              reject(new Error(message));
            }
          });
          req.on('error', () => {
            message = `Impossible de se connecter à Ollama sur ${ollamaHost}`;
            reject(new Error(message));
          });
          req.on('timeout', () => {
            req.destroy();
            message = 'Timeout lors de la connexion à Ollama';
            reject(new Error(message));
          });
        });
      } catch (error) {
        configured = false;
        message = `Ollama non disponible: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      }
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      configured = !!apiKey;
      message = apiKey 
        ? 'Assistant IA configuré avec OpenAI' 
        : 'Clé API OpenAI manquante';
    }
    
    res.json({
      success: true,
      data: {
        configured,
        provider,
        message
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de la configuration'
    });
  }
});

export default router;
