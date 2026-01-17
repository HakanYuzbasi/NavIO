/**
 * QR Code Scanner Component
 * Uses browser camera API to scan QR codes
 */

import React, { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setScanning(true);

        // Start scanning loop
        scanIntervalRef.current = setInterval(scanQRCode, 500);
      }
    } catch (err) {
      const errorMessage = 'Failed to access camera. Please grant camera permissions.';
      onError?.(errorMessage);
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR library to decode QR code
    const code = detectQRCode(imageData);

    if (code) {
      setScanning(false);
      stopCamera();
      onScan(code);
    }
  };

  // Simple QR code detection
  // In production, use a library like jsQR or @zxing/library
  const detectQRCode = (imageData: ImageData): string | null => {
    // This is a placeholder. In production, use a proper QR library
    // For MVP, we'll rely on manual input as fallback

    // If you want full QR scanning, install jsQR:
    // npm install jsqr
    // import jsQR from 'jsqr';
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // return code?.data || null;

    return null; // Placeholder
  };

  return (
    <div className="qr-scanner">
      <div className="scanner-overlay">
        <div className="scanner-header">
          <h2>Scan QR Code</h2>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="scanner-video"
          />
          <canvas ref={canvasRef} className="scanner-canvas" hidden />

          <div className="scanner-frame">
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>
          </div>
        </div>

        <div className="scanner-instructions">
          <p>Position the QR code within the frame</p>
        </div>
      </div>

      <style jsx>{`
        .qr-scanner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scanner-overlay {
          width: 100%;
          max-width: 500px;
          padding: 20px;
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .scanner-header h2 {
          color: white;
          margin: 0;
          font-size: 24px;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 32px;
          cursor: pointer;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
        }

        .scanner-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .scanner-frame {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70%;
          height: 70%;
          pointer-events: none;
        }

        .corner {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid #00ff00;
        }

        .corner.top-left {
          top: 0;
          left: 0;
          border-right: none;
          border-bottom: none;
        }

        .corner.top-right {
          top: 0;
          right: 0;
          border-left: none;
          border-bottom: none;
        }

        .corner.bottom-left {
          bottom: 0;
          left: 0;
          border-right: none;
          border-top: none;
        }

        .corner.bottom-right {
          bottom: 0;
          right: 0;
          border-left: none;
          border-top: none;
        }

        .scanner-instructions {
          text-align: center;
          margin-top: 20px;
        }

        .scanner-instructions p {
          color: white;
          margin: 0;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
