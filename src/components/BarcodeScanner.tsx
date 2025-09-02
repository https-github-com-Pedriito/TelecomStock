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
  const [torchSupported, setTorchSupported] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string>('');
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');

      if (!('BarcodeDetector' in window)) {
        setError("Le scan n'est pas supporté sur ce navigateur. Utilisez la saisie manuelle.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setTorchSupported(Boolean(capabilities.torch));
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();

        detectorRef.current = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8'] });
        setIsScanning(true);
        scanFrame();
      }
    } catch (error) {
      console.error("Erreur d'accès à la caméra:", error);
      setError("Impossible d'accéder à la caméra. Utilisez la saisie manuelle.");
    }
  };

  const scanFrame = async () => {
    if (!detectorRef.current || !videoRef.current) return;

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        onScan(barcodes[0].rawValue);
        stopCamera();
        return;
      }
    } catch (err) {
      console.error('Erreur de scan:', err);
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  };

  const stopCamera = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (detectorRef.current) {
      detectorRef.current = null;
    }

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
      } else {
        setTorchSupported(false);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <h2 className="text-lg font-semibold">Scanner code-barres</h2>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <button
              onClick={toggleFlash}
              disabled={!torchSupported}
              className={`p-2 rounded-lg bg-gray-800 transition-colors ${
                torchSupported ? 'hover:bg-gray-700' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {flashOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
            </button>
            {!torchSupported && (
              <span className="text-xs text-red-400 mt-1">
                Flash non supporté
              </span>
            )}
          </div>
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
              className="w-full h-full object-cover"
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
              <p className="text-lg">Pointez vers un code-barres</p>
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