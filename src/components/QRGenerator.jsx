import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const QRGenerator = ({ data, size = 200 }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (data && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, data, { 
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [data, size]);

  return <canvas ref={canvasRef} />;
};

export default QRGenerator;