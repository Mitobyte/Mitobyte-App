import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import QRCode from 'qrcode';
import Z_INDEX from '../lib/z-index';

export default function ProfileQRCode({ walletAddress, profile, showInline = false, open = false, onOpenChange }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const canvasRef = useRef(null);

  // Support external control of modal
  useEffect(() => {
    if (open !== undefined) {
      setShowModal(open);
    }
  }, [open]);

  useEffect(() => {
    generateQRCode();
  }, [walletAddress, profile]);

  const generateQRCode = async () => {
    if (!walletAddress) return;

    // Generate URL to user's profile using the /profile/ route
    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/profile/${encodeURIComponent(walletAddress)}`;

    console.log('📱 Generating QR code for URL:', profileUrl);

    try {
      const dataUrl = await QRCode.toDataURL(profileUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeUrl(dataUrl);
      console.log('✅ QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleShare = () => {
    if (onOpenChange) {
      onOpenChange(true);
    } else {
      setShowModal(true);
    }
  };

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setShowModal(false);
    }
  };

  if (showInline) {
    return (
      <div className="flex flex-col items-center">
        {qrCodeUrl && (
          <img
            src={qrCodeUrl}
            alt="Profile QR Code"
            className="w-full max-w-xs rounded-lg border-2 border-border"
          />
        )}
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Others can scan this code to view your profile
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
            />

            {/* Drawer - Slides up from bottom */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 right-0 bottom-0 max-h-[90vh] bg-background border-t border-border overflow-y-auto rounded-t-3xl"
              style={{ zIndex: Z_INDEX.MODAL }}
            >
              {/* Handle bar for swipe gesture indication */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold">My Profile QR Code</h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* QR Code Display */}
                <div className="flex flex-col items-center bg-white dark:bg-gray-100 p-6 rounded-xl">
                  {qrCodeUrl ? (
                    <>
                      <img
                        src={qrCodeUrl}
                        alt="Profile QR Code"
                        className="w-full max-w-xs"
                      />
                      <div className="mt-4 text-center">
                        <p className="font-medium text-gray-900 mb-1">
                          {profile?.display_name || profile?.name || 'Anonymous'}
                        </p>
                        {profile?.role && (
                          <p className="text-sm text-gray-600">
                            {profile.role}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span>📲</span>
                    <span>How to use</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Show this QR code to other attendees</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>They can scan it to view your profile instantly</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Works with any QR code scanner app!</span>
                    </li>
                  </ul>
                </div>

                {/* Profile Tags Preview */}
                {profile?.tags && profile.tags.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="font-medium mb-2 text-sm">Your Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <Button
                  onClick={handleClose}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
