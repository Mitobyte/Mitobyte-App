import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent } from './ui/card';

export default function QRScanner({ onScanComplete, mode = 'checkin' }) {
  const scannerRef = useRef(null);
  const [scanError, setScanError] = useState(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    // Initialize scanner
    if (!scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText) {
      // Stop scanning
      scanner.clear();
      setScanning(false);

      try {
        // Try to parse as JSON (for profile mode)
        const data = JSON.parse(decodedText);

        if (mode === 'profile') {
          // Validate profile data
          if (data.type === 'profile' && data.walletAddress) {
            onScanComplete({
              walletAddress: data.walletAddress,
              profile: {
                displayName: data.displayName,
                bio: data.bio,
                school: data.school,
                tags: data.tags,
                company: data.company,
                role: data.role,
                email: data.email
              }
            });
          } else {
            setScanError('Invalid profile QR code');
            setTimeout(() => {
              scanner.render(onScanSuccess, onScanFailure);
              setScanning(true);
              setScanError(null);
            }, 2000);
          }
        } else if (mode === 'checkin') {
          // For check-in mode, pass the decoded data
          onScanComplete({ checkInCode: decodedText, rawData: data });
        }
      } catch (error) {
        // Not JSON - treat as plain text (e.g., check-in code)
        if (mode === 'checkin') {
          onScanComplete({ checkInCode: decodedText });
        } else {
          setScanError('Invalid QR code format');
          setTimeout(() => {
            scanner.render(onScanSuccess, onScanFailure);
            setScanning(true);
            setScanError(null);
          }, 2000);
        }
      }
    }

    function onScanFailure(error) {
      // Don't show errors for common scanning issues
      if (error && !error.includes('NotFoundException')) {
        console.warn('QR scan error:', error);
      }
    }

    // Cleanup
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [mode, onScanComplete]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div ref={scannerRef}>
        <div id="qr-reader" className="rounded-xl overflow-hidden border-2 border-border"></div>
      </div>

      {scanError && (
        <Card className="mt-4 border-red-500/50 bg-red-500/10">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-red-600 dark:text-red-400 font-medium">{scanError}</p>
            <p className="text-sm text-muted-foreground mt-1">Retrying...</p>
          </CardContent>
        </Card>
      )}

      {scanning && !scanError && (
        <Card className="mt-4">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">📸</div>
            <p className="font-medium mb-1">
              {mode === 'profile' ? 'Scan Profile QR Code' : 'Scan Check-In QR Code'}
            </p>
            <p className="text-sm text-muted-foreground">
              {mode === 'profile'
                ? 'Point your camera at someone\'s profile QR code'
                : 'Point your camera at the event QR code to check in'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
