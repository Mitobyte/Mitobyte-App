import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import Z_INDEX from '../lib/z-index';

/**
 * Unified QR Scanner Modal
 * Supports multiple use cases: event check-in, profile scanning, generic QR scanning
 *
 * @param {boolean} isOpen - Whether the scanner modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {function} onScan - Callback when QR code is scanned successfully
 * @param {string} mode - Scan mode: 'event' | 'profile' | 'generic'
 * @param {object} config - Additional configuration options
 */
export default function UnifiedQRScanner({
  isOpen,
  onClose,
  onScan,
  mode = 'generic',
  config = {}
}) {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');

  // Mode-specific configuration
  const modeConfig = {
    event: {
      title: 'Scan Event QR Code',
      description: 'Point your camera at the event check-in QR code',
      icon: '📱',
      validate: (data) => {
        // Validate event check-in code format (EVT-{id}-{code})
        return /^EVT-\d+-[a-z0-9]+$/.test(data);
      }
    },
    profile: {
      title: 'Scan Profile QR Code',
      description: 'Scan another attendee\'s profile to connect',
      icon: '👤',
      validate: (data) => {
        try {
          const parsed = JSON.parse(data);
          return parsed.type === 'profile' && parsed.walletAddress;
        } catch {
          return false;
        }
      }
    },
    generic: {
      title: 'Scan QR Code',
      description: 'Point your camera at any QR code',
      icon: '📷',
      validate: () => true // Accept any QR code
    }
  };

  const currentConfig = { ...modeConfig[mode], ...config };

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [isOpen, facingMode]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanSuccess(false);

      // Stop existing scanner if running
      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode('unified-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Scanner start error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Scanner stop error:', err);
      }
    }
  };

  const handleScanSuccess = async (decodedText) => {
    console.log('🔍 QR Code scanned:', decodedText);

    // Auto-detect QR code type from URL
    const baseUrl = window.location.origin;
    let detectedType = null;
    let parsedData = decodedText;

    // Check if it's one of our app URLs
    if (decodedText.startsWith(baseUrl) || decodedText.startsWith('http')) {
      try {
        const url = new URL(decodedText);
        const path = url.pathname;

        if (path.startsWith('/profile/')) {
          detectedType = 'profile';
          const walletAddress = decodeURIComponent(path.replace('/profile/', ''));
          parsedData = { type: 'profile', walletAddress };
          console.log('✅ Detected profile QR code:', walletAddress);
        } else if (path.includes('/check-in')) {
          detectedType = 'check-in';
          const eventId = path.match(/\/event\/(\d+)/)?.[1];
          parsedData = { type: 'check-in', eventId, url: decodedText };
          console.log('✅ Detected check-in QR code for event:', eventId);
        } else if (path.includes('/feedback')) {
          detectedType = 'feedback';
          const eventId = path.match(/\/event\/(\d+)/)?.[1];
          parsedData = { type: 'feedback', eventId, url: decodedText };
          console.log('✅ Detected feedback QR code for event:', eventId);
        }
      } catch (err) {
        console.error('Error parsing URL:', err);
      }
    }

    // If no type detected and in specific mode, validate
    if (!detectedType && mode !== 'generic') {
      if (!currentConfig.validate(decodedText)) {
        setError(`Invalid ${mode} QR code. Please scan the correct code.`);
        setTimeout(() => setError(null), 3000);
        return;
      }
    }

    // Show success feedback
    setScanSuccess(true);
    await stopScanner();

    // Call onScan callback with detected type
    if (onScan) {
      onScan(parsedData, detectedType || mode);
    }

    // Auto-close after brief success display
    setTimeout(() => {
      setScanSuccess(false);
      onClose();
    }, 1500);
  };

  const handleScanError = (errorMessage) => {
    // Ignore common scanning errors (no QR code in frame)
    if (!errorMessage.includes('NotFoundException')) {
      console.warn('Scan error:', errorMessage);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const handleFlipCamera = async () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{
              zIndex: Z_INDEX.MODAL_BACKDROP,
              pointerEvents: 'auto'
            }}
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 max-h-[90vh] bg-background border-t border-border overflow-y-auto rounded-t-3xl"
            style={{ zIndex: Z_INDEX.QR_SCANNER }}
          >
            {/* Handle bar for swipe gesture indication */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
            </div>

            <Card className="border-0 shadow-none flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">{currentConfig.icon}</span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">{currentConfig.title}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {currentConfig.description}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full shrink-0"
            >
              <span className="text-xl">✕</span>
            </Button>
          </div>

          {/* Scanner Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            {/* QR Reader Container */}
            <div className="w-full max-w-md mb-6">
              <div
                id="unified-qr-reader"
                className="rounded-xl overflow-hidden border-2 border-border shadow-lg"
              />
            </div>

            {/* Status Messages */}
            {error && (
              <Card className="mb-4 border-red-500/50 bg-red-500/10 w-full max-w-md">
                <CardContent className="p-4 text-center">
                  <div className="text-4xl mb-2">❌</div>
                  <p className="text-red-600 dark:text-red-400 font-medium text-sm sm:text-base">
                    {error}
                  </p>
                </CardContent>
              </Card>
            )}

            {scanSuccess && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md"
              >
                <Card className="border-green-500/50 bg-green-500/10">
                  <CardContent className="p-6 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="text-6xl mb-3"
                    >
                      ✓
                    </motion.div>
                    <p className="text-green-600 dark:text-green-400 font-bold text-lg">
                      Scan Successful!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Processing...</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {isScanning && !error && !scanSuccess && (
              <Card className="w-full max-w-md">
                <CardContent className="p-4 text-center">
                  <div className="text-4xl mb-2">📸</div>
                  <p className="font-medium text-sm sm:text-base mb-1">Scanning...</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Position the QR code in the frame
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Camera Controls */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleFlipCamera}
                variant="outline"
                size="sm"
                disabled={!isScanning || scanSuccess}
                className="flex items-center gap-2"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Flip Camera</span>
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <span>❌</span>
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="p-4 border-t border-border bg-muted/30 shrink-0">
            <p className="text-xs sm:text-sm text-center text-muted-foreground">
              {mode === 'event' && '💡 Make sure you have good lighting and hold your device steady'}
              {mode === 'profile' && '💡 Ask the person to show their profile QR code from their Profile tab'}
              {mode === 'generic' && '💡 Scan any QR code for check-in, feedback, or networking'}
            </p>
          </div>
        </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
