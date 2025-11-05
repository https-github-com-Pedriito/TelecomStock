import React,{ useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Keyboard, Flashlight, RotateCcw, CheckCircle } from "lucide-react";


interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const detectedRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');

  useEffect(() => {
    if (scanMode === 'camera') {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scanMode]);

  // Auto-focus input when in manual mode
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (scanMode === 'manual') {
      inputRef.current?.focus();
    }
  }, [scanMode]);

  const startScanner = async () => {
    setCameraError('');
    try {
      // Allow new detections when (re)starting the scanner
      detectedRef.current = false;
      scannerRef.current = new Html5Qrcode("reader");

      const qrCodeSuccessCallback = (decodedText: string) => {
        if (detectedRef.current) return; // already handled one detection
        detectedRef.current = true;
        console.log("📸 Code détecté:", decodedText);
        
        setLastScanned(decodedText);
        setScanSuccess(true);
        
        // Vibration feedback pour mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
        
        // Audio feedback
        try {
          const audio = new Audio();
          audio.play().catch(() => {}); // Simple beep
        } catch (audioErr) {
          // Ignore audio errors
        }
        
        setTimeout(() => {
          onScan(decodedText);
          if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
              setIsScanning(false);
            }).catch(err => {
              console.error("❌ Erreur lors de l'arrêt du scanner:", err);
            });
          }
        }, 500); // Délai pour voir le feedback
      };

      await scannerRef.current.start(
        { facingMode: "environment" }, 
        {
          fps: 30,
          qrbox: { width: 300, height: 300 }, // Zone plus grande pour mobile
          disableFlip: true,
          aspectRatio: 1.0
        },
        qrCodeSuccessCallback,
        () => {
          // ignorer erreurs de décodage
        }
      );

      setIsScanning(true);
      console.log("✅ Scanner démarré");
    } catch (err: any) {
      console.error("❌ Erreur démarrage html5-qrcode:", err);
      setCameraError(err.message || 'Impossible d\'accéder à la caméra');
      setScanMode('manual'); // Fallback vers manuel
    }
  };

  const stopScanner = async () => {
    // mark as detected to avoid any callbacks triggering onScan after we stop
    detectedRef.current = true;
    if (!scannerRef.current) return;

    try {
      // 1. Arrêter le scan s'il est actif
      try {
        if (isScanning && (scannerRef.current as any).isScanning) {
          await scannerRef.current.stop();
        }
      } catch (stopErr) {
        console.warn(`⚠️ Erreur lors de l'arrêt (stop) du scanner — continuer le nettoyage:`, stopErr);
      }

      // 2. Nettoyer l'instance du scanner
      try {
        await scannerRef.current.clear();
      } catch (clearErr: any) {
        const isNotFound = clearErr && (clearErr.name === 'NotFoundError' || (clearErr.message && clearErr.message.includes('removeChild')));
        if (isNotFound) {
          console.warn(`⚠️ Ignored NotFoundError during scanner.clear():`, clearErr?.message || clearErr);
        } else {
          throw clearErr;
        }
      }

      // 3. S'assurer que tous les flux médias sont arrêtés
      try {
        const videoElem = document.querySelector("#reader video") as HTMLVideoElement;
        if (videoElem?.srcObject) {
          const stream = videoElem.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoElem.srcObject = null;
        }
      } catch (mediaErr) {
        console.warn("⚠️ Erreur lors de la libération du flux média:", mediaErr);
      }

      // 4. Nettoyer les références
      try {
        scannerRef.current = null;
        setIsScanning(false);
        console.log('✅ Scanner nettoyé et arrêté');
      } catch (refErr) {
        console.warn(`⚠️ Erreur lors du nettoyage des références du scanner:`, refErr);
      }
    } catch (err) {
      console.error(`❌ Erreur lors de l'arrêt du scanner:`, err);
      try {
        scannerRef.current = null;
        setIsScanning(false);
      } catch (forceErr) {
        console.warn(`⚠️ Erreur lors du nettoyage forcé du scanner:`, forceErr);
      }
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current && isScanning) {
      try {
        const capabilities = await (scannerRef.current as any).getCapabilities();
        if (capabilities.torch) {
          await (scannerRef.current as any).applyVideoConstraints({
            advanced: [{ torch: !torch }]
          });
          setTorch(!torch);
        }
      } catch (err) {
        console.warn("Torch non disponible:", err);
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || detectedRef.current) return;
    
    detectedRef.current = true;
    console.log('⌨️ Code manuel soumis:', manualCode);
    
    setLastScanned(manualCode);
    setScanSuccess(true);
    
    setTimeout(() => {
      onScan(manualCode);
    }, 300);
  };

  const restartScanner = () => {
    setScanSuccess(false);
    setLastScanned('');
    setCameraError('');
    if (scanMode === 'camera') {
      startScanner();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header Mobile-Optimized */}
      <div className="bg-gray-900 p-4 safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Camera className="h-6 w-6 text-white" />
            <h2 className="text-lg font-semibold text-white">Scanner</h2>
          </div>
          
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Mode Selector - Large Touch Targets */}
        <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setScanMode('camera')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all active:scale-95 ${
              scanMode === 'camera'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Camera className="h-5 w-5 mr-2" />
            <span className="font-medium">Caméra</span>
          </button>
          
          <button
            onClick={() => setScanMode('manual')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all active:scale-95 ${
              scanMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Keyboard className="h-5 w-5 mr-2" />
            <span className="font-medium">Manuel</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {scanMode === 'camera' ? (
          <>
            {/* Camera Controls */}
            {isScanning && (
              <div className="bg-gray-900 p-4 flex justify-center space-x-4">
                <button
                  onClick={toggleTorch}
                  className={`p-3 rounded-full transition-all active:scale-95 ${
                    torch
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  <Flashlight className="h-5 w-5" />
                </button>
                
                <button
                  onClick={restartScanner}
                  className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all active:scale-95"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Camera Error */}
            {cameraError && (
              <div className="bg-red-900 border border-red-700 m-4 p-4 rounded-lg">
                <div className="flex items-center">
                  <X className="h-5 w-5 text-red-400 mr-2" />
                  <div>
                    <p className="text-red-100 font-medium">Erreur de caméra</p>
                    <p className="text-red-200 text-sm">{cameraError}</p>
                    <button
                      onClick={() => setScanMode('manual')}
                      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Utiliser la saisie manuelle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Success Feedback */}
            {scanSuccess && (
              <div className="absolute inset-0 bg-green-600 bg-opacity-90 flex items-center justify-center z-10">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Code scanné !</h3>
                  <p className="text-green-100 font-mono text-lg">{lastScanned}</p>
                </div>
              </div>
            )}

            {/* Camera View */}
            <div className="flex-1 relative">
              <div id="reader" className="w-full h-full" />
              
              {/* Scanning Overlay */}
              {isScanning && !scanSuccess && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Scanning Frame */}
                    <div className="w-72 h-72 border-4 border-white border-opacity-30 rounded-lg relative">
                      {/* Corner indicators */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg"></div>
                      
                      {/* Scanning line animation */}
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="scanning-line"></div>
                      </div>
                    </div>
                    
                    {/* Instructions */}
                    <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                      <p className="text-white text-sm font-medium">
                        Centrez le code-barres dans le cadre
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Tips */}
            <div className="bg-gray-900 p-4 safe-area-bottom">
              <div className="text-center">
                <p className="text-gray-300 text-sm mb-2">
                  Conseils : Approchez-vous du code-barres et assurez-vous qu'il soit bien éclairé
                </p>
                <button
                  onClick={() => setScanMode('manual')}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Problème avec la caméra ? Utilisez la saisie manuelle
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Manual Mode */
          <div className="flex-1 flex flex-col justify-center p-6 bg-gray-900">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-8">
                <Keyboard className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Saisie Manuelle
                </h3>
                <p className="text-gray-300">
                  Tapez ou collez le code-barres ci-dessous
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Code-barres
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Saisissez le code-barres..."
                    className="w-full px-4 py-4 text-lg border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg transition-all active:scale-98"
                >
                  Valider le Code
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setScanMode('camera')}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Retour à la caméra
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for scanning animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .scanning-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
          animation: scan 2s ease-in-out infinite;
        }
        
        @keyframes scan {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(280px); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }
        
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        `
      }} />
    </div>
  );
}
