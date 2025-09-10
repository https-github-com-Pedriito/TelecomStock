import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const detectedRef = useRef(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    const startScanner = async () => {
      try {
  // Allow new detections when (re)starting the scanner
  detectedRef.current = false;
  scannerRef.current = new Html5Qrcode("reader");

        await scannerRef.current.start(
          { facingMode: "environment" }, 
          {
            fps: 30,
            qrbox: { width: 800, height: 250 },
            disableFlip: true,
            aspectRatio: 1.777777778

          },
          (decodedText) => {
            if (detectedRef.current) return; // already handled one detection
            detectedRef.current = true;
            console.log("📸 Code détecté:", decodedText);
            onScan(decodedText);
            // Arrêter le scanner après la détection
            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                setIsScanning(false);
              }).catch(err => {
                console.error("❌ Erreur lors de l'arrêt du scanner:", err);
              });
            }
          },
          () => {
            // ignorer erreurs de décodage
          }
        );

        setIsScanning(true);
        console.log("✅ Scanner démarré");
      } catch (err) {
        console.error("❌ Erreur démarrage html5-qrcode:", err);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

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
        // html5-qrcode may try to remove nodes that have already been removed by the DOM,
        // leading to a NotFoundError. This is non-fatal for our cleanup — log a warning and continue.
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
      // Forcer le nettoyage même en cas d'erreur
      try {
        scannerRef.current = null;
        setIsScanning(false);
      } catch (forceErr) {
  console.warn(`⚠️ Erreur lors du nettoyage forcé du scanner:`, forceErr);
      }
    }
  };

  // autofocus input when component mounts
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <h2 className="text-lg font-semibold">Scanner code-barres</h2>
        <div className="flex items-center gap-3">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!manualCode || detectedRef.current) return;
              detectedRef.current = true;
              console.log('⌨️ Code manuel soumis:', manualCode);
              onScan(manualCode);
              try { await stopScanner(); } catch (err) { /* ignore */ }
            }}
            className="w-full flex flex-col sm:flex-row items-center gap-2"
          >
            <input
              type="text"
              placeholder="Saisir code-barres"
              value={manualCode}
              ref={inputRef}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-black"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Entrer
            </button>
          </form>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Zone de scan */}
      <div className="p-3 bg-black text-white text-sm">Vous pouvez aussi saisir le code manuellement (desktop) ou utiliser l'input ci-dessus.</div>
      <div id="reader" className="flex-1" />
    </div>
  );
}
