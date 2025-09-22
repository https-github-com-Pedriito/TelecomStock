import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, Copy, ChevronDown, ChevronUp, Wifi } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: Date;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
}

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const logIdRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sauvegarder les méthodes console originales
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Fonction pour ajouter un log
    const addLog = (type: LogEntry['type'], args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      const newLog: LogEntry = {
        id: logIdRef.current++,
        timestamp: new Date(),
        type,
        message,
        stack: type === 'error' && args[0] instanceof Error ? args[0].stack : undefined
      };

      setLogs(prev => [...prev.slice(-99), newLog]); // Garder seulement les 100 derniers logs
    };

    // Intercepter les méthodes console
    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    // Intercepter les erreurs globales
    const handleError = (event: ErrorEvent) => {
      addLog('error', [event.error?.message || event.message, event.error?.stack]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', ['Unhandled Promise Rejection:', event.reason]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Message de bienvenue
    console.info('[DebugConsole] Console de débogage activée - Vous pouvez maintenant voir tous les logs !');

    // Nettoyage
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Auto-scroll vers le bas quand de nouveaux logs arrivent
  useEffect(() => {
    if (logsEndRef.current && isOpen && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, isMinimized]);

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logsText = logs.map(log => 
      `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logsText).then(() => {
      alert('Logs copiés dans le presse-papiers !');
    }).catch(() => {
      alert('Erreur lors de la copie');
    });
  };

  const testApiConnectivity = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Ordre des tests selon la plateforme
    const testEndpoints = isMobile ? [
      'http://192.168.1.53:3080/test',    // Mobile : HTTP en premier
      'http://192.168.1.53:3080/',        
      'http://192.168.1.53:3080/articles',
      'https://192.168.1.53:3443/test',   // Puis HTTPS si HTTP fonctionne
      'https://192.168.1.53:3443/',       
    ] : [
      'https://192.168.1.53:3443/test',   // Desktop : HTTPS en premier
      'https://192.168.1.53:3443/',       
      'https://192.168.1.53:3443/articles',
      'http://192.168.1.53:3080/test',    // Puis HTTP en fallback
      'http://192.168.1.53:3080/',        
    ];

    console.log(`🚀 Tests de connectivité API (${isMobile ? 'Mobile' : 'Desktop'})...`);

    for (const endpoint of testEndpoints) {
      try {
        console.log(`🔗 Test: ${endpoint}`);
        const startTime = Date.now();
        
        const response = await fetch(endpoint, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const duration = Date.now() - startTime;
        console.log(`✅ ${endpoint} - Status: ${response.status} (${duration}ms)`);
        
        if (response.ok) {
          try {
            const data = await response.text();
            console.log(`📦 Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
          } catch (parseError) {
            console.log(`📦 Response reçue mais non parsable`);
          }
        }
      } catch (error: any) {
        console.error(`❌ ${endpoint} - Erreur: ${error.message}`);
      }
    }
    
    console.log('🏁 Tests terminés');
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-orange-600 bg-orange-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        aria-label="Ouvrir la console de débogage"
      >
        <Terminal size={24} />
        {logs.filter(log => log.type === 'error').length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {logs.filter(log => log.type === 'error').length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl w-80 max-w-[90vw]">
      {/* En-tête */}
      <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <Terminal size={18} />
          <span className="font-medium text-sm">Console Debug</span>
          <span className="text-xs text-gray-500">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={testApiConnectivity}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Tester la connectivité API"
          >
            <Wifi size={16} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label={isMinimized ? "Agrandir" : "Réduire"}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={copyLogs}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Copier les logs"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Vider la console"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Contenu des logs */}
      {!isMinimized && (
        <div className="h-60 overflow-y-auto p-2 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aucun log pour le moment...
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border-l-4 ${getLogColor(log.type)} border-l-current`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        {log.message}
                      </div>
                      {log.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-600">
                            Stack trace
                          </summary>
                          <pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Statistiques en bas */}
      {!isMinimized && (
        <div className="p-2 bg-gray-50 rounded-b-lg border-t text-xs text-gray-600">
          <div className="flex justify-between">
            <span>
              Erreurs: {logs.filter(log => log.type === 'error').length}
            </span>
            <span>
              Warnings: {logs.filter(log => log.type === 'warn').length}
            </span>
            <span>
              Total: {logs.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugConsole;
