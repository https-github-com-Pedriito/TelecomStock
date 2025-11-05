import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';


interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export function BarcodeGenerator({ 
  value, 
  size = 128, 
  margin = 4,
  errorCorrectionLevel = 'M'
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: margin,
          errorCorrectionLevel: errorCorrectionLevel,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('Erreur génération QR code:', error);
      }
    }
  }, [value, size, margin, errorCorrectionLevel]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="max-w-full border border-gray-200 rounded" />
      {value && (
        <p className="text-xs text-gray-500 text-center break-all max-w-[200px]">
          {value}
        </p>
      )}
    </div>
  );
}