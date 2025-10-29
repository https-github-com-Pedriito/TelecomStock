import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StockChatAssistantProps {
  onClose?: () => void;
}

export const StockChatAssistant: React.FC<StockChatAssistantProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: '👋 Bonjour ! Je suis votre assistant intelligent pour la gestion du stock.\n\nJe peux vous aider à :\n📦 Consulter l\'état actuel du stock\n⚠️ Identifier les articles en alerte\n📊 Analyser les mouvements récents\n🏢 Obtenir des informations sur les fournisseurs\n📈 Fournir des statistiques globales\n\nPosez-moi une question !',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if assistant is configured on mount
  useEffect(() => {
    console.log('[StockChatAssistant] Component mounted, checking health...');
    checkAssistantHealth();
  }, []);

  const checkAssistantHealth = async () => {
    try {
      console.log('[StockChatAssistant] Calling /assistant/health...');
      const response: any = await api.get('/assistant/health');
      console.log('[StockChatAssistant] Health check response:', response);
      
      // L'API retourne { success: true, data: { configured: true, provider: 'ollama', ... } }
      if (response.data?.configured) {
        console.log('[StockChatAssistant] Assistant configured:', response.data.provider);
        setAssistantStatus('ready');
      } else {
        console.log('[StockChatAssistant] Assistant not configured');
        setAssistantStatus('error');
        addAssistantMessage(
          '⚠️ L\'assistant IA n\'est pas encore configuré. Veuillez contacter l\'administrateur.'
        );
      }
    } catch (error) {
      console.error('[StockChatAssistant] Health check error:', error);
      setAssistantStatus('error');
      addAssistantMessage(
        '❌ Impossible de vérifier la configuration de l\'assistant. Le service pourrait être indisponible.'
      );
    }
  };

  const addAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || assistantStatus !== 'ready') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const requestStart = performance.now();
    console.log(`⏱️  [Chat] Envoi de la question: "${userMessage.content}"`);

    try {
      const response: any = await api.post('/assistant/chat', {
        question: userMessage.content
      });

      const requestEnd = performance.now();
      const totalTime = Math.round(requestEnd - requestStart);

      console.log('[DEBUG] response:', response);
      console.log('[DEBUG] response.data:', response.data);
      console.log('[DEBUG] response.data.success:', response.data.success);
      
      // Check if response.data has the structure {question, answer, timestamp, performance}
      if (response.data && response.data.answer) {
        // Direct structure without success wrapper
        console.log('[DEBUG] Using direct data structure');
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.data.answer + `\n\n⚡ Réponse en ${(totalTime / 1000).toFixed(1)}s`,
          timestamp: new Date(response.data.timestamp)
        };
        console.log('[DEBUG] Assistant message:', assistantMessage);
        setMessages(prev => [...prev, assistantMessage]);
        console.log('[DEBUG] Message added to state');
      } else if (response.data && response.data.success && response.data.data) {
        // Nested structure with success wrapper
        console.log('[DEBUG] Using nested data structure');
        const perfData = response.data.data.performance;
        console.log(`✅ [Chat] Réponse reçue en ${totalTime}ms`);
        if (perfData) {
          console.log(`   📊 Backend Total: ${perfData.totalMs}ms | IA: ${perfData.aiProcessingMs}ms`);
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.data.data.answer + `\n\n⚡ Réponse en ${(totalTime / 1000).toFixed(1)}s`,
          timestamp: new Date(response.data.data.timestamp)
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.log('[DEBUG] Response not successful, showing error');
        addAssistantMessage('❌ Désolé, je n\'ai pas pu traiter votre question. Veuillez réessayer.');
      }
    } catch (error) {
      const requestEnd = performance.now();
      const totalTime = Math.round(requestEnd - requestStart);
      console.error(`❌ [Chat] Erreur après ${totalTime}ms:`, error);
      
      addAssistantMessage(
        '❌ Une erreur s\'est produite lors de la communication avec l\'assistant. Veuillez vérifier votre connexion et réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Quels articles sont en alerte de stock ?",
    "Quel est l'état global du stock ?",
    "Quels sont les derniers mouvements ?",
    "Liste des fournisseurs actifs",
    "Combien d'articles sont en stock ?"
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6" />
          <div>
            <h2 className="font-semibold text-lg">Assistant IA Stock</h2>
            <p className="text-xs text-blue-100">
              {assistantStatus === 'checking' && 'Vérification...'}
              {assistantStatus === 'ready' && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  En ligne
                </span>
              )}
              {assistantStatus === 'error' && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Non configuré
                </span>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded p-2 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {message.type === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && assistantStatus === 'ready' && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Questions suggérées :</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              assistantStatus === 'ready'
                ? "Posez une question sur le stock..."
                : "Assistant non disponible..."
            }
            disabled={isLoading || assistantStatus !== 'ready'}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || assistantStatus !== 'ready'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
