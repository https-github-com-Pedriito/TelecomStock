import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Trash2 } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  args: any[];
}

export function MobileDebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const logIdCounter = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercepter console.log, console.warn, console.error
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    
    // Flag pour éviter les boucles infinies
    let isLogging = false;

    const addLog = (type: LogEntry['type'], args: any[]) => {
      // Éviter les boucles infinies lors du logging
      if (isLogging) return;
      isLogging = true;
      
      try {
        const timestamp = new Date().toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit'
        });
        
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');

        setLogs(prev => {
          const newLogs = [...prev, {
            id: logIdCounter.current++,
            timestamp,
            type,
            message,
            args
          }];
          // Limiter à 50 logs pour meilleures performances
          if (newLogs.length > 50) {
            return newLogs.slice(-50);
          }
          return newLogs;
        });
      } finally {
        isLogging = false;
      }
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog('error', args);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      addLog('info', args);
    };

    // Capturer les erreurs non gérées
    const handleError = (event: ErrorEvent) => {
      addLog('error', [`Uncaught Error: ${event.message}`, `at ${event.filename}:${event.lineno}:${event.colno}`]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', [`Unhandled Promise Rejection:`, event.reason]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Log initial
    addLog('info', ['🔧 Mobile Debug Console activée']);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll vers le bas uniquement quand de nouveaux logs arrivent
    if (!isMinimized && logs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [logs.length, isMinimized]);

  const clearLogs = () => {
    setLogs([]);
    console.info('🗑️ Logs effacés');
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed z-[9999] transition-all duration-300 ${
        isMinimized 
          ? 'bottom-4 right-4 w-16 h-16' 
          : 'bottom-0 left-0 right-0 h-80 sm:bottom-4 sm:right-4 sm:left-auto sm:w-96'
      }`}
      style={{ 
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
    >
      <div className={`bg-gray-900 text-white rounded-lg shadow-2xl h-full flex flex-col ${isMinimized ? 'items-center justify-center' : ''}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b border-gray-700 ${isMinimized ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">🔧 Debug Console</span>
            <span className="text-xs text-gray-400">({logs.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearLogs}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="Effacer les logs"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="Réduire"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Bouton minimisé */}
        {isMinimized && (
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Ouvrir la console"
          >
            <Maximize2 size={24} className="text-blue-400" />
          </button>
        )}

        {/* Logs */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Aucun log pour le moment
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border-l-2 ${
                    log.type === 'error' ? 'border-red-500 bg-red-900/20' :
                    log.type === 'warn' ? 'border-orange-500 bg-orange-900/20' :
                    log.type === 'info' ? 'border-blue-500 bg-blue-900/20' :
                    'border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-400 text-[10px] mb-0.5">
                        {log.timestamp}
                      </div>
                      <div className="break-words whitespace-pre-wrap">
                        {log.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Footer avec infos système */}
        {!isMinimized && (
          <div className="border-t border-gray-700 p-2 text-[10px] text-gray-400 space-y-1">
            <div>📱 {navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || 'Unknown Device'}</div>
            <div>🌐 {window.location.protocol}//{window.location.host}</div>
            <div>🔗 API: {localStorage.getItem('api_url') || 'Non configurée'}</div>
          </div>
        )}
      </div>

      {/* Bouton pour réafficher si fermé */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-4 left-4 z-[9999] bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Afficher la console de débogage"
        >
          🔧
        </button>
      )}
    </div>
  );
}
