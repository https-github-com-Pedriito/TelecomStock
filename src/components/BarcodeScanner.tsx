import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode("reader");

        await scannerRef.current.start(
          { facingMode: "environment" }, // caméra arrière
          {
            fps: 30,
            qrbox: { width: 800, height: 250 },
            disableFlip: true,
            aspectRatio: 1.777777778

          },
          (decodedText) => {
            console.log("📸 Code détecté:", decodedText);
            onScan(decodedText);
            stopScanner();
          },
          (err) => {
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
    try {
      if (scannerRef.current) {
        if (isScanning && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
          console.log("✅ Scanner stoppé");
        } else {
          console.log("ℹ️ Scanner pas actif, rien à stopper");
        }

        await scannerRef.current.clear();
        console.log("✅ Zone libérée");

        // 🔥 Extra : couper manuellement les flux restants
        const videoElem = document.querySelector("#reader video") as HTMLVideoElement;
        if (videoElem && videoElem.srcObject) {
          const stream = videoElem.srcObject as MediaStream;
          stream.getTracks().forEach((t) => t.stop());
          videoElem.srcObject = null;
          console.log("✅ Flux média libéré manuellement");
        }

        scannerRef.current = null;
        setIsScanning(false);
      }
    } catch (err) {
      console.warn("⚠️ Erreur stopScanner:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <h2 className="text-lg font-semibold">Scanner code-barres</h2>
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

      {/* Zone de scan */}
      <div id="reader" className="flex-1" />
    </div>
  );
}
