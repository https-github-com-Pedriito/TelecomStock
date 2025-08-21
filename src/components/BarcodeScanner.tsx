import React, { useRef, useEffect, useState } from 'react';
import { ScanLine, X, Flashlight, FlashlightOff, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Erreur d\'accès à la caméra:', error);
      setError('Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashOn } as any]
          });
          setFlashOn(!flashOn);
        } catch (error) {
          console.error('Erreur flash:', error);
        }
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  // Simulation de détection de code-barres (dans une vraie app, utilisez une librairie comme QuaggaJS)
  const handleVideoClick = () => {
    // Simuler un scan avec un code-barres existant pour la démo
    const demoBarcodes = [
      'TEL17358901234567890123',
      'TEL17358901234567890124', 
      'TEL17358901234567890125'
    ];
    const randomBarcode = demoBarcodes[Math.floor(Math.random() * demoBarcodes.length)];
    onScan(randomBarcode);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <h2 className="text-lg font-semibold">Scanner code-barres</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFlash}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            {flashOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center mb-4">{error}</p>
            <p className="text-sm text-gray-300 text-center">
              Utilisez la saisie manuelle ci-dessous pour continuer
            </p>
          </div>
        ) : isScanning ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover cursor-crosshair"
              onClick={handleVideoClick}
            />
            
            {/* Scanner Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="w-64 h-40 border-2 border-white rounded-lg opacity-75">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-20 left-0 right-0 text-center text-white px-4">
              <p className="text-lg mb-2">Pointez vers un code-barres</p>
              <p className="text-sm opacity-75">Appuyez sur l'écran pour simuler un scan (démo)</p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <p>Chargement de la caméra...</p>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="bg-gray-900 p-4">
        <p className="text-white text-sm mb-2">Saisie manuelle :</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Saisissez le code-barres"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  );
}