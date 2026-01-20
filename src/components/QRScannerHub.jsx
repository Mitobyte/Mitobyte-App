import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from './ui/button'
import { Drawer } from './ui/drawer'

const QRScannerHub = ({ isOpen, onClose, onScanSuccess, user }) => {
  const html5QrCodeRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [scannedData, setScannedData] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' for back camera, 'user' for front

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanner()
    }

    return () => {
      if (html5QrCodeRef.current) {
        stopScanner()
      }
    }
  }, [isOpen, facingMode])

  const startScanner = async () => {
    try {
      setError(null)

      // Stop existing scanner if running
      if (html5QrCodeRef.current) {
        await stopScanner()
      }

      const html5QrCode = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          setScannedData(decodedText)
          if (onScanSuccess) {
            onScanSuccess(decodedText)
          }
          // Auto close after 2 seconds
          setTimeout(() => {
            stopScanner()
            onClose()
          }, 2000)
        },
        (errorMessage) => {
          // Silent error - scanning in progress
        }
      )
      setIsScanning(true)
    } catch (err) {
      console.error('Error starting scanner:', err)
      setError('Unable to access camera. Please grant camera permissions.')
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
        setIsScanning(false)
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  const handleFlipCamera = async () => {
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment')
  }

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} title="Check In">
      <div className="p-6 space-y-6">
        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="text-base text-foreground">
            Scan the event QR code to check in
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Welcome, {user.email}
            </p>
          )}
        </div>

        {/* Scanner Container */}
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative aspect-square bg-card rounded-xl overflow-hidden border-2 border-primary/20">
            {/* QR Scanner */}
            <div id="qr-reader" className="w-full h-full"></div>

            {/* Scanning Overlay */}
            {isScanning && !scannedData && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Corner brackets */}
                <div className="absolute top-6 left-6 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-lg"></div>
                <div className="absolute top-6 right-6 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-6 left-6 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-6 right-6 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-lg"></div>

                {/* Scanning line */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                  animate={{
                    top: ['15%', '85%', '15%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            )}

            {/* Success State */}
            {scannedData && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-primary/95"
              >
                <div className="text-center text-primary-foreground">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="text-6xl mb-3"
                  >
                    ✓
                  </motion.div>
                  <p className="text-xl font-bold">Success!</p>
                  <p className="text-sm mt-1">Checking you in...</p>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/90 text-destructive-foreground p-4">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">⚠️ Camera Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Camera Flip Button */}
            {isScanning && !scannedData && !error && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleFlipCamera}
                className="absolute bottom-3 right-3 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors z-10"
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
                  <path d="M3 12h18" />
                  <path d="m16 16 2-2 2 2" />
                  <path d="m6 8-2 2-2-2" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Position the QR code within the frame
          </p>
          <p className="text-xs text-muted-foreground">
            Tap the camera icon to switch cameras
          </p>
        </div>
      </div>
    </Drawer>
  )
}

export default QRScannerHub
