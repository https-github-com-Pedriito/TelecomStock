'use client';

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Keyboard, Flashlight, RotateCcw, CheckCircle, ScanLine } from "lucide-react";


interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const detectedRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');

  useEffect(() => {
    isMounted.current = true;
    if (scanMode === 'camera') {
      startScanner();
    }
    return () => {
      isMounted.current = false;
      stopScanner();
    };
  }, [scanMode]);

  // Auto-focus input when in manual mode
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (scanMode === 'manual') {
      detectedRef.current = false; // Réinitialiser pour permettre la saisie manuelle
      inputRef.current?.focus();
    }
  }, [scanMode]);

  const startScanner = async () => {
    setCameraError('');
    try {
      // SÉCURITÉ : Arrêter toute instance précédente avant de commencer
      if (scannerRef.current) {
        await stopScanner();
      }

      // Allow new detections when (re)starting the scanner
      detectedRef.current = false;
      scannerRef.current = new Html5Qrcode("reader");

      const qrCodeSuccessCallback = (decodedText: string) => {
        if (detectedRef.current) return;
        detectedRef.current = true;

        setLastScanned(decodedText);
        setScanSuccess(true);

        // Vibration feedback pour mobile
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        // Audio feedback (Beep synthétisé)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

          oscillator.start();
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
          oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) { }

        setTimeout(async () => {
          // IMPORTANT: Stop the scanner BEFORE triggering onScan to release camera promptly
          await stopScanner();
          onScan(decodedText);
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

      // CAPTURE DU FLUX MEDIA (Crucial pour Mac)
      const videoElem = document.querySelector("#reader video") as HTMLVideoElement;
      if (videoElem && videoElem.srcObject instanceof MediaStream) {
        streamRef.current = videoElem.srcObject;
        console.log("📹 Flux média capturé");
      }

      setIsScanning(true);
      console.log("✅ Scanner démarré");
    } catch (err: any) {
      console.error("❌ Erreur démarrage:", err);
      setCameraError(err.message || 'Impossible d\'accéder à la caméra');
      setScanMode('manual'); // Fallback vers manuel
    }
  };

  // NETTOYAGE SYNCHRONE (Crucial pour MacOS/Safari)
  const stopTracksSync = () => {
    console.log("�️ Nettoyage synchrone des tracks...");

    // 1. Arrêt via streamRef
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // 2. Recherche sauvage de tous les éléments vidéo
    const videos = document.getElementsByTagName('video');
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      v.pause();
      if (v.srcObject instanceof MediaStream) {
        v.srcObject.getTracks().forEach(t => {
          t.stop();
          t.enabled = false;
        });
        v.srcObject = null;
      }
    }
  };

  const stopScanner = async () => {
    console.log("🛑 Arrêt du scanner...");
    detectedRef.current = true;

    // Étape 1 : Libération immédiate et synchrone du matériel
    stopTracksSync();

    // Étape 2 : Nettoyage de la librairie (asynchrone)
    if (scannerRef.current) {
      try {
        const state = (scannerRef.current as any).getState?.() || (scannerRef.current as any).state;
        if (state === 2 || (scannerRef.current as any).isScanning === true) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("⚠️ scanner.stop/clear a échoué (normal si déjà disposé)", err);
      }
      scannerRef.current = null;
    }

    // Étape 3 : Nettoyage final du DOM
    const reader = document.getElementById('reader');
    if (reader) reader.innerHTML = '';

    if (isMounted.current) {
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current && isScanning) {
      try {
        // Obtenir la caméra rendue depuis le scanner
        const cameras = await (scannerRef.current as any).getRunningTrackCameraCapabilities();

        if (!cameras) {
          console.warn("❌ Impossible d'obtenir les capacités de la caméra");
          return;
        }

        // Utiliser la nouvelle API CameraCapabilities
        const cameraCapabilities = cameras.getCapabilities();
        const torchFeature = cameraCapabilities.torchFeature();

        if (torchFeature.isSupported()) {
          // Appliquer la nouvelle valeur de torch
          await torchFeature.apply(!torch);
          setTorch(!torch);
          console.log(`✅ Lampe torche ${!torch ? 'activée' : 'désactivée'}`);
        } else {
          console.warn("⚠️ Lampe torche non supportée par cette caméra");
        }
      } catch (err) {
        console.warn("❌ Erreur lors du toggle de la lampe torche:", err);

        // Fallback vers l'ancienne méthode si la nouvelle API échoue
        try {
          const videoElement = document.querySelector("#reader video") as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];

            if (track) {
              const capabilities = track.getCapabilities();

              if ('torch' in capabilities) {
                await track.applyConstraints({
                  // @ts-ignore - torch n'est pas dans les types TypeScript standard
                  advanced: [{ torch: !torch }]
                });
                setTorch(!torch);
                console.log(`✅ Lampe torche ${!torch ? 'activée' : 'désactivée'} (fallback)`);
              } else {
                console.warn("⚠️ Lampe torche non disponible sur cet appareil");
              }
            }
          }
        } catch (fallbackErr) {
          console.error("❌ Fallback échoué:", fallbackErr);
        }
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
    detectedRef.current = false; // Réinitialiser pour permettre une nouvelle détection
    if (scanMode === 'camera') {
      startScanner();
    }
  };

  return (
    <div className="fixed top-[40px] left-0 right-0 bottom-0 md:top-20 bg-gray-950 z-40 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header - Glassmorphic HUD */}
      <div className="relative z-20 p-3 pt-2 md:pt-4 bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/20">
              <ScanLine size={18} strokeWidth={3} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-widest uppercase">Optic <span className="text-blue-500">Scanner</span></h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                <p className="text-blue-100/60 text-[9px] font-black tracking-widest uppercase">{cameraError ? 'System Error' : 'Ready'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              await stopScanner();
              onClose();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all active:scale-90 group"
          >
            <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Mode Selector - Premium Segmented Control */}
        <div className="max-w-md mx-auto mt-4 p-1 bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 flex gap-1">
          <button
            onClick={() => setScanMode('camera')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all active:scale-95 ${scanMode === 'camera'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-black scale-[1.02]'
              : 'text-gray-400 hover:text-white font-bold'
              }`}
          >
            <Camera size={16} strokeWidth={2.5} />
            <span className="text-[10px] uppercase tracking-widest">Caméra</span>
          </button>

          <button
            onClick={() => setScanMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all active:scale-95 ${scanMode === 'manual'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-black scale-[1.02]'
              : 'text-gray-400 hover:text-white font-bold'
              }`}
          >
            <Keyboard size={16} strokeWidth={2.5} />
            <span className="text-[10px] uppercase tracking-widest">Clavier</span>
          </button>
        </div>
      </div>

      {/* Main Scanner Body */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-3 pb-24 overflow-hidden">
        {scanMode === 'camera' ? (
          <div className="w-full h-full max-w-lg flex flex-col items-center justify-center gap-4">
            {/* Viewfinder Area */}
            <div className="relative w-full max-w-[280px] aspect-square rounded-2xl border-2 border-white/10 shadow-2xl">
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gray-900">
              <div id="reader" className="w-full h-full" />

              {/* HUD Overlays */}
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                {/* Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-gray-950/60" />

                {/* Viewfinder Corners */}
                <div className="relative w-48 h-48">
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-3 border-t-3 border-blue-500 rounded-tl-2xl shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-3 border-t-3 border-blue-500 rounded-tr-2xl shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-3 border-b-3 border-blue-500 rounded-bl-2xl shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-3 border-b-3 border-blue-500 rounded-br-2xl shadow-[0_0_10px_rgba(59,130,246,0.5)]" />

                  {/* Animated Laser */}
                  {isScanning && !scanSuccess && (
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-scan-hud" />
                    </div>
                  )}
                </div>

                {/* Instructions Text */}
                <div className="absolute bottom-6 left-0 right-0 text-center animate-bounce-subtle">
                  <p className="text-white font-black text-[9px] uppercase tracking-[0.2em] opacity-80 drop-shadow-lg">
                    {scanSuccess ? 'Détecté' : 'Centrez le code'}
                  </p>
                </div>
              </div>

              {/* Success Overlay Card */}
              {scanSuccess && (
                <div className="absolute inset-0 z-30 bg-blue-600/90 backdrop-blur-md flex items-center justify-center animate-in zoom-in-95 duration-300">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-white/30 animate-pulse">
                      <CheckCircle className="h-10 w-10 text-blue-600" strokeWidth={3} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Scanné !</h3>
                    <p className="text-blue-100 font-mono text-sm bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 select-all">{lastScanned}</p>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Quick Actions HUD */}
            <div className="rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 p-2 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10">
              <button
                onClick={toggleTorch}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${torch
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                  }`}
              >
                <Flashlight size={20} strokeWidth={2.5} />
              </button>

              <div className="w-[1px] h-6 bg-white/10" />

              <button
                onClick={restartScanner}
                className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white border border-white/5 transition-all active:scale-90"
              >
                <RotateCcw size={20} strokeWidth={2.5} />
              </button>
            </div>
            </div>
          </div>
        ) : (
          /* Manual Mode Redesign */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-md w-full rounded-2xl shadow-2xl">
            <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-2xl border border-white/10">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <Keyboard className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-black text-white mb-1.5 uppercase tracking-tight">Saisie Manuelle</h3>
                <p className="text-gray-400 text-sm font-medium">Tapez ou collez le code</p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Code-barres..."
                    className="w-full px-4 py-3 text-base border-2 border-white/5 rounded-xl bg-gray-950/80 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center tracking-wider font-mono"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualCode.trim() || detectedRef.current}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <CheckCircle size={18} strokeWidth={3} />
                  <span>Valider</span>
                </button>
              </form>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Error Alert */}
      {cameraError && (
        <div className="absolute bottom-32 left-4 right-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom duration-500">
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
              <X size={18} strokeWidth={3} />
            </div>
            <div className="flex-1">
              <p className="text-red-500 font-black text-[10px] uppercase tracking-wide">Erreur Caméra</p>
              <p className="text-red-100/70 text-xs font-medium leading-tight">{cameraError}</p>
            </div>
            <button
              onClick={() => setScanMode('manual')}
              className="px-3 py-2 bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wide hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap"
            >
              Manuel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan-hud {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan-hud {
          animation: scan-hud 2.5s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
