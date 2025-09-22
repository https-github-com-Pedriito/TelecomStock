import { useState, useEffect } from 'react';

export function MobileDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const info = {
      userAgent: navigator.userAgent,
      isMobile,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      baseUrl: window.location.origin,
      token: !!localStorage.getItem('auth_token'),
      isSecure: window.isSecureContext,
      localStorage: localStorage.length,
      apiBaseUrl: import.meta.env.VITE_API_URL || 'auto-detect'
    };
    setDebugInfo(info);
  }, []);

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full text-xs z-50"
        style={{ fontSize: '10px' }}
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-black text-green-400 p-2 text-xs z-50 max-h-48 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-yellow-400">📱 Mobile Debug</span>
        <button 
          onClick={() => setShowPanel(false)}
          className="text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-1">
        {Object.entries(debugInfo).map(([key, value]) => (
          <div key={key} className="flex">
            <span className="text-cyan-400 w-20 truncate">{key}:</span>
            <span className="text-white ml-2 break-all">{String(value)}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600">
        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            window.location.reload();
          }}
          className="bg-red-600 text-white px-2 py-1 rounded text-xs mr-2"
        >
          Clear Token & Reload
        </button>
        <button
          onClick={() => {
            const httpUrl = window.location.href.replace('https:', 'http:').replace(':5174', ':5173');
            window.location.href = httpUrl;
          }}
          className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
        >
          Try HTTP
        </button>
      </div>
    </div>
  );
}