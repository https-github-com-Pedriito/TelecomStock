import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export function BarcodeGenerator({ 
  value, 
  width = 2, 
  height = 50, 
  displayValue = true 
}: BarcodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize: 12,
          textMargin: 5,
        });
      } catch (error) {
        console.error('Erreur génération code-barres:', error);
      }
    }
  }, [value, width, height, displayValue]);

  return <canvas ref={canvasRef} className="max-w-full" />;
}